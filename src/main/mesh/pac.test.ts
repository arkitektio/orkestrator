import { describe, expect, it } from "vitest";
import { buildPac, proxyPortForHost, routesFor, type PacRoute } from "./pac";
import type { MeshConfig, MeshNodeStatus } from "./protocol";

const config = (id: string, hosts: string[] = []): MeshConfig => ({
  id,
  label: id,
  controlUrl: "https://mesh.example.org",
  hosts,
});

const running = (id: string, port: number, extra: Partial<MeshNodeStatus> = {}): MeshNodeStatus => ({
  id,
  state: "running",
  proxyPort: port,
  magicDnsSuffix: `${id}.mesh.example.org`,
  peers: [
    { dnsName: `mikro.${id}.mesh.example.org`, hostName: "mikro", ips: ["100.64.0.5"], online: true },
  ],
  selfIps: ["100.64.0.9"],
  ...extra,
});

/** Evaluate the generated script the way Chromium would, minus the PAC helpers. */
const evaluate = (pac: string, host: string): string => {
  const dnsDomainIs = (h: string, domain: string) => h.endsWith(domain);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function("dnsDomainIs", `${pac}; return FindProxyForURL;`)(dnsDomainIs) as (
    url: string,
    host: string,
  ) => string;
  return fn(`https://${host}/graphql`, host);
};

describe("routesFor", () => {
  it("only lists running meshes with a proxy port", () => {
    const statuses = new Map<string, MeshNodeStatus>([
      ["a", running("a", 1001)],
      ["b", { id: "b", state: "needs-login", proxyPort: 1002 }],
      ["c", { id: "c", state: "running" }],
    ]);
    const routes = routesFor([config("a"), config("b"), config("c")], statuses);
    expect(routes.map((route) => route.meshId)).toEqual(["a"]);
    expect(routes[0]).toMatchObject({
      proxyPort: 1001,
      suffix: "a.mesh.example.org",
      peerNames: ["mikro.a.mesh.example.org", "mikro"],
      ips: ["100.64.0.5", "100.64.0.9"],
    });
  });

  it("normalises and filters pinned hosts", () => {
    const routes = routesFor(
      [config("a", ["Mikro.Lab.", "bad host!", "100.64.0.7"])],
      new Map([["a", running("a", 1001)]]),
    );
    expect(routes[0].pinned).toEqual(["mikro.lab", "100.64.0.7"]);
  });
});

describe("buildPac", () => {
  it("is DIRECT (undefined) when nothing routes", () => {
    expect(buildPac([])).toBeUndefined();
    expect(
      buildPac([{ meshId: "a", proxyPort: 1, pinned: [], peerNames: [], ips: [] }]),
    ).toBeUndefined();
  });

  it("routes suffix, peer names, ips and pinned hosts to the mesh's proxy", () => {
    const routes = routesFor([config("a", ["data.lab.internal"])], new Map([["a", running("a", 1001)]]));
    const pac = buildPac(routes)!;
    expect(evaluate(pac, "mikro.a.mesh.example.org")).toBe("SOCKS5 127.0.0.1:1001");
    expect(evaluate(pac, "MIKRO.A.MESH.EXAMPLE.ORG.")).toBe("SOCKS5 127.0.0.1:1001");
    expect(evaluate(pac, "anything.a.mesh.example.org")).toBe("SOCKS5 127.0.0.1:1001");
    expect(evaluate(pac, "mikro")).toBe("SOCKS5 127.0.0.1:1001");
    expect(evaluate(pac, "100.64.0.5")).toBe("SOCKS5 127.0.0.1:1001");
    expect(evaluate(pac, "data.lab.internal")).toBe("SOCKS5 127.0.0.1:1001");
    expect(evaluate(pac, "go.arkitekt.live")).toBe("DIRECT");
    expect(evaluate(pac, "notmesh.example.org")).toBe("DIRECT");
  });

  it("drops a short name or IP two meshes both claim, but keeps their suffixes", () => {
    const statuses = new Map([
      ["a", running("a", 1001)],
      ["b", running("b", 1002)],
    ]);
    const pac = buildPac(routesFor([config("a"), config("b")], statuses))!;
    expect(evaluate(pac, "mikro")).toBe("DIRECT");
    expect(evaluate(pac, "100.64.0.5")).toBe("DIRECT");
    expect(evaluate(pac, "mikro.a.mesh.example.org")).toBe("SOCKS5 127.0.0.1:1001");
    expect(evaluate(pac, "mikro.b.mesh.example.org")).toBe("SOCKS5 127.0.0.1:1002");
  });

  it("lets a pinned host override an ambiguous claim", () => {
    const statuses = new Map([
      ["a", running("a", 1001)],
      ["b", running("b", 1002)],
    ]);
    const pac = buildPac(routesFor([config("a"), config("b", ["mikro", "100.64.0.5"])], statuses))!;
    expect(evaluate(pac, "mikro")).toBe("SOCKS5 127.0.0.1:1002");
    expect(evaluate(pac, "100.64.0.5")).toBe("SOCKS5 127.0.0.1:1002");
  });

  it("never embeds an unvalidated string", () => {
    const routes: PacRoute[] = [
      {
        meshId: "a",
        proxyPort: 1001,
        pinned: ["ok.host"],
        suffix: "a.mesh.example.org",
        peerNames: ["fine"],
        ips: [],
      },
    ];
    const pac = buildPac(routes)!;
    expect(pac).not.toContain("</script>");
    expect(() => evaluate(pac, "x")).not.toThrow();
  });
});

describe("proxyPortForHost", () => {
  it("mirrors the PAC rules for main's Node clients", () => {
    const routes = routesFor(
      [config("a", ["data.lab.internal"]), config("b")],
      new Map([
        ["a", running("a", 1001)],
        ["b", running("b", 1002)],
      ]),
    );
    expect(proxyPortForHost(routes, "mikro.a.mesh.example.org")).toBe(1001);
    expect(proxyPortForHost(routes, "Data.Lab.Internal")).toBe(1001);
    expect(proxyPortForHost(routes, "x.b.mesh.example.org")).toBe(1002);
    expect(proxyPortForHost(routes, "mikro")).toBeUndefined();
    expect(proxyPortForHost(routes, "go.arkitekt.live")).toBeUndefined();
  });
});
