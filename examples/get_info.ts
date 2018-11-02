import { streamStore } from "./config/stream-store"
import { GetInfoStreamHandler } from "../src"
import { connectionStore } from "./config/connection-store"
import { log } from "./config/logger"

const streamId = streamStore.subscribeToStream(
  new GetInfoStreamHandler(connectionStore.sendMessage, log)
)
