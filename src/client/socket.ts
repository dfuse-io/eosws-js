import debugFactory, { IDebugger } from "debug"

import { OutboundMessage } from "../message/outbound"
import { InboundMessage, InboundMessageType } from "../message/inbound"
import { DfuseError } from "../types/error"
import { WebSocket, Socket, SocketMessageListener } from "../types/socket"

export interface SocketOptions {
  id?: string
  autoReconnect?: boolean
  reconnectDelayInMs?: number
  keepAlive?: boolean
  keepAliveIntervalInMs?: number
  webSocket?: WebSocket

  onInvalidMessage?: (message: object) => void
  onReconnect?: () => void
  onError?: (message: object) => void
  onClose?: (message: object) => void
}

export function createSocket(url: string, options: SocketOptions = {}): Socket {
  return new DefaultSocket(url, {
    id: "",
    autoReconnect: true,
    reconnectDelayInMs: DEFAULT_RECONNECT_DELAY_IN_MS,
    keepAlive: true,
    keepAliveIntervalInMs: DEFAULT_KEEP_ALIVE_INTERVAL_IN_MS,
    webSocket: inferWebSocket(options.webSocket),
    ...options
  })
}

function inferWebSocket(webSocket?: WebSocket): WebSocket {
  const debug = debugFactory("dfuse:socket")

  if (webSocket !== undefined) {
    debug("Using user provided `webSocket` option.")
    return webSocket
  }

  // If we are in a Browser environment and `WebSocket` is available, use it
  if (typeof window !== "undefined" && (window as any).WebSocket != null) {
    debug("Using `WebSocket` global value found on 'window' variable (Browser environment).")
    return (window as any).WebSocket
  }

  // If we are in a Node.js like environment and `WebSocket` is available, use it
  if (typeof global !== "undefined" && (global as any).WebSocket != null) {
    debug("Using `WebSocket` global value found on 'global' variable (Node.js environment).")
    return (global as any).WebSocket
  }

  // Otherwise, throw an exception
  const messages = [
    "You did not provide a `webSocket` option and we were not able find a `WebSocket` object in",
    "the global scope to create use.",
    "",
    "You are most likely in a Node.js environment where a global `WebSocket` is not available by default.",
    "To resolve the issue, either pass a compatible `webSocket` option or globally defined a `global.WebSocket`",
    "variable pointing to a compatible `WebSocket` client.",
    "",
    "We invite you to read our documentation to learn more about this problem."
  ]

  throw new DfuseError(messages.join("\n"))
}

const noop = () => {
  return
}

type Resolver<T> = (value?: T | PromiseLike<T>) => void
type Rejecter = (reason?: any) => void

const DEFAULT_KEEP_ALIVE_INTERVAL_IN_MS = 30000 // 30s
const DEFAULT_RECONNECT_DELAY_IN_MS = 5000 // 5s

class DefaultSocket implements Socket {
  private url: string
  private apiToken?: string
  private options: SocketOptions

  public isConnected: boolean = false
  public socket?: WebSocket

  private debug: IDebugger
  private listener?: SocketMessageListener
  private connectionPromise?: Promise<void>
  private intervalHandler?: any

  public constructor(url: string, options: SocketOptions) {
    this.url = url
    this.options = options

    this.debug = debugFactory("dfuse:socket" + (options.id !== "" ? `:${options.id}` : ""))
  }

  public setApiToken(apiToken: string): void {
    this.debug("Socket API token updated to %s.", apiToken)
    this.apiToken = apiToken
  }

