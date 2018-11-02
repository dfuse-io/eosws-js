import { streamStore } from "./config/stream-store"
import { GetInfoStreamHandler } from "@dfuse/eosws-js"
import { VoteTallyStreamHandler } from "@dfuse/eosws-js"
import { connectionStore } from "./config"

const streamId = streamStore.subscribeToStream(
  new VoteTallyStreamHandler(connectionStore.sendMessage, (data: any) => {
    console.log("processing data")
    console.log(data)
  })
)
