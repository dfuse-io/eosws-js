import { VoteTally } from "../types/vote"
import { voteStore } from "../stores"
import {
  StreamHandler,
  SocketOutboundMessageType,
  SocketInboundMessageType,
  SubscriptionMessage
} from "./common"

export class VoteTallyStreamHandler extends StreamHandler {
  constructor(_: SubscriptionMessage, senderFunction: (args: any, args2: any) => any, logger: any) {
    super({ type: SocketOutboundMessageType.GET_VOTE_TALLY }, senderFunction, logger)

    this.handles({
      [SocketInboundMessageType.VOTE_TALLY]: this.onVoteTally
    })
  }

  onVoteTally = async (voteTally: VoteTally) => {
    this.logger.info("Handling vote tally message.", voteTally)
    voteStore.update(voteTally)
  }
}
