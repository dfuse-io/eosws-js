import { observable } from "mobx"
import { SocketOutboundMessage } from "../../src"
import { retryUntilStrategy } from "./rxs"
import { streamStore } from "./stream-store"
import { log } from "./logger"
import { SocketConnectionDownError } from "./socket-connection-down-error"

export interface SocketConnection {
  handle: WebSocket
  dispose: () => void
}

export interface SocketState {
  status: SocketStateStatus
  error: Error | null
}

export enum SocketStateStatus {
  UP,
  DOWN
}

export class ConnectionStore {
  hasConnectedAtLeastOnce = false

  socketConnection?: SocketConnection = undefined
  @observable
  socketState: SocketState = { status: SocketStateStatus.DOWN, error: null }
  sendMessage = async (
    message: SocketOutboundMessage<any>,
    swallowException: boolean = false
  ): Promise<any> => {
    const worker = () => {
      return this.sendMessageWorker(message)
    }
    const onRetry = () => log.debug("Retrying re-send of message.", message)
    const onFailure = () => log.info("Unable to deliver message through web socket.", message)

    try {
      await retryUntilStrategy(worker, onRetry, onFailure).toPromise()
    } catch (error) {
      if (!swallowException) {
        throw error
      }

      log.info("Unable to deliver message to socket and error was swallowed.", message, error)
      return Promise.resolve()
    }
  }

  sendMessageWorker = async (message: SocketOutboundMessage<any>): Promise<any> => {
    if (this.socketConnection === undefined) {
      throw new SocketConnectionDownError()
    }

    log.debug("Sending message through web socket.", message)
    this.socketConnection!.handle.send(JSON.stringify(message))
  }

  onSocketConnected = () => {
    this.socketState.status = SocketStateStatus.UP
    this.socketState.error = null

    if (this.hasConnectedAtLeastOnce) {
      streamStore.resubscribeStreamHandlers()
    }

    this.hasConnectedAtLeastOnce = true
  }

  onSocketMessage = (rawMessage: MessageEvent) => {
    const message = parseMessage(rawMessage)
    if (message.req_id) {
      const didNotify = streamStore.notifyStreamHandler(message.req_id, message)
      if (didNotify) {
        return
      }
    }

    streamStore.notifyStreamHandlers(message)
  }
}

export const connectionStore = new ConnectionStore()

function parseMessage(message: MessageEvent): any {
  // FIXME: Deal with JSON parsing error
  return JSON.parse(message.data)
}
