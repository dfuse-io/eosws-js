import { SocketInboundMessageType, SocketOutboundMessageType } from "./common"
import { StreamHandler } from "./common"
import { GetInfoResp } from "../types/get_info_resp"

export class GetInfoStreamHandler extends StreamHandler {
  constructor(
    senderFunction: (args: any, args2: any) => any,
    callbackFn: (data: any) => any,
    logger?: any
  ) {
    super({ type: SocketOutboundMessageType.GET_HEAD_INFO }, senderFunction, callbackFn, logger)

    this.handles({
      [SocketInboundMessageType.GET_HEAD_INFO]: this.onGetInfo
    })
  }

  public onGetInfo = async (payload: GetInfoResp) => {
    this.callbackFunction(payload)
  }
}
