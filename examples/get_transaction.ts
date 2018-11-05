/* tslint:disable no-console */
import { ws } from "./config"
import { get_transaction } from "@dfuse/eosws-js"

ws.onopen = () => {
  console.log("Subscribing to `get_transaction` stream")
  ws.send(
    get_transaction("e61775b823d2263f987eeaf39f8bf52b47d50816da36cd9582e27c46c65c4df0", {
      fetch: true
    })
  )
}

ws.onmessage = (message) => {
  console.log(JSON.parse(message.data.toString()).data.lifecycle)
}
