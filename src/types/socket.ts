import { InboundMessage } from "../message/inbound"
import { OutboundMessage } from "../message/outbound"

export interface Socket {
  isConnected: boolean

  connect(listener: SocketMessageListener): Promise<void>
  disconnect(): Promise<void>

  send<T>(message: OutboundMessage<T>): Promise<boolean>

  setApiToken(apiToken: string): void
}

export type SocketMessageListener = (message: InboundMessage<any>) => void

export type WebSocket = any
