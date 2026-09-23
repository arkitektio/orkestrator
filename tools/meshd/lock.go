package main

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"tailscale.com/ipn/ipnstate"
	"tailscale.com/tailcfg"
	"tailscale.com/tka"
	"tailscale.com/types/key"
)

// Tailnet Lock, from this node's side. When the tailnet's key authority is
// on, a machine is cut off from every peer until a trusted signer signs its
// node key. Machines waiting for that are dropped from the netmap, so they
// never show up among the peers — only here, as the lock's filtered peers.
//
// meshd reports the lock state with every status, can sign a waiting machine
// when this node's own lock key is trusted, and can initialise the lock —
// become the tailnet's key authority — once the coordination server allows it
// (an administrator switches Tailnet Lock on for the tailnet there; the node
// then carries tailcfg.CapabilityTailnetLock). It never changes who is trusted
// after that: that stays with the tailscale CLI.

type lockPeer struct {
	NodeKey string   `json:"nodeKey"`
	Name    string   `json:"name,omitempty"`
	IPs     []string `json:"ips"`
}

type lockStatus struct {
	// Allowed: the coordination server lets this node initialise the lock.
	Allowed bool `json:"allowed"`
	Enabled bool `json:"enabled"`
	// Signed: this node is authorised and can reach its peers.
	Signed bool `json:"signed"`
	// Trusted: this node's lock key may sign other nodes.
	Trusted bool `json:"trusted"`
	// "tlpub:…" — what a signer passes to `tailscale lock add` / `sign`.
	PublicKey string `json:"publicKey,omitempty"`
	// "nodekey:…" — this node's current node key.
	NodeKey string `json:"nodeKey,omitempty"`
	// Machines cut off until someone signs them.
	Pending []lockPeer `json:"pending,omitempty"`
}

const lockSignTimeout = 15 * time.Second

type lockSignEvent struct {
	Ev      string `json:"ev"`
	ID      string `json:"id"`
	NodeKey string `json:"nodeKey"`
	OK      bool   `json:"ok"`
	Error   string `json:"error,omitempty"`
}

// lockInitEvent answers a lock-init. The disablement secrets are the only
// way to switch the lock off again; they exist in this event and nowhere
// else, so the parent must hand them to the user once and never keep them.
type lockInitEvent struct {
	Ev                 string   `json:"ev"`
	ID                 string   `json:"id"`
	OK                 bool     `json:"ok"`
	Error              string   `json:"error,omitempty"`
	DisablementSecrets []string `json:"disablementSecrets,omitempty"`
}

const (
	lockInitTimeout = 60 * time.Second
	// Like `tailscale lock init --gen-disablements 1`.
	lockDisablements = 1
	// More trusted keys than any lab needs; bounds what the parent can send.
	lockMaxTrustedKeys = 16
)

// lockAllowed reports whether the coordination server lets this node
// initialise the lock (it only sends the capability when an administrator
// switched the feature on for the tailnet).
func lockAllowed(st *ipnstate.Status) bool {
	return st != nil && st.Self != nil && st.Self.HasCap(tailcfg.CapabilityTailnetLock)
}

// lockSnapshot turns the node's lock status into what the parent sees.
// nil when there is nothing to report.
func lockSnapshot(st *ipnstate.TailnetLockStatus, allowed bool) *lockStatus {
	if st == nil {
		return nil
	}
	s := &lockStatus{Allowed: allowed, Enabled: st.Enabled, Signed: st.NodeKeySigned}
	if !st.PublicKey.IsZero() {
		if text, err := st.PublicKey.MarshalText(); err == nil {
			s.PublicKey = string(text)
		}
		for _, k := range st.TrustedKeys {
			if k.Key == st.PublicKey {
				s.Trusted = true
				break
			}
		}
	}
	if st.NodeKey != nil {
		if text, err := st.NodeKey.MarshalText(); err == nil {
			s.NodeKey = string(text)
		}
	}
	if !st.Enabled {
		return s
	}
	for _, p := range st.FilteredPeers {
		if p == nil {
			continue
		}
		text, err := p.NodeKey.MarshalText()
		if err != nil {
			continue
		}
		lp := lockPeer{NodeKey: string(text), Name: strings.TrimSuffix(p.Name, "."), IPs: []string{}}
		for _, ip := range p.TailscaleIPs {
			lp.IPs = append(lp.IPs, ip.String())
		}
		s.Pending = append(s.Pending, lp)
	}
	sort.Slice(s.Pending, func(i, j int) bool {
		if s.Pending[i].Name != s.Pending[j].Name {
			return s.Pending[i].Name < s.Pending[j].Name
		}
		return s.Pending[i].NodeKey < s.Pending[j].NodeKey
	})
	return s
}

