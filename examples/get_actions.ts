/* tslint:disable no-console */
import { ws } from "./config"
import { get_actions, parse_actions } from "@dfuse/eosws-js"

ws.onopen = () => {
  console.log("Subscribing to `get_actions` stream")
  ws.send(get_actions({ account: "eosio.token", action_name: "transfer" }))
}

ws.onmessage = (message: any) => {
  const actions = parse_actions(message.data)

  console.log("ACTIONS:", actions)
}
