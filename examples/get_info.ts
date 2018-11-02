import { streamStore } from "./config/stream-store"
import { GetInfoStreamHandler } from "@dfuse/eosws-js"
import { connectionStore } from "./config"

const streamId = streamStore.subscribeToStream(
  new GetInfoStreamHandler(connectionStore.sendMessage, (data: any) => {
    console.log(data)
  })
)
