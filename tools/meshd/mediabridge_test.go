package main

import (
	"errors"
	"net"
	"net/netip"
	"strings"
	"testing"
	"time"

	"github.com/pion/turn/v4"
)

func TestMediaBridgeRelaysOnlyToWhatItWasStartedFor(t *testing.T) {
	b := &mediaBridge{allowed: map[netip.Addr]bool{}}
	b.allow([]netip.Addr{netip.MustParseAddr("100.94.134.250")})

	if !b.permits(netip.MustParseAddr("100.94.134.250")) {
		t.Fatal("the media server's mesh address must be permitted")
	}
	// The same address in its IPv4-mapped IPv6 form (as a peer IP may arrive).
	if !b.permits(netip.MustParseAddr("::ffff:100.94.134.250")) {
		t.Fatal("an IPv4-mapped form of the media server's address must be permitted")
	}
	for _, other := range []string{"100.94.134.251", "192.168.1.10", "8.8.8.8"} {
		if b.permits(netip.MustParseAddr(other)) {
			t.Fatalf("%s is not the media server and must be refused", other)
		}
	}
}

func TestMediaBridgeRefusesTCP(t *testing.T) {
	if _, _, err := (meshRelay{}).AllocateConn("tcp", 0); err == nil {
		t.Fatal("a TCP allocation must be refused: live media is UDP")
	}
}

// localRelay allocates on loopback instead of the mesh: the bridge's TURN, auth and allow-list
// are what is tested, not tsnet.
type localRelay struct{}

func (localRelay) Validate() error { return nil }
func (localRelay) AllocatePacketConn(string, int) (net.PacketConn, net.Addr, error) {
	conn, err := net.ListenPacket("udp4", "127.0.0.1:0")
	if err != nil {
		return nil, nil, err
	}
	return conn, conn.LocalAddr(), nil
}
func (localRelay) AllocateConn(string, int) (net.Conn, net.Addr, error) {
	return nil, nil, errors.New("udp only")
}

func dialBridge(t *testing.T, b *mediaBridge, password string) (*turn.Client, net.PacketConn) {
	t.Helper()
	local, err := net.ListenPacket("udp4", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	server := strings.TrimSuffix(strings.TrimPrefix(b.urls[0], "turn:"), "?transport=udp")
	client, err := turn.NewClient(&turn.ClientConfig{
		STUNServerAddr: server,
		TURNServerAddr: server,
		Conn:           local,
		Username:       b.username,
		Password:       password,
		Realm:          mediaBridgeRealm,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := client.Listen(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { client.Close(); _ = local.Close() })
	return client, local
}

func TestMediaBridgeRelaysWithItsCredentialsToAllowedPeersOnly(t *testing.T) {
	b, err := newMediaBridge(localRelay{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = b.server.Close() })
	b.allow([]netip.Addr{netip.MustParseAddr("127.0.0.1")})

	// The media server: a UDP socket on an allowed address.
	media, err := net.ListenPacket("udp4", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = media.Close() })

	client, _ := dialBridge(t, b, b.credential)
	relayed, err := client.Allocate()
	if err != nil {
		t.Fatalf("allocating with the bridge's own credentials: %v", err)
	}
	t.Cleanup(func() { _ = relayed.Close() })

	if _, err := relayed.WriteTo([]byte("frame"), media.LocalAddr()); err != nil {
		t.Fatalf("relaying to the allowed media server: %v", err)
	}
	_ = media.SetReadDeadline(time.Now().Add(3 * time.Second))
	buf := make([]byte, 64)
	n, _, err := media.ReadFrom(buf)
	if err != nil || string(buf[:n]) != "frame" {
		t.Fatalf("the media server did not get the relayed datagram: %q %v", buf[:n], err)
	}

	// Any other machine is refused: the permission is never granted.
	other := &net.UDPAddr{IP: net.ParseIP("127.0.0.2"), Port: 9}
	if _, err := relayed.WriteTo([]byte("frame"), other); err == nil {
		t.Fatal("relaying to a machine the bridge was not started for must fail")
	}
}

func TestMediaBridgeRefusesAWrongPassword(t *testing.T) {
	b, err := newMediaBridge(localRelay{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = b.server.Close() })
	client, _ := dialBridge(t, b, "not-the-password")
	if _, err := client.Allocate(); err == nil {
		t.Fatal("an allocation with a wrong password must be refused")
	}
}
