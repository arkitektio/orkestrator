// meshd is Orkestrator's mesh sidecar: a userspace Tailscale node per
// organisation mesh, each exposing a local SOCKS5 + HTTP CONNECT proxy, all
// hosted in this one process.
//
// It speaks newline-delimited JSON over stdio with the Electron main process
// (see src/main/mesh/protocol.ts for the TypeScript half). stdout carries
// NOTHING but protocol events — every log line goes to stderr — because the
// parent parses stdout line by line.
//
//	stdin  → {"op":"connect","id":..,"gen":..,"dir":..,"controlUrl":..,"hostname":..,"authKey":..}
//	         {"op":"disconnect","id":..,"gen":..}
//	         {"op":"ping","id":..,"gen":..,"target":<tailnet ip>}   (disco ping, like `tailscale ping`)
//	         {"op":"lock-sign","id":..,"gen":..,"nodeKey":"nodekey:.."} (Tailnet Lock: approve a waiting machine)
//	         {"op":"lock-init","id":..,"gen":..,"trustedKeys":["tlpub:.."]} (Tailnet Lock: become the key authority)
//	         {"op":"status"}             (re-emit every node's status)
//	         {"op":"shutdown"}
//	stdout ← {"ev":"ready","version":..,"protocol":2}
//	         {"ev":"status","gen":.., ...MeshNodeStatus}
//	         {"ev":"ping","id":..,"gen":..,"target":..,"attempt":..,"final":..,...}
//	         {"ev":"lock-sign","id":..,"gen":..,"nodeKey":..,"ok":..,"error":..}
//	         {"ev":"lock-init","id":..,"gen":..,"ok":..,"error":..,"disablementSecrets":[..]}
//	         {"ev":"log","id":..,"gen":..,"message":..}
//	         {"ev":"error","id":..,"gen":..,"message":..}
//
// Every node event carries the generation of the connect that started the
// node, so the parent can drop whatever an earlier node of the same id still
// had in flight. A connect for an id this process holds under another
// generation replaces that node; under the same one it only repeats the last
// status. A disconnect answers nothing: the parent knows what it asked for.
//
// The node never installs a TUN device or a route: tsnet runs a gVisor
// netstack in-process, so no privileges are needed and the system Tailscale
// client (if any) is left alone. Traffic reaches the tailnet only through the
// per-node proxy, and the parent decides what goes there (a PAC script).
//
// There is deliberately NO interactive login: a node authenticates with the
// one-shot pre-auth key the coordination server minted when the user was
// approved into the organisation, or with the state it kept from an earlier
// key. A node without either simply reports "needs-login" and waits; the
// parent knows that means "sign in to the deployment again".
package main

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/netip"
	"os"
	"reflect"
	"sort"
	"strings"
	"sync"
	"time"

	"tailscale.com/client/local"
	"tailscale.com/ipn"
	"tailscale.com/ipn/ipnstate"
	"tailscale.com/net/proxymux"
	"tailscale.com/net/socks5"
	"tailscale.com/tailcfg"
	"tailscale.com/tsnet"
	"tailscale.com/types/logger"
)

const version = "0.2.0"

// protocol is bumped whenever the stdio protocol changes; the parent refuses
// a sidecar that speaks another one.
const protocol = 2

type command struct {
	Op         string `json:"op"`
	ID         string `json:"id,omitempty"`
	Gen        int64  `json:"gen,omitempty"`
	Dir        string `json:"dir,omitempty"`
	ControlURL string `json:"controlUrl,omitempty"`
	Hostname   string `json:"hostname,omitempty"`
	AuthKey    string `json:"authKey,omitempty"`
	Target     string `json:"target,omitempty"`
	NodeKey    string `json:"nodeKey,omitempty"`
	// Other signers' lock keys for lock-init; this node's own is implied.
	TrustedKeys []string `json:"trustedKeys,omitempty"`
}

type peer struct {
	DNSName  string   `json:"dnsName,omitempty"`
	HostName string   `json:"hostName,omitempty"`
	IPs      []string `json:"ips"`
	Online   bool     `json:"online"`
	Expired  bool     `json:"expired,omitempty"`
	OS       string   `json:"os,omitempty"`
	// The path traffic currently takes, when there has been any: a direct
	// endpoint ("ip:port") or the DERP relay region it goes through.
	CurAddr       string `json:"curAddr,omitempty"`
	Relay         string `json:"relay,omitempty"`
	Active        bool   `json:"active,omitempty"`
	LastHandshake string `json:"lastHandshake,omitempty"`
}

