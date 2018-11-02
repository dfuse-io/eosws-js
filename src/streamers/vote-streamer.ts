import { VoteTally } from "../types/vote"

import { StreamHandler, SocketOutboundMessageType, SocketInboundMessageType } from "./common"

export class VoteTallyStreamHandler extends StreamHandler {
  constructor(
    senderFunction: (args: any, args2: any) => any,
    callbackFunction: (data: any) => any,
    logger?: any
  ) {
    super(
      { type: SocketOutboundMessageType.GET_VOTE_TALLY },
      senderFunction,
      callbackFunction,
      logger
    )

    this.handles({
      [SocketInboundMessageType.VOTE_TALLY]: this.onVoteTally
    })
  }

  onVoteTally = async (voteTally: VoteTally) => {
    this.logger.info("Handling vote tally message.", voteTally)
    this.callbackFunction(voteTally)
  }
}