  public async connect(listener: SocketMessageListener): Promise<void> {
    this.debug("About to connect to remote endpoint.")
    if (this.connectionPromise !== undefined) {
      return this.connectionPromise
    }

    this.listener = listener
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      this.debug("Connection promise started, creating and opening socket.")
      if (this.isConnected) {
        return
      }

      return this.createAnOpenSocket(
        this.onSocketConnectOpenFactory(resolve),
        this.onSocketErrorFactory(reject)
      ).then((socket: any) => {
        this.socket = socket
        return Promise.resolve(socket)
      })
    })

    this.debug("Connection to remote endpoint in-progress, returning promise to caller.")
    return this.connectionPromise
  }

  public async disconnect(): Promise<void> {
    this.debug("About to disconnect from remote endpoint.")
    this.listener = undefined

    if (this.socket !== undefined && !this.isConnected) {
      this.debug("Socket not closed, closing it.")
      this.socket.close()
    }

    this.debug("Performing disconnection clean up.")
    this.cleanSocket()
    this.isConnected = false
  }

  public async send<T>(message: OutboundMessage<T>): Promise<boolean> {
    if (!this.isConnected) {
      this.debug("Not connected, re-connecting prior sending message.")
      await this.reconnect()
    }

    if (!this.isConnected) {
      this.debug("Socket not connected, unable to send message correctly.")
      return false
    }

    this.debug("Sending message %O through socket.", message)
    this.socket!.send(JSON.stringify(message))
    return true
  }

  private async createAnOpenSocket(
    onSocketOpen: () => void,
    onSocketError: (event: Event) => void
  ): Promise<WebSocket> {
    const url = this.buildUrl()

    this.debug("Starting connection handshake with remote url %s.", url)
    const socket: WebSocket = new this.options.webSocket(url)

    socket.onopen = onSocketOpen
    socket.onerror = onSocketError
    socket.onclose = this.onSocketClose
    socket.onmessage = this.onSocketMessage

    return socket
  }

  private buildUrl(): string {
    if (this.apiToken === undefined) {
      // FIXME: Shall we throw an exception instead?
      return this.url
    }

    // FIXME: Decompose url, add query param api token if available, then re-compose url!
    if (this.url.includes("?")) {
      return `${this.url}&token=${this.apiToken}`
    }

    return `${this.url}?token=${this.apiToken}`
  }

  private onSocketConnectOpenFactory = (resolve: Resolver<void>) => () => {
    this.debug("Received `onopen` (via connect) notification from socket.")
    this.isConnected = true
    this.connectionPromise = undefined

    if (this.keepAliveOption() === true) {
      this.registerKeepAliveHandler()
    }

    this.debug("Signaling completion of `connect` method in the outer scope.")
    resolve()
  }

  private onSocketReconnectOpenFactory = (resolve: Resolver<boolean>) => () => {
    this.debug("Received `onopen` (via reconnect) notification from socket.")
    this.isConnected = true
    this.connectionPromise = undefined

    if (this.keepAliveOption() === true) {
      this.registerKeepAliveHandler()
    }

    this.debug("Signaling completion of `reconnect` method in the outer scope.")
    resolve(true)

    this.debug("Sending a `onReconnect` notification to client consumer.")
    this.onReconnect()
  }

  private onSocketErrorFactory = (reject: Rejecter) => (event: Event) => {
    this.debug("Received `onerror` notification from socket.")
    this.isConnected = false
    this.connectionPromise = undefined

    this.cleanSocket()

    this.debug("Signaling rejection of connection in the outer scope.")
    reject(event)

    this.debug("Sending an `onError` notification to client consumer.")
    this.onError(event)
  }

  private onSocketClose = (event: CloseEvent) => {
    this.debug("Received `onclose` notification from socket.")
    this.isConnected = false
    this.connectionPromise = undefined

    this.cleanSocket()

    this.debug("Sending a `onClose` notification to client consumer.")
    this.onClose(event)

    if (event.code !== 1000 && event.code !== 1005) {
      this.debug("Socket has close abnormally, trying to re-connect to socket.")
      this.reconnect()
    }
  }

  private onSocketMessage = (event: MessageEvent) => {
    let payload: any
    try {
      payload = JSON.parse(event.data) as { [key: string]: any }
    } catch (error) {
      this.debug("Received a non JSON message, are you sure you are talking to dfuse API?")
      return
    }

    const type = payload.type
    if (!this.canHandleType(type)) {
      this.debug(
        "Sending an `onInvalidMessage` notification to client consumer for type [%s].",
        type
      )
      this.onInvalidMessage(payload)
      return
    }

    if (this.listener) {
      this.listener(payload as InboundMessage<any>)
    }
  }

  private canHandleType(type: string) {
    const actualType = (type || "").toLowerCase()
    const validTypes = Object.keys(InboundMessageType).map((value) => value.toLowerCase())

    // We know that in the Enum, keys are the same as the type values, so this works
    return validTypes.indexOf(actualType) > -1
  }

  private registerKeepAliveHandler() {
    const keepAliveInterval =
      this.options.keepAliveIntervalInMs || DEFAULT_KEEP_ALIVE_INTERVAL_IN_MS

    this.debug("Unregistering keep alive interval")
    this.intervalHandler = setInterval(() => {
      if (!this.isConnected || this.socket === undefined) {
        return
      }

      this.debug("Sending keep alive pong through socket.")
      this.socket.send(JSON.stringify({ type: "pong" }))
    }, keepAliveInterval)
  }

  private unregisterKeepAliveHandler() {
    if (this.intervalHandler === undefined) {
      return
    }

    this.debug("Unregistering keep alive interval")
    clearInterval(this.intervalHandler)
    this.intervalHandler = undefined
  }

  private async reconnect(): Promise<boolean> {
    if (this.connectionPromise) {
      try {
        this.debug("Awaiting actual connection to complete.")
        await this.connectionPromise
        return true
      } catch (error) {
        this.debug("Original connection did not succeed, continuing re-connection process.")
      }
    }

    if (!this.options.autoReconnect) {
      this.debug("Not re-connecting because client consumer auto reconnect option is falsy.")
      return false
    }

    let reconnectDelay = this.options.reconnectDelayInMs
    if (reconnectDelay === undefined) {
      reconnectDelay = DEFAULT_RECONNECT_DELAY_IN_MS
    }

    return new Promise<boolean>((resolve, reject) => {
      setTimeout(() => {
        this.socket = this.createAnOpenSocket(
          this.onSocketReconnectOpenFactory(resolve),
          this.onSocketErrorFactory(reject)
        )
      }, reconnectDelay)
    })
  }

  private cleanSocket() {
    if (this.intervalHandler !== undefined) {
      this.unregisterKeepAliveHandler()
    }

    if (this.socket === undefined) {
      return
    }

    this.socket.onopen = noop
    this.socket.onclose = noop
    this.socket.onerror = noop
    this.socket.onmessage = noop
    this.socket = undefined
  }

  private onInvalidMessage(message: object) {
    ;(this.options.onInvalidMessage || noop)(message)
  }

  private onReconnect() {
    ;(this.options.onReconnect || noop)()
  }

  private onClose(message: any) {
    ;(this.options.onClose || noop)(message)
  }

  private onError(message: any) {
    ;(this.options.onError || noop)(message)
  }

  private keepAliveOption(): boolean {
    return this.options.keepAlive === undefined ? true : this.options.keepAlive
  }
}
