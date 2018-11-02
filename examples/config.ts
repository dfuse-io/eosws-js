import * as path from "path"
import dotenv from "dotenv"
import WebSocket from "ws"

import { ConnectionStore, SocketStateStatus } from "./config/connection-store"
import { log } from "@dfuse/eosws-js"

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
const wsConnection = new WebSocket(wsUrl, {
  origin
} as any)

wsConnection.onmessage = (message: any) => {
  console.log("on message: ", message)
  connectionStore.onSocketMessage(message)
}

// @ts-ignore
wsConnection.onerror = (error: Error, ...args: any[]) => {
  connectionStore.socketState.status = SocketStateStatus.DOWN
  connectionStore.socketState.error = error
}

wsConnection.onclose = (...args: any[]) => {
  connectionStore.socketState.status = SocketStateStatus.DOWN
}

export const connectionStore = new ConnectionStore()
connectionStore.socketConnection = { handle: wsConnection }

export const ws = wsConnection