// pingEvent is one attempt of a disco ping, the same probe `tailscale ping`
// runs: it answers "can we reach it, how fast, and is the path direct or
// relayed". Several attempts are made because the first replies usually
// come over DERP while the direct path is still being discovered.
type pingEvent struct {
	Ev         string  `json:"ev"`
	ID         string  `json:"id"`
	Gen        int64   `json:"gen,omitempty"`
	Target     string  `json:"target"`
	Attempt    int     `json:"attempt"`
	Final      bool    `json:"final"`
	OK         bool    `json:"ok"`
	LatencyMs  float64 `json:"latencyMs,omitempty"`
	Direct     bool    `json:"direct"`
	Endpoint   string  `json:"endpoint,omitempty"`
	DerpRegion string  `json:"derpRegion,omitempty"`
	NodeName   string  `json:"nodeName,omitempty"`
	Error      string  `json:"error,omitempty"`
}

const pingAttempts = 5

// nodeStatus is the whole truth about one node, re-sent in full whenever any
// of it changes. Full snapshots, never deltas: a parent that missed a line
// (or connected late) is never left with a stale picture.
type nodeStatus struct {
	Ev             string   `json:"ev"`
	ID             string   `json:"id"`
	Gen            int64    `json:"gen,omitempty"`
	State          string   `json:"state"`
	ProxyPort      int      `json:"proxyPort,omitempty"`
	MagicDNSSuffix string   `json:"magicDnsSuffix,omitempty"`
	TailnetName    string   `json:"tailnetName,omitempty"`
	SelfIPs        []string `json:"selfIps,omitempty"`
	SelfDNSName    string   `json:"selfDnsName,omitempty"`
	Peers          []peer   `json:"peers,omitempty"`
	// Tailnet Lock, when the node could tell (see lock.go).
	Lock  *lockStatus `json:"lock,omitempty"`
	Error string      `json:"error,omitempty"`
}

type node struct {
	id       string
	gen      int64
	ctx      context.Context
	srv      *tsnet.Server
	lc       *local.Client
	listener net.Listener
	proxy    int
	cancel   context.CancelFunc
	mu       sync.Mutex
	last     nodeStatus
}

var (
	out   = json.NewEncoder(os.Stdout)
	outMu sync.Mutex
	nodes = map[string]*node{}
	nodMu sync.Mutex
)

func emit(v any) {
	outMu.Lock()
	defer outMu.Unlock()
	_ = out.Encode(v)
}

func logf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "meshd: "+format+"\n", args...)
}

func emitLog(id string, gen int64, message string) {
	emit(map[string]any{"ev": "log", "id": id, "gen": gen, "message": strings.TrimSpace(message)})
}

func emitError(id string, gen int64, message string) {
	emit(map[string]any{"ev": "error", "id": id, "gen": gen, "message": message})
}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--version" {
		fmt.Println(version)
		return
	}
	if len(os.Args) < 2 || os.Args[1] != "--stdio" {
		fmt.Fprintln(os.Stderr, "usage: meshd --stdio")
		os.Exit(2)
	}

	emit(map[string]any{"ev": "ready", "version": version, "protocol": protocol})

	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 0, 64*1024), 1<<20)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var cmd command
		if err := json.Unmarshal([]byte(line), &cmd); err != nil {
			emitError("", 0, "malformed command: "+err.Error())
			continue
		}
		if cmd.Op == "shutdown" {
			break
		}
		handle(cmd)
	}
	// stdin closed (the parent quit or asked us to) — tear every node down so
	// no WireGuard endpoint outlives the app.
	shutdownAll()
}

