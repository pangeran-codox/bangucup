package mikrotik

import (
	"fmt"
	"time"

	ros "github.com/go-routeros/routeros/v3"
)

// Router holds connection info for a single MikroTik device.
type Router struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Host     string `json:"host"`
	APIPort  int    `json:"api_port"`
	Username string `json:"username"`
	Password string `json:"password"`
}

// InterfaceTraffic adalah snapshot traffic satu interface.
type InterfaceTraffic struct {
	Name             string `json:"name"`
	RxBitsPerSecond  int64  `json:"rx_bps"`
	TxBitsPerSecond  int64  `json:"tx_bps"`
	RxPacketsPerSec  int64  `json:"rx_pps"`
	TxPacketsPerSec  int64  `json:"tx_pps"`
}

// RouterSnapshot adalah seluruh data yang dikumpulkan dari satu router.
type RouterSnapshot struct {
	RouterID   int                `json:"router_id"`
	RouterName string             `json:"router_name"`
	Timestamp  time.Time          `json:"timestamp"`
	Status     string             `json:"status"` // "online" | "offline"
	Interfaces []InterfaceTraffic `json:"interfaces"`
}

// Collect connects to a MikroTik router, fetches interface traffic, and returns a snapshot.
func Collect(r Router) RouterSnapshot {
	snap := RouterSnapshot{
		RouterID:   r.ID,
		RouterName: r.Name,
		Timestamp:  time.Now().UTC(),
		Status:     "offline",
		Interfaces: []InterfaceTraffic{},
	}

	addr := fmt.Sprintf("%s:%d", r.Host, r.APIPort)
	client, err := ros.DialTimeout(addr, r.Username, r.Password, 5*time.Second)
	if err != nil {
		fmt.Printf("[mikrotik] dial %s failed: %v\n", addr, err)
		return snap
	}
	defer client.Close()

	snap.Status = "online"

	// Ambil daftar interface
	ifaceReply, err := client.Run("/interface/print", "=.proplist=name")
	if err != nil || len(ifaceReply.Re) == 0 {
		return snap
	}

	names := make([]string, 0, len(ifaceReply.Re))
	for _, re := range ifaceReply.Re {
		if name := re.Map["name"]; name != "" {
			names = append(names, name)
		}
	}
	if len(names) == 0 {
		return snap
	}

	// Gabungkan nama interface untuk monitor-traffic
	ifaces := names[0]
	for _, n := range names[1:] {
		ifaces += "," + n
	}

	// Monitor traffic snapshot (sekali)
	trafficReply, err := client.Run(
		"/interface/monitor-traffic",
		"=interface="+ifaces,
		"=once=",
	)
	if err != nil {
		return snap
	}

	for _, re := range trafficReply.Re {
		snap.Interfaces = append(snap.Interfaces, InterfaceTraffic{
			Name:            re.Map["name"],
			RxBitsPerSecond: parseInt64(re.Map["rx-bits-per-second"]),
			TxBitsPerSecond: parseInt64(re.Map["tx-bits-per-second"]),
			RxPacketsPerSec: parseInt64(re.Map["rx-packets-per-second"]),
			TxPacketsPerSec: parseInt64(re.Map["tx-packets-per-second"]),
		})
	}

	return snap
}

func parseInt64(s string) int64 {
	var v int64
	fmt.Sscanf(s, "%d", &v)
	return v
}
