#!/usr/bin/env node
/**
 * Validate every service's GraphQL documents against the schema that service serves, and
 * stamp the release it reported (`Arkitekt-Service-Version` on its health route).
 *
 *   node scripts/tested.mjs rekuest=http://jhnnsrs-lab/rekuest mikro=http://jhnnsrs-lab/mikro
 *
 * The release job runs it against a hub of released images (`scripts/tested_hub.py`); the
 * stamp it writes is what the app then wants from each service (`core/.../tested.ts`).
 * A service that reports no release (a local build) is validated but not stamped.
 * Exits non-zero while any document is invalid.
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const g = require("graphql");

const STAMP = "src/renderer/src/tested.json";
/** Fakts key of a service -> where its documents are. */
const DOCUMENTS = {
  alpaka: "graphql/alpaka",
  bank: "graphql/bank",
  dokuments: "graphql/dokuments",
  elektro: "graphql/elektro",
  fluss: "graphql/fluss-next",
  kabinet: "graphql/kabinet",
  kraph: "graphql/kraph",
  kuvert: "graphql/kuvert",
  lok: "graphql/lok-next",
  lokate: "graphql/lokate",
  lovekit: "graphql/lovekit",
  mikro: "graphql/mikro-next",
  omero_ark: "graphql/omero-ark",
  rekuest: "graphql/rekuest-next",
};

/** The schema a service serves: its SDL route, or introspection where it has none. */
async function schemaOf(url) {
  const sdl = await fetch(`${url}/schema`);
  // `assumeValidSDL`: the served SDL carries federation directives graphql-js does not define.
  if (sdl.ok) return g.buildSchema(await sdl.text(), { assumeValidSDL: true });
  const answer = await fetch(`${url}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: g.getIntrospectionQuery() }),
  });
  if (!answer.ok) throw new Error(`no schema at ${url} (${sdl.status}, ${answer.status})`);
  return g.buildClientSchema((await answer.json()).data);
}

function documentsIn(root) {
  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (p.endsWith(".graphql")) files.push(p);
    }
  })(root);
  return files.sort();
}

/** The errors of a service's documents, by file. */
function validate(schema, files) {
  // One document, so fragment spreads resolve across files; `starts` maps a line back.
  let combined = "";
  const starts = [];
  for (const file of files) {
    starts.push({ file, start: combined.split("\n").length });
    combined += fs.readFileSync(file, "utf8") + "\n";
  }
  const errors = g.validate(
    schema,
    g.parse(combined),
    g.specifiedRules.filter((rule) => rule.name !== "NoUnusedFragmentsRule"),
    { maxErrors: 10000 },
  );
  const perFile = new Map();
  for (const error of errors) {
    const line = error.locations?.[0]?.line ?? 0;
    let owner = "<unattributed>";
    for (const entry of starts) if (entry.start <= line) owner = entry.file;
    if (!perFile.has(owner)) perFile.set(owner, new Set());
    perFile.get(owner).add(error.message);
  }
  return perFile;
}

const given = process.argv.slice(2).map((argument) => argument.split(/=(.*)/s, 2));
if (!given.length) {
  console.error("usage: node scripts/tested.mjs <service>=<url> ...");
  process.exit(2);
}

const stamp = {};
let broken = 0;
for (const [key, url] of given) {
  const root = DOCUMENTS[key];
  if (!root) continue; // a service of the hub this app has no documents for
  const files = documentsIn(root);
  let perFile;
  try {
    perFile = validate(await schemaOf(url), files);
  } catch (error) {
    console.log(`${key}: ${error.message}`);
    broken += 1;
    continue;
  }
  const health = await fetch(`${url}/ht`).catch(() => null);
  const version = health?.headers.get("arkitekt-service-version") ?? null;
  if (version) stamp[key] = version;
  console.log(`${key} ${version ?? "(no release reported)"}: ${files.length} documents, ${perFile.size} broken`);
  for (const file of [...perFile.keys()].sort()) {
    console.log(`  ${file}`);
    for (const message of perFile.get(file)) console.log(`    - ${message}`);
  }
  broken += perFile.size;
}

if (broken) process.exit(1);
fs.writeFileSync(STAMP, JSON.stringify(stamp, Object.keys(stamp).sort(), 2) + "\n");
console.log(`stamped ${Object.keys(stamp).length} services in ${STAMP}`);
