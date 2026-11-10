# Links into Orkestrator

What opens the app from outside, and what the app copies for others to open.
The https forms are served by kontrol, a deployment's front door
(`frontend_url` in lok's `/.well-known/fakts`, e.g. `https://go.arkitekt.live`).
It walks whoever opens one through signing in, joining the organization and
installing the app, then hands over an `orkestrator://` link.

## 1. What arrives

Main turns `orkestrator://<host><path>?<query>` into the router path
`/<host><path>?<query>` and opens it as a tab (`src/main/modules/deepLinkPath.ts`
→ `tabs:open`). Nothing is decoded on the way, and a `#fragment` is dropped.
It refuses another scheme and anything over 4096 characters (`parseDeepLink`),
and drops the same link handed over twice within 1.5 s (`createDeepLinkDedupe`:
some launchers fire a click twice).

| Link | Sent by | Lands on |
|---|---|---|
| `orkestrator://<service>/auth/callback?<query>` | the auth relay | `RelayCallbackRedirect` → `/auth/callback/<service>` (`core/authflow/AUTH_FLOWS.md`) |
| `orkestrator://smart/<org>/<hub>/<identifier>/<id>` | a smartlink | `SmartLinkPage` (`/smart/*`) |
| `orkestrator://do/v<n>/<intent>?<params>` | an intent link (README badge) | `IntentPage` (`/do/*`), §3a |
| `orkestrator://<path…>?<query>` | a deeplink | that route of the app |

`smart`, `auth`, `open` and `do` (with `new`, `settings`, `blok`) are the host's
first path segments: a module can never register one as its namespace
(`RESERVED_NAMESPACES`, `core/modules/host/host.ts`).

## 2. Smartlinks

A smartlink names an object the way every service does, `identifier` + `id`,
inside an organization (`<org>`, its slug) and a hub (`<hub>`, lok's id).

- **Parsing** (`smartLink.ts`): split the path on `/` first, then
  percent-decode each segment. `@mikro/image` travels as one segment
  (`%40mikro%2Fimage`); decoding before splitting would break it. An
  identifier written with literal slashes is read too.
- **Where it opens** (`SmartLinkPage.tsx`):
  - the active login is in `<org>` (and on `<hub>`, when it knows its hub):
    straight to the object's page (`structureTabTarget`), query kept;
  - another login on this device is: "Open in X?", and only then a switch;
  - none is: an offer to sign in, with the hub as a hint to the sign-in page.
  After a switch or a sign-in the link is looked at again from the start.
- **What it proves:** nothing. Kontrol only forwards members of the link's
  organization, and does not check that the hub belongs to it, but anyone can
  type an `orkestrator://` URL. The page only picks a login and builds a path;
  whether the object may be seen is the service's answer on the page it opens.

## 3. Deeplinks: the path convention

The path of a deeplink is a route of this app, written exactly as the router
reads it: percent-encoded once, query included, no fragment.

```
https://<frontend>/deeplink/<org>/orkestrator/mikro/images/5?tab=info
  → orkestrator://mikro/images/5?tab=info
```

Kontrol hands the path over without the organization, so a plain path opens
on whichever login is active. A link that must open in one organization uses
the gate as its path (`/open`, `core/tabs/sharing/shareScope.ts`):

```
…/deeplink/<org>/orkestrator/open?to=<lok base url>&org=<org id>&hub=<hub id>&path=<encoded app path>
```

The gate (`app/pages/ShareGatePage.tsx`) compares that scope with the logins
on this device: it lands silently on a match, asks before switching, lets a
non-member ask to join, and offers to connect otherwise. This is the form the
app copies for a page. Use a plain path only for something any organization
can act on, and for a link that is published rather than shared, an intent
(§3a).

## 3a. Intents: links that are published

A README badge, a paper or a docs page is never edited again, so what it holds
must not be a route of this app (routes move with every refactor, and the
module may be missing where the link is opened). It names an **intent**: a
stable, versioned verb with its parameters.

```
orkestrator://do/v1/repo.install?source=oci:ghcr.io/owner/app
https://arkitekt.live/deeplink?orkestrator=%2Fdo%2Fv1%2Frepo.install%3Fsource%3Doci%253Aghcr.io%252Fowner%252Fapp
```

- **Declared by a module** (`intents` builtin, `IntentDecl` in `intents.ts`):
  `name`, the highest `version` it reads, a `title`, `parse(params, version)`
  (untrusted text; says what is wrong), `target(value)` → its current route,
  optionally `serviceKey` / `roles` (default: the module's) and
  `picksOrganization`. Names are not namespaced (the verb outlives the module
  that answers it) and two modules cannot claim one.
- **Walked by the host** (`IntentPage`), one ladder for every intent:
  readable → known (else "needs a newer Orkestrator", never a 404) → valid →
  which organization (only for `picksOrganization`, only with more than one
  login; the choice rides a switch as `in=<profile id>`) → roles → service
  (missing from the deployment: names the module and offers the other logins;
  unreachable: the usual service page) → `navigate(target, { replace })`.
- **The promise:** a published name and its parameters are read forever. Add
  parameters freely; change the meaning of one only with a new version, and
  keep parsing the old ones. The badge output is pinned byte-for-byte in a test
  (`kabinet/repoLink.test.ts`), so changing it is a decision. The arkitekt
  SDK builds the same badge (`arkitekt plugin badge`) and pins the same
  string (`tests/cli/test_badge.py`): change both or neither.
- Shared page links (§3) stay `/open`: they name a page on one deployment,
  which is a different promise.

| Intent | Parameters | Answered by |
|---|---|---|
| `repo.install` v1 | `source=oci:<registry>/<repository>`: the app's published package, lowercased, no tag or digest (any other scheme is refused) | kabinet → `/kabinet/repos/install?reference=…` → `importRepo` |

A badge installs the package the app's release workflow publishes, never its
GitHub source: that is what Kabinet runs, and a project made by `arkitekt
create` keeps no deployment file in its repository. The SDK writes the badge
into the README (between `<!-- arkitekt:badge -->` markers) as soon as the
repository is known: at `arkitekt create` when `origin` is already set,
otherwise on the first run of the generated release workflow.

The old badge form, `/kabinet/repos/install?repo=user/repo` (a GitHub
repository for Kabinet to scan), still lands: it is a route. Nothing emits it
any more.

## 4. Nobody signed in

A link that arrives on the welcome screen is kept (`rememberPendingShare`) and
opened by the boot that follows the sign-in (`core/tabs/TabsProvider.tsx`).

## 5. What the app copies

`core/tabs/sharing/universalLink.ts`; always an https form, never the raw
scheme.

| What | Form |
|---|---|
| "Copy link" on an object | `<frontend>/smartlink/<org>/<hub>/<identifier, one encoded segment>/<id>` |
| "Copy link" on a page | `<frontend>/deeplink/<org>/orkestrator/open?…` (§3) |
| "Copy private link" | `https://arkitekt.live/deeplink?orkestrator=…` (unchanged) |
| The README badge (made by the arkitekt SDK, not copied in the app) | `https://arkitekt.live/deeplink?orkestrator=/do/v1/repo.install?…` (§3a) |

Both kontrol forms end in `user_id=<lok id of whoever copied it>`, which
kontrol shows as the sharer. The app ignores it on arrival (a smartlink drops
it before opening the page).

The kontrol forms need the deployment's `frontend_url`, the organization's
slug and the hub id (`profileLinkHost`). When one is missing (an organization
without a slug cannot be linked through kontrol) the arkitekt.live form is
copied instead.

## 6. Not verified in the app

- Links from kontrol arriving in a running and in a cold-started app.
- That `frontend_url` is kontrol's origin, and that a smartlink's `<hub>` is
  the hub id lok reports in `mycontext`.
- `orkestrator://` registration in a packaged build. There is no mobile build.
- That arkitekt.live's landing page passes a `/do/…` path through unchanged
  (it reads `orkestrator=` and does not look inside, as far as the app knows),
  and whether it should name the intent ("Install user/repo") when no app is
  installed.
