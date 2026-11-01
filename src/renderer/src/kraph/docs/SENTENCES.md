# Sentences: what the client needs from kraph

The client lets a person say one thing about a datum:

> **[this datum] measures the [intensity profile] of [a sample]**

The subject is a datum (`identifier` + `object`), "measures" is fixed, the first
word is a MEASUREMENT word and the second an ENTITY word. The thing is a new
individual, a label already on the datum, or an entity dropped on it.

Today's API can write that sentence but cannot read it back, and it cannot read
many data at once. The client does not scan or issue one query per datum to get
around a missing field, so the features below wait for these.

**Stopgap:** the Knowledge sidebar says these sentences already. So that the
thing shows on the datum, the client also records the datum as evidence for it
(INFORMS), through `supportingEvidence` or `assertInforms`. Nobody stated that
claim. Ask 1 lets it go (`kraph/lib/measureTerm.ts`). Until then the measurement
word shows only on the Claims page.

## Asks

### 1. `Structure.claims: [Link!]!`

The standing links on a datum, including MEASUREMENT with its `term` and
`target`. Standing means folded: a retracted link is gone.

Needed to show a sentence after writing it. Nothing answers this today:

- `Structure.informs` holds INFORMS links only, and a sentence states no INFORMS.
- `Instance.connections` documents relations, participations, classifications
  and informing structures, not measurements.
- `measurements` requires a `measurementCategoryId`, which is one view's account.
- `assertions` has no datum filter, and `changes` is a log scan.

**Blocks:** the sentence list, and dropping the stopgap above.

### 2. `measuredBy` on `AssertEntityExistsInput`

```graphql
input MeasuredByInput {
  identifier: String!
  object: String!
  term: String!
}

input AssertEntityExistsInput {
  # …
  measuredBy: [MeasuredByInput!]! = []
}
```

Mints the instance and records datum —term→ instance under **one assertion**,
beside `sameAs`, which already works this way. Today the client makes three acts
for one statement (`assertStructureExists`, `assertEntityExists`,
`assertMeasurementExists`, in `kraph/lib/measureTerm.ts`), so a failure halfway
leaves a stray individual, and the log shows three acts where one person said one
thing.

**Would fix:** one sentence recording as three acts on the Claims page.

### 3. `StructureFilter.refs: [StructureRefInput!]`

```graphql
input StructureRefInput {
  identifier: StructureIdentifier!
  object: StructureObject!
}
```

Reads many data by what the client holds. Refs nobody has claimed anything about
are omitted, not errors. `structures` today filters by kraph `ids`, `search`,
`hasProperty` and `matches` only, and `structureByIdentifier` is one at a time and
raises for an unseen datum.

**Blocks:** the knowledge toggle, which reads everything in view at once.

### 4. `termLabel` on assert inputs, normalized keys on the server

An optional display label on every input that takes a `term`, plus normalization
of the key on the server, so every client coins the same key from the same text.

Verbs read as phrases ("labels the path"). The client cannot create the word
first: `createTerm` requires `kraph_schema` / `kraph_curator`, while asserts
require only `kraph_assert` / `kraph_editor`, so a plain editor would fail.
Normalizing on the client would also lose information, since "α-tubulin" and
"β-tubulin" must stay two words.

**Would fix:** the risk that a new word with spaces is refused (question 1).

## Questions

1. **Are term keys with spaces valid?** A category's key is an AGE name, while
   the client sends a typed word raw, so "intensity profile" goes out as it stands.
2. **Does retracting a sentence's link retract the individual it minted?** Today
   `retractLinks` appears to leave the instance standing, which would make a
   retraction two acts. The sentence list has to know which.
3. **Does `Structure.informs` include an instance that a datum only measures?**
   The client assumes not, which is why it records the stopgap evidence. If it
   does, the stopgap can go now.

## Also owed

Asked for on 2026-09-16 and useful here:

- Nullable `structureByIdentifier`, so an unseen datum is `null` rather than an error
  (`kraph/lib/knowledgeErrors.ts` works around this).
- `Instance.evidence: [Structure!]!`.
- Org-grain `instances(filters: { terms, search, subject })`, so a sentence could
  name an existing individual.
