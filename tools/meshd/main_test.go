package main

import (
	"testing"

	"tailscale.com/ipn"
	"tailscale.com/ipn/ipnstate"
)

func TestSnapshotStates(t *testing.T) {
	cases := map[string]string{
		ipn.NoState.String():          "starting", // not got going yet, not stopped
		ipn.Starting.String():         "starting",
		ipn.NeedsLogin.String():       "needs-login",
		ipn.NeedsMachineAuth.String(): "needs-machine-auth",
		ipn.Running.String():          "running",
		ipn.Stopped.String():          "stopped",
	}
	for backend, want := range cases {
		if got := snapshot("lab", 1, &ipnstate.Status{BackendState: backend}).State; got != want {
			t.Errorf("%s: got %q, want %q", backend, got, want)
		}
	}
}

func TestNodeAtMatchesGeneration(t *testing.T) {
	nodMu.Lock()
	nodes["lab"] = &node{id: "lab", gen: 7}
	nodMu.Unlock()
	t.Cleanup(func() {
		nodMu.Lock()
		delete(nodes, "lab")
		nodMu.Unlock()
	})
	if nodeAt("lab", 7) == nil || nodeAt("lab", 0) == nil {
		t.Fatal("the current generation (or none named) should find the node")
	}
	if nodeAt("lab", 6) != nil {
		t.Fatal("an older generation must not reach the node that replaced it")
	}
	if nodeAt("other", 7) != nil {
		t.Fatal("no node, no answer")
	}
}
