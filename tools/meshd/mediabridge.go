package main

// The media bridge: how WebRTC media (LiveKit) reaches a media server that is only on the
// mesh. The window's WebRTC cannot use the mesh's HTTP proxy and there is no TUN device, so
// this node runs a TURN server on 127.0.0.1 whose allocations are UDP sockets on the mesh.
// The window is handed it as an ICE server; WebRTC still prefers a direct UDP path when one
// works, and uses the bridge when it does not.
//
// What keeps it small:
//   - it listens on 127.0.0.1 only, on a free port, with a username and password made up per
//     bridge (only the window that asked is told them);
//   - every allocation is a UDP socket on the mesh: nothing on the local network or the
//     internet is reachable through it;
//   - it relays only to the machines it was started for (the media server), checked on every
//     permission the client asks for;
//   - UDP only (no TCP allocations): live media is UDP, and the mesh falls back to TCP itself.

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"net/netip"
	"strings"
	"sync"
	"time"

	"github.com/pion/turn/v4"
)

const mediaBridgeRealm = "arkitekt-mesh"

type mediaBridgeEvent struct {
	Ev         string   `json:"ev"`
	ID         string   `json:"id"`
	Gen        int64    `json:"gen,omitempty"`
	URLs       []string `json:"urls,omitempty"`
	Username   string   `json:"username,omitempty"`
	Credential string   `json:"credential,omitempty"`
	// The mesh addresses it relays to, as resolved.
	Allowed []string `json:"allowed,omitempty"`
	Error   string   `json:"error,omitempty"`
}

type mediaBridge struct {
	server     *turn.Server
	urls       []string
	username   string
	credential string
	mu         sync.Mutex
	allowed    map[netip.Addr]bool
}

func (b *mediaBridge) permits(ip netip.Addr) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.allowed[ip.Unmap()]
}

func (b *mediaBridge) allow(ips []netip.Addr) []string {
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, ip := range ips {
		b.allowed[ip.Unmap()] = true
	}
	out := make([]string, 0, len(b.allowed))
	for ip := range b.allowed {
		out = append(out, ip.String())
	}
	return out
}

func (b *mediaBridge) event(n *node, allowed []string) mediaBridgeEvent {
	return mediaBridgeEvent{
		Ev: "media-bridge", ID: n.id, Gen: n.gen,
		URLs: b.urls, Username: b.username, Credential: b.credential, Allowed: allowed,
	}
}

func randomHex(bytes int) string {
	buf := make([]byte, bytes)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

// meshRelay allocates relay sockets on this node's mesh address.
type meshRelay struct{ n *node }

func (r meshRelay) Validate() error { return nil }

func (r meshRelay) AllocatePacketConn(network string, requestedPort int) (net.PacketConn, net.Addr, error) {
	ip4, ip6 := r.n.srv.TailscaleIPs()
	ip := ip4
	if network == "udp6" || !ip.IsValid() {
		ip = ip6
	}
	if !ip.IsValid() {
		return nil, nil, errors.New("this node has no mesh address yet")
	}
	conn, err := r.n.srv.ListenPacket("udp", netip.AddrPortFrom(ip, uint16(requestedPort)).String())
	if err != nil {
		return nil, nil, err
	}
	return conn, conn.LocalAddr(), nil
}

func (r meshRelay) AllocateConn(string, int) (net.Conn, net.Addr, error) {
	return nil, nil, errors.New("the media bridge relays UDP only")
}

// resolveMeshHosts turns `host` or `host:port` into the mesh addresses of the machines they
// name: an address on the mesh as it is, a name by the netmap (its MagicDNS name, full or
// short). Anything that is not a machine on the mesh is refused.
func (n *node) resolveMeshHosts(ctx context.Context, hosts []string) ([]netip.Addr, error) {
	st, err := n.lc.Status(ctx)
	if err != nil {
		return nil, err
	}
	var out []netip.Addr
	for _, raw := range hosts {
		host := raw
		if h, _, err := net.SplitHostPort(raw); err == nil {
			host = h
		}
		host = strings.TrimSuffix(strings.ToLower(strings.Trim(host, "[]")), ".")
		if ip, err := netip.ParseAddr(host); err == nil {
			out = append(out, ip)
			continue
		}
		found := false
		for _, p := range st.Peer {
			dns := strings.TrimSuffix(strings.ToLower(p.DNSName), ".")
			short := strings.SplitN(dns, ".", 2)[0]
			if dns == host || short == host || strings.ToLower(p.HostName) == host {
				out = append(out, p.TailscaleIPs...)
				found = true
			}
		}
		if !found {
			return nil, fmt.Errorf("%s is not a machine on this mesh", raw)
		}
	}
	return out, nil
}

// newMediaBridge starts a TURN server on a free 127.0.0.1 port with made-up credentials, whose
// allocations come from `relay` and which relays only to the addresses it is told to allow
// (none yet).
func newMediaBridge(relay turn.RelayAddressGenerator) (*mediaBridge, error) {
	listener, err := net.ListenPacket("udp4", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	b := &mediaBridge{
		urls:       []string{fmt.Sprintf("turn:127.0.0.1:%d?transport=udp", listener.LocalAddr().(*net.UDPAddr).Port)},
		username:   randomHex(8),
		credential: randomHex(16),
		allowed:    map[netip.Addr]bool{},
	}
	key := turn.GenerateAuthKey(b.username, mediaBridgeRealm, b.credential)
	server, err := turn.NewServer(turn.ServerConfig{
		Realm: mediaBridgeRealm,
		AuthHandler: func(username, _ string, _ net.Addr) ([]byte, bool) {
			return key, username == b.username
		},
		PacketConnConfigs: []turn.PacketConnConfig{{
			PacketConn:            listener,
			RelayAddressGenerator: relay,
			PermissionHandler: func(_ net.Addr, peer net.IP) bool {
				ip, ok := netip.AddrFromSlice(peer)
				return ok && b.permits(ip)
			},
		}},
	})
	if err != nil {
		_ = listener.Close()
		return nil, err
	}
	b.server = server
	return b, nil
}

// startMediaBridge starts the node's bridge (once) and lets it relay to `hosts` too.
func (n *node) startMediaBridge(hosts []string) {
	fail := func(err error) {
		emit(mediaBridgeEvent{Ev: "media-bridge", ID: n.id, Gen: n.gen, Error: err.Error()})
	}
	if len(hosts) == 0 {
		fail(errors.New("a media bridge needs the media server it relays to"))
		return
	}
	ctx, cancel := context.WithTimeout(n.ctx, 10*time.Second)
	defer cancel()
	ips, err := n.resolveMeshHosts(ctx, hosts)
	if err != nil {
		fail(err)
		return
	}

	n.mu.Lock()
	defer n.mu.Unlock()
	if n.bridge != nil {
		emit(n.bridge.event(n, n.bridge.allow(ips)))
		return
	}
	b, err := newMediaBridge(meshRelay{n: n})
	if err != nil {
		fail(err)
		return
	}
	n.bridge = b
	emit(b.event(n, b.allow(ips)))
}

// closeMediaBridge stops the node's bridge, if it runs.
func (n *node) closeMediaBridge() {
	n.mu.Lock()
	b := n.bridge
	n.bridge = nil
	n.mu.Unlock()
	if b != nil {
		_ = b.server.Close()
	}
}
