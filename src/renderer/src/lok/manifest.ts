import type { ModuleManifest } from "@/core/modules/spec";

/**
 * Team: what this module is, as data (module spec v1). The host reads
 * it; nothing in here may be code. `./module.tsx` holds the builtins the
 * manifest refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "lok",
  service: "live.arkitekt.lok",
  version: "0.0.0",
  label: "Team",
  icon: "users",
  models: [
    { identifier: "@lok/user", name: "User", datum: false, path: "members/:id", description: "Everyone with an account on this server: who they are and how to reach them." },
    { identifier: "@lok/group", name: "Group", datum: false, path: "groups/:id", description: "Groups of users, to grant access to many people at once." },
    { identifier: "@lok/client", name: "Client", datum: false, path: "clients/:id", description: "Every app signed in to your organization: which app and version, whose it is, and the device it runs on." },
    { identifier: "@lok/device", name: "Device", datum: false, path: "devices/:id", description: "The machines and virtual machines that give your organization compute: every node registered to run tasks, and the apps on it." },
    { identifier: "@lok/app", name: "App", datum: false, path: "apps/:id", description: "Every app registered with your organization, from the ones you run to the ones that run for you." },
    { identifier: "@lok/release", name: "Release (Lok)", datum: false, path: "releases/:id", description: "The versions of your apps that registered with this server." },
    { identifier: "@lok/service", name: "Service", datum: false, path: "services/:id", description: "The kinds of service a server can run: data stores, the task broker, the knowledge graph, and what else your apps use." },
    { identifier: "@lok/backend", name: "Backend (Lok)", datum: false, path: "backends/:id", description: "The backends that host services for your organization." },
    { identifier: "@lok/serviceinstance", name: "Service Instance", datum: false, path: "serviceinstances/:id", description: "The services deployed on this server, and who they let in or keep out." },
    { identifier: "@lok/layer", name: "Layer", datum: false, path: "layers/:id", description: "Connection layers between services and apps: a service in a layer is reached only by the apps with access to it." },
    { identifier: "@lok/mapping", name: "Mapping", datum: false, path: "mappings/:id", description: "Which service instance an app reaches under which key." },
    { identifier: "@lok/composition", name: "Composition", datum: false, path: "composition/:id", description: "A server's composition: its services, their instances and how apps reach them." },
    { identifier: "@lok/mandate", name: "Mandate", datum: false, path: "mandates/:id", description: "Apps allowed to act as you: each lets a deployer start one exact app version signed in as you, and revoking it signs every running instance out." },
    { identifier: "@lok/bugreport", name: "Bug Report", datum: false, path: "bugreports/:id", description: "What people reported from inside the app: the error, the steps before it, and what the app recorded." },
  ],
};