func handle(cmd command) {
	switch cmd.Op {
	case "connect":
		if err := connect(cmd); err != nil {
			emitError(cmd.ID, cmd.Gen, err.Error())
			emit(nodeStatus{Ev: "status", ID: cmd.ID, Gen: cmd.Gen, State: "error", Error: err.Error()})
		}
	case "disconnect":
		disconnect(cmd.ID, cmd.Gen)
	case "ping":
		n := nodeAt(cmd.ID, cmd.Gen)
		if n == nil {
			emit(pingEvent{Ev: "ping", ID: cmd.ID, Gen: cmd.Gen, Target: cmd.Target, Attempt: 1, Final: true, Error: "no such node"})
			return
		}
		go n.ping(cmd.Target)
	case "lock-sign":
		n := nodeAt(cmd.ID, cmd.Gen)
		if n == nil {
			emit(lockSignEvent{Ev: "lock-sign", ID: cmd.ID, Gen: cmd.Gen, NodeKey: cmd.NodeKey, Error: "no such node"})
			return
		}
		go n.lockSign(cmd.NodeKey)
	case "lock-init":
		n := nodeAt(cmd.ID, cmd.Gen)
		if n == nil {
			emit(lockInitEvent{Ev: "lock-init", ID: cmd.ID, Gen: cmd.Gen, Error: "no such node"})
			return
		}
		go n.lockInit(cmd.TrustedKeys)
	case "status":
		nodMu.Lock()
		all := make([]*node, 0, len(nodes))
		for _, n := range nodes {
			all = append(all, n)
		}
		nodMu.Unlock()
		for _, n := range all {
			n.mu.Lock()
			last := n.last
			n.mu.Unlock()
			if last.Ev != "" {
				emit(last)
			}
		}
	default:
		emitError(cmd.ID, cmd.Gen, "unknown op: "+cmd.Op)
	}
}

// nodeAt is the node of that id, if it is the one the parent means: a
// command naming another generation is about a node that is gone.
func nodeAt(id string, gen int64) *node {
	nodMu.Lock()
	defer nodMu.Unlock()
	n := nodes[id]
	if n == nil || (gen != 0 && n.gen != gen) {
		return nil
	}
	return n
}

func connect(cmd command) error {
	if cmd.ID == "" || cmd.Dir == "" {
		return errors.New("connect needs id and dir")
	}
	nodMu.Lock()
	existing := nodes[cmd.ID]
	nodMu.Unlock()
	if existing != nil {
		if existing.gen == cmd.Gen {
			// The same connect again: just repeat where we are.
			existing.mu.Lock()
			last := existing.last
			existing.mu.Unlock()
			if last.Ev != "" {
				emit(last)
			}
			return nil
		}
		// A newer connect (a key, say) replaces the node outright.
		disconnect(cmd.ID, 0)
	}

	if err := os.MkdirAll(cmd.Dir, 0o700); err != nil {
		return fmt.Errorf("state dir: %w", err)
	}

	id := cmd.ID
	gen := cmd.Gen
	srv := &tsnet.Server{
		Dir:        cmd.Dir,
		Hostname:   cmd.Hostname,
		ControlURL: cmd.ControlURL,
		AuthKey:    cmd.AuthKey,
		Ephemeral:  false,
		// Every tsnet log line goes to stderr; the user-facing ones are also
		// relayed as protocol events so the app can show them.
		Logf: func(format string, args ...any) {
			fmt.Fprintf(os.Stderr, "[%s] "+format+"\n", append([]any{id}, args...)...)
		},
		UserLogf: func(format string, args ...any) {
			msg := fmt.Sprintf(format, args...)
			fmt.Fprintf(os.Stderr, "[%s] %s\n", id, msg)
			emitLog(id, gen, msg)
		},
	}

	emit(nodeStatus{Ev: "status", ID: id, Gen: gen, State: "starting"})

	if err := srv.Start(); err != nil {
		return fmt.Errorf("start: %w", err)
	}
	lc, err := srv.LocalClient()
	if err != nil {
		_ = srv.Close()
		return fmt.Errorf("local client: %w", err)
	}

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		_ = srv.Close()
		return fmt.Errorf("proxy listen: %w", err)
	}
	port := ln.Addr().(*net.TCPAddr).Port

	// One port, both dialects: SOCKS5 (Chromium resolves names on the proxy
	// side, so MagicDNS names work with no OS integration) and HTTP CONNECT
	// (for Node clients in the main process).
	socksLn, httpLn := proxymux.SplitSOCKSAndHTTP(ln)
	n := &node{id: id, gen: gen, srv: srv, lc: lc, listener: ln, proxy: port}
	ss := &socks5.Server{Logf: logger.Discard, Dialer: n.dial}
	go func() {
		if err := ss.Serve(socksLn); err != nil && !errors.Is(err, net.ErrClosed) {
			logf("[%s] socks5: %v", id, err)
		}
	}()
	hs := &http.Server{Handler: connectProxy(id, n.dial)}
	go func() {
		if err := hs.Serve(httpLn); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logf("[%s] http proxy: %v", id, err)
		}
	}()

	ctx, cancel := context.WithCancel(context.Background())
	n.ctx = ctx
	n.cancel = cancel
	n.last = nodeStatus{Ev: "status", ID: id, Gen: gen, State: "starting", ProxyPort: port}

	nodMu.Lock()
	nodes[id] = n
	nodMu.Unlock()

	go n.watch(ctx, port)
	return nil
}

