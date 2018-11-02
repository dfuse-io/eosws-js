import * as path from "path"
import dotenv from "dotenv"
import WebSocket from "ws"

import { connectionStore, SocketStateStatus } from "./config/connection-store"
import { log } from "./config/logger"

dotenv.config({ path: path.join(__dirname, "..", ".env") })

export let DFUSE_IO_ENDPOINT = process.env.DFUSE_IO_ENDPOINT
export const DFUSE_IO_API_KEY = process.env.DFUSE_IO_API_KEY

if (!DFUSE_IO_ENDPOINT) {
  DFUSE_IO_ENDPOINT = "mainnet.eos.dfuse.io"
}

if (!DFUSE_IO_API_KEY) {
  throw new Error("missing DFUSE_IO_API_KEY in your environment variables")
}

const wsUrl = `wss://${DFUSE_IO_ENDPOINT}/v1/stream?token=${DFUSE_IO_API_KEY}`

const origin = "https://github.com/dfuse-io/eosws-js"
export const ws = new WebSocket(wsUrl, {
  origin
} as any)

ws.onmessage = (message: any) => {
  connectionStore.onSocketMessage(message)
}

// @ts-ignore
ws.onerror = (error: Error, ...args: any[]) => {
  log.info("Socket received error event.", args)
  connectionStore.socketState.status = SocketStateStatus.DOWN
  connectionStore.socketState.error = error
}

ws.onclose = (...args: any[]) => {
  log.info("Socket received close event.", args)
  connectionStore.socketState.status = SocketStateStatus.DOWN
}
