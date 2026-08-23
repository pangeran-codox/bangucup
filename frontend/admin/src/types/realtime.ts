export interface InterfaceTraffic {
  name: string
  rx_bps: number
  tx_bps: number
  rx_pps: number
  tx_pps: number
}

export interface RouterSnapshot {
  router_id: number
  router_name: string
  timestamp: string
  status: 'online' | 'offline'
  interfaces: InterfaceTraffic[]
}

// Pesan dari browser → gateway
export interface WsSubscribeMsg {
  type: 'subscribe' | 'unsubscribe'
  router_ids: number[]
}
