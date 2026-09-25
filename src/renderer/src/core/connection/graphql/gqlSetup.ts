import { disableFragmentWarnings } from "@apollo/client";

// Each service's generated graphql.ts registers its fragments with the one
// global graphql-tag registry, and services legitimately share fragment names
// (Structure, File, ListClient, …). Documents embed their own fragment
// definitions and every service has its own client, so the collisions are
// harmless. Must run before any graphql.ts is evaluated: imported first in main.tsx.
disableFragmentWarnings();
