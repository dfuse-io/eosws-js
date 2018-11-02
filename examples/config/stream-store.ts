import { SocketErrorMessage, SocketInboundMessage, StreamHandler } from "@dfuse/eosws-js"

export class StreamStore {
  protected logger: any = undefined
  private activeStreams: { [key: string]: StreamHandler } = {}

  constructor(logger?: any) {
    this.logger = logger
  }

  logError() {
    if (this.logger) {
      this.logger.error(
        "An active subscription already exist with this id, this should never happen."
      )
    }
  }

  logWarn(id: string) {
    if (this.logger) {
      this.logger.warn("No stream handler active for id [%s].", id)
    }
  }

  addStreamHandler(handler: StreamHandler) {
    if (this.activeStreams[handler.id]) {
      this.logError()
    }

    this.activeStreams[handler.id] = handler
  }

  removeStreamHandler(id: string) {
    delete this.activeStreams[id]
  }

  getStreamHandler(id: string): StreamHandler | undefined {
    return this.activeStreams[id]
  }

  getStreamHandlers(): StreamHandler[] {
    return Object.keys(this.activeStreams).map((key) => this.activeStreams[key])
  }

  notifyStreamHandlers(message: SocketInboundMessage<any> | SocketErrorMessage) {
    const handlers = this.getStreamHandlers()
    handlers.forEach((handler: StreamHandler) => handler.onSocketMessage(message as any))
  }

  notifyStreamHandler(
    requestId: string,
    message: SocketInboundMessage<any> | SocketErrorMessage
  ): boolean {
    const handler = this.getStreamHandler(requestId)
    if (handler === undefined) {
      return false
    }
    handler.onSocketMessage(message as any)
    return true
  }

  resubscribeStreamHandlers() {
    const handlers = this.getStreamHandlers()
    handlers.forEach((handler) => handler.resubscribe())
  }

  subscribeToStream<D>(handler: StreamHandler) {
    this.addStreamHandler(handler)

    // Async processing
    handler.subscribe()

    return handler.id
  }

  unsubscribeFromStream(id: string) {
    const handler = this.getStreamHandler(id)
    if (handler === undefined) {
      this.logWarn(id)
      return
    }

    this.removeStreamHandler(id)

    // Async processing
    handler.unsubscribe()
  }
}

export const streamStore = new StreamStore()