// ping runs disco pings at a tailnet address until one comes back over a
// direct path or the attempts run out, emitting every attempt.
func (n *node) ping(target string) {
	addr, err := netip.ParseAddr(target)
	if err != nil {
		emit(pingEvent{Ev: "ping", ID: n.id, Gen: n.gen, Target: target, Attempt: 1, Final: true, Error: "not a tailnet address"})
		return
	}
	for attempt := 1; attempt <= pingAttempts; attempt++ {
		ev := pingEvent{Ev: "ping", ID: n.id, Gen: n.gen, Target: target, Attempt: attempt}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		res, err := n.lc.Ping(ctx, addr, tailcfg.PingDisco)
		cancel()
		switch {
		case err != nil:
			ev.Error = err.Error()
		case res.Err != "":
			ev.Error = res.Err
		default:
			ev.OK = true
			ev.LatencyMs = res.LatencySeconds * 1000
			ev.NodeName = strings.TrimSuffix(res.NodeName, ".")
			ev.Endpoint = res.Endpoint
			ev.DerpRegion = res.DERPRegionCode
			ev.Direct = res.Endpoint != ""
		}
		ev.Final = ev.Direct || attempt == pingAttempts
		emit(ev)
		if ev.Final {
			return
		}
		time.Sleep(300 * time.Millisecond)
	}
}

// dial is the node's dialer with one convenience on top of tsnet's: a bare
// label ("mikro") gets the tailnet's MagicDNS suffix appended, the way an OS
// resolver with the tailnet search domain would, so a deployment advertising
// short names works through the proxy too.
func (n *node) dial(ctx context.Context, network, addr string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(addr)
	if err == nil && host != "" && !strings.Contains(host, ".") && !strings.Contains(host, ":") && net.ParseIP(host) == nil {
		n.mu.Lock()
		suffix := n.last.MagicDNSSuffix
		n.mu.Unlock()
		if suffix != "" {
			addr = net.JoinHostPort(host+"."+suffix, port)
		}
	}
	conn, err := n.srv.Dial(ctx, network, addr)
	if err != nil {
		// Both proxies answer a failed dial with one generic reply (SOCKS
		// "general failure"), so this line is the only place the reason survives.
		logf("[%s] dial %s %s: %v", n.id, network, addr, err)
	}
	return conn, err
}

func (n *node) port() int { return n.proxy }

// disconnect tears a node down; with a generation, only that node.
func disconnect(id string, gen int64) {
	nodMu.Lock()
	n := nodes[id]
	if n == nil || (gen != 0 && n.gen != gen) {
		nodMu.Unlock()
		return
	}
	delete(nodes, id)
	nodMu.Unlock()
	n.cancel()
	_ = n.listener.Close()
	_ = n.srv.Close()
}

func shutdownAll() {
	nodMu.Lock()
	ids := make([]string, 0, len(nodes))
	for id := range nodes {
		ids = append(ids, id)
	}
	nodMu.Unlock()
	for _, id := range ids {
		disconnect(id, 0)
	}
}

// watch follows the node's IPN bus for state changes, and polls the full
// status while running so peers and the DNS suffix stay current. Every
// change is emitted as a full snapshot.
func (n *node) watch(ctx context.Context, port int) {
	go n.pollStatus(ctx, port)

	backoff := time.Second
	for ctx.Err() == nil {
		w, err := n.lc.WatchIPNBus(ctx, ipn.NotifyInitialState|ipn.NotifyNoPrivateKeys)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			logf("[%s] watch: %v (retrying)", n.id, err)
			time.Sleep(backoff)
			if backoff < 10*time.Second {
				backoff *= 2
			}
			continue
		}
		backoff = time.Second
		for ctx.Err() == nil {
			msg, err := w.Next()
			if err != nil {
				break
			}
			n.onNotify(ctx, msg, port)
		}
		w.Close()
	}
}

func (n *node) onNotify(ctx context.Context, msg ipn.Notify, port int) {
	if msg.ErrMessage != nil {
		emitError(n.id, n.gen, *msg.ErrMessage)
	}
	// NeedsLogin is reported as such and left alone — see the file header.
	if msg.State != nil {
		n.refresh(ctx, port)
	}
}

func (n *node) pollStatus(ctx context.Context, port int) {
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			n.refresh(ctx, port)
		}
	}
}