// lockSign signs one waiting machine. The key must be one the node itself
// currently lists as filtered — never an arbitrary key — and the rotation key
// is left empty, because a peer's own lock key is not visible to other nodes.
func (n *node) lockSign(nodeKey string) {
	ev := lockSignEvent{Ev: "lock-sign", ID: n.id, NodeKey: nodeKey}
	defer func() {
		emit(ev)
		n.refresh(context.Background(), n.port())
	}()

	var nk key.NodePublic
	if err := nk.UnmarshalText([]byte(nodeKey)); err != nil {
		ev.Error = "not a node key"
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), lockSignTimeout)
	defer cancel()
	st, err := n.lc.TailnetLockStatus(ctx)
	if err != nil {
		ev.Error = err.Error()
		return
	}
	waiting := false
	if st.Enabled {
		for _, p := range st.FilteredPeers {
			if p != nil && p.NodeKey == nk {
				waiting = true
				break
			}
		}
	}
	if !waiting {
		ev.Error = "that machine is not waiting for approval"
		return
	}
	if err := n.lc.TailnetLockSign(ctx, nk, nil); err != nil {
		ev.Error = err.Error()
		return
	}
	ev.OK = true
}

// lockInitKeys builds the initially trusted keys: this node's own lock key
// (the tailnet refuses a genesis that does not trust its sender) and any
// other signers' "tlpub:…" keys, one vote each, duplicates dropped.
func lockInitKeys(self key.NLPublic, others []string) ([]tka.Key, error) {
	if self.IsZero() {
		return nil, errors.New("this node has no lock key yet")
	}
	if len(others)+1 > lockMaxTrustedKeys {
		return nil, fmt.Errorf("at most %d trusted keys", lockMaxTrustedKeys)
	}
	keys := []tka.Key{{Kind: tka.Key25519, Public: self.Verifier(), Votes: 1}}
	seen := map[key.NLPublic]bool{self: true}
	for _, text := range others {
		var k key.NLPublic
		if err := k.UnmarshalText([]byte(strings.TrimSpace(text))); err != nil {
			return nil, fmt.Errorf("not a lock key: %q", text)
		}
		if seen[k] {
			continue
		}
		seen[k] = true
		keys = append(keys, tka.Key{Kind: tka.Key25519, Public: k.Verifier(), Votes: 1})
	}
	return keys, nil
}

// lockInit makes this node the tailnet's key authority, exactly as
// `tailscale lock init --gen-disablements 1 <self> <others…>` does: the
// genesis goes to the coordination server, which answers with every machine
// on the tailnet, all of which are signed before the lock goes live.
func (n *node) lockInit(others []string) {
	ev := lockInitEvent{Ev: "lock-init", ID: n.id}
	defer func() {
		emit(ev)
		n.refresh(context.Background(), n.port())
	}()

	ctx, cancel := context.WithTimeout(context.Background(), lockInitTimeout)
	defer cancel()

	st, err := n.lc.Status(ctx)
	if err != nil {
		ev.Error = err.Error()
		return
	}
	if !lockAllowed(st) {
		ev.Error = "Tailnet Lock is not switched on for this mesh on the coordination server"
		return
	}
	lock, err := n.lc.TailnetLockStatus(ctx)
	if err != nil {
		ev.Error = err.Error()
		return
	}
	if lock.Enabled {
		ev.Error = "Tailnet Lock is already set up for this mesh"
		return
	}
	keys, err := lockInitKeys(lock.PublicKey, others)
	if err != nil {
		ev.Error = err.Error()
		return
	}

	var secrets []string
	var values [][]byte
	for range lockDisablements {
		var secret [32]byte
		if _, err := rand.Read(secret[:]); err != nil {
			ev.Error = err.Error()
			return
		}
		secrets = append(secrets, fmt.Sprintf("disablement-secret:%X", secret[:]))
		values = append(values, tka.DisablementKDF(secret[:]))
	}

	if _, err := n.lc.TailnetLockInit(ctx, keys, values, nil); err != nil {
		ev.Error = err.Error()
		return
	}
	ev.OK = true
	ev.DisablementSecrets = secrets
}
