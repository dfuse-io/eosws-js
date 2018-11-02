import { SocketInboundMessageType, SocketOutboundMessageType } from "./common"
import { StreamHandler } from "./common"
import { infoStore } from "../stores"
import { GetInfoResp } from "../types/get_info_resp"

export class GetInfoStreamHandler extends StreamHandler {
  constructor(senderFunction: (args: any, args2: any) => any, logger: any) {
    super({ type: SocketOutboundMessageType.GET_HEAD_INFO }, senderFunction, logger)

    this.handles({
      [SocketInboundMessageType.GET_HEAD_INFO]: this.onGetInfo
    })
  }

  public onGetInfo = async (payload: GetInfoResp) => {
    infoStore.setBlock(payload)
  }
}