func (n *node) refresh(ctx context.Context, port int) {
	sctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	st, err := n.lc.Status(sctx)
	cancel()
	if err != nil {
		if ctx.Err() == nil {
			logf("[%s] status: %v", n.id, err)
		}
		return
	}
	next := snapshot(n.id, port, st)
	next.Gen = n.gen
	// A node or server without Tailnet Lock answers with an error; that is
	// not a status failure, there is just no lock to report.
	lctx, lcancel := context.WithTimeout(ctx, 5*time.Second)
	if lock, err := n.lc.TailnetLockStatus(lctx); err == nil {
		next.Lock = lockSnapshot(lock, lockAllowed(st))
	}
	lcancel()
	// Torn down while asking: whatever it reports now is about a node the
	// parent already let go of.
	if ctx.Err() != nil {
		return
	}
	n.mu.Lock()
	changed := !reflect.DeepEqual(next, n.last)
	n.last = next
	n.mu.Unlock()
	if changed {
		emit(next)
	}
}

func snapshot(id string, port int, st *ipnstate.Status) nodeStatus {
	s := nodeStatus{Ev: "status", ID: id, ProxyPort: port}
	switch st.BackendState {
	case ipn.Running.String():
		s.State = "running"
	case ipn.NeedsLogin.String():
		s.State = "needs-login"
	case ipn.NeedsMachineAuth.String():
		s.State = "needs-machine-auth"
	case ipn.Starting.String(), ipn.NoState.String():
		// NoState is a node that has not got going yet, not one that stopped.
		s.State = "starting"
	case ipn.Stopped.String():
		s.State = "stopped"
	default:
		s.State = strings.ToLower(st.BackendState)
	}
	if st.CurrentTailnet != nil {
		s.MagicDNSSuffix = strings.TrimSuffix(st.CurrentTailnet.MagicDNSSuffix, ".")
		s.TailnetName = st.CurrentTailnet.Name
	}
	if s.MagicDNSSuffix == "" {
		s.MagicDNSSuffix = strings.TrimSuffix(st.MagicDNSSuffix, ".")
	}
	if st.Self != nil {
		for _, ip := range st.Self.TailscaleIPs {
			s.SelfIPs = append(s.SelfIPs, ip.String())
		}
		s.SelfDNSName = strings.TrimSuffix(st.Self.DNSName, ".")
	}
	for _, p := range st.Peer {
		ps := peer{
			DNSName:  strings.TrimSuffix(p.DNSName, "."),
			HostName: p.HostName,
			Online:   p.Online,
			Expired:  p.Expired,
			OS:       p.OS,
			CurAddr:  p.CurAddr,
			Relay:    p.Relay,
			Active:   p.Active,
			IPs:      []string{},
		}
		if !p.LastHandshake.IsZero() {
			ps.LastHandshake = p.LastHandshake.UTC().Format(time.RFC3339)
		}
		for _, ip := range p.TailscaleIPs {
			ps.IPs = append(ps.IPs, ip.String())
		}
		s.Peers = append(s.Peers, ps)
	}
	sort.Slice(s.Peers, func(i, j int) bool { return s.Peers[i].DNSName < s.Peers[j].DNSName })
	return s
}

// connectProxy is a minimal HTTP CONNECT tunnel over the node's dialer, for
// the Node-side clients in the Electron main process (undici's ProxyAgent).
// Plain (non-CONNECT) requests are refused: the parent only ever tunnels.
func connectProxy(id string, dial func(ctx context.Context, network, addr string) (net.Conn, error)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodConnect {
			http.Error(w, "only CONNECT is supported", http.StatusMethodNotAllowed)
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		upstream, err := dial(ctx, "tcp", r.Host)
		cancel()
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadGateway)
			return
		}
		hj, ok := w.(http.Hijacker)
		if !ok {
			_ = upstream.Close()
			http.Error(w, "hijack unsupported", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		client, buf, err := hj.Hijack()
		if err != nil {
			_ = upstream.Close()
			return
		}
		go func() {
			defer client.Close()
			defer upstream.Close()
			if buf.Reader.Buffered() > 0 {
				_, _ = io.CopyN(upstream, buf, int64(buf.Reader.Buffered()))
			}
			_, _ = io.Copy(upstream, client)
		}()
		go func() {
			_, _ = io.Copy(client, upstream)
			_ = client.Close()
			_ = upstream.Close()
		}()
		_ = id
	})
}
