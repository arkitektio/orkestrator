package main

import (
	"net/netip"
	"testing"

	"tailscale.com/ipn/ipnstate"
	"tailscale.com/types/key"
)

func TestLockSnapshot(t *testing.T) {
	ours := key.NewNLPrivate().Public()
	other := key.NewNLPrivate().Public()
	self := key.NewNode().Public()
	waitingB := key.NewNode().Public()
	waitingA := key.NewNode().Public()

	text := func(v interface{ MarshalText() ([]byte, error) }) string {
		b, err := v.MarshalText()
		if err != nil {
			t.Fatal(err)
		}
		return string(b)
	}

	filtered := []*ipnstate.TKAPeer{
		{Name: "bravo.lab.ionscale.net.", NodeKey: waitingB, TailscaleIPs: []netip.Addr{netip.MustParseAddr("100.64.0.9")}},
		nil,
		{Name: "alpha.lab.ionscale.net.", NodeKey: waitingA},
	}

	t.Run("nil", func(t *testing.T) {
		if got := lockSnapshot(nil, false); got != nil {
			t.Fatalf("want nil, got %+v", got)
		}
	})

	t.Run("disabled lists nothing", func(t *testing.T) {
		got := lockSnapshot(&ipnstate.TailnetLockStatus{PublicKey: ours, FilteredPeers: filtered}, true)
		if !got.Allowed || got.Enabled || got.Trusted || len(got.Pending) != 0 {
			t.Fatalf("unexpected %+v", got)
		}
		if got.PublicKey != text(ours) {
			t.Fatalf("public key %q", got.PublicKey)
		}
	})

	t.Run("signed but not a signer", func(t *testing.T) {
		got := lockSnapshot(&ipnstate.TailnetLockStatus{
			Enabled:       true,
			NodeKeySigned: true,
			PublicKey:     ours,
			NodeKey:       &self,
			TrustedKeys:   []ipnstate.TKAKey{{Key: other}},
		}, false)
		if !got.Enabled || !got.Signed || got.Trusted {
			t.Fatalf("unexpected %+v", got)
		}
		if got.NodeKey != text(self) {
			t.Fatalf("node key %q", got.NodeKey)
		}
	})

	t.Run("trusted signer sees waiting machines, sorted", func(t *testing.T) {
		got := lockSnapshot(&ipnstate.TailnetLockStatus{
			Enabled:       true,
			NodeKeySigned: true,
			PublicKey:     ours,
			TrustedKeys:   []ipnstate.TKAKey{{Key: other}, {Key: ours}},
			FilteredPeers: filtered,
		}, false)
		if !got.Trusted {
			t.Fatal("want trusted")
		}
		if len(got.Pending) != 2 {
			t.Fatalf("want 2 pending, got %+v", got.Pending)
		}
		if got.Pending[0].Name != "alpha.lab.ionscale.net" || got.Pending[0].NodeKey != text(waitingA) {
			t.Fatalf("first %+v", got.Pending[0])
		}
		if got.Pending[1].IPs[0] != "100.64.0.9" {
			t.Fatalf("second %+v", got.Pending[1])
		}
		if got.Pending[0].IPs == nil {
			t.Fatal("ips must be an empty list, not null")
		}
	})
}

func TestLockInitKeys(t *testing.T) {
	self := key.NewNLPrivate().Public()
	other := key.NewNLPrivate().Public()
	otherText, _ := other.MarshalText()
	selfText, _ := self.MarshalText()

	keys, err := lockInitKeys(self, []string{string(otherText), " " + string(otherText) + " ", string(selfText)})
	if err != nil {
		t.Fatal(err)
	}
	if len(keys) != 2 {
		t.Fatalf("want self + one other, got %d", len(keys))
	}
	if string(keys[0].Public) != string(self.Verifier()) || keys[0].Votes != 1 {
		t.Fatalf("self key first with one vote, got %+v", keys[0])
	}

	if _, err := lockInitKeys(key.NLPublic{}, nil); err == nil {
		t.Fatal("want an error without our own key")
	}
	if _, err := lockInitKeys(self, []string{"nodekey:abcd"}); err == nil {
		t.Fatal("want an error for a non-lock key")
	}
	many := make([]string, lockMaxTrustedKeys)
	for i := range many {
		many[i] = string(otherText)
	}
	if _, err := lockInitKeys(self, many); err == nil {
		t.Fatal("want an error past the key limit")
	}
}
