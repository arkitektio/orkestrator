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

| Link | Sent by | Lands on |
|---|---|---|
| `orkestrator://<service>/auth/callback?<query>` | the auth relay | `RelayCallbackRedirect` → `/auth/callback/<service>` (`core/authflow/AUTH_FLOWS.md`) |
| `orkestrator://smart/<org>/<hub>/<identifier>/<id>` | a smartlink | `SmartLinkPage` (`/smart/*`) |
| `orkestrator://<path…>?<query>` | a deeplink | that route of the app |

`smart`, `auth` and `open` (with `new`, `settings`, `blok`) are the host's
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
can act on (installing a repository).

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
| "Copy private link", the README badge | `https://arkitekt.live/deeplink?orkestrator=…` (unchanged) |

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
