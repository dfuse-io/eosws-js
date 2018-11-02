import { observable } from "mobx"
import { GetInfoResp } from "../types/get_info_resp"
import { log } from "../../examples/config/logger"

export class InfoStore {
  @observable
  headBlockId = ""
  @observable
  headBlockNum = 0
  notObservableHeadBlockNum = 0

  @observable
  headBlockProducer = ""
  @observable
  lastIrreversibleBlockNum = 0
  @observable
  lastIrreversibleBlockId = ""

  setBlock(data: GetInfoResp) {
    log.info("setting block in info store")
    if (data.head_block_num > this.headBlockNum) {
      this.headBlockId = data.head_block_id
      this.headBlockNum = data.head_block_num
      this.notObservableHeadBlockNum = data.head_block_num
    }

    if (data.head_block_producer !== this.headBlockProducer) {
      this.headBlockProducer = data.head_block_producer
    }

    if (data.last_irreversible_block_num > this.lastIrreversibleBlockNum) {
      this.lastIrreversibleBlockNum = data.last_irreversible_block_num
      this.lastIrreversibleBlockId = data.last_irreversible_block_id
    }
  }
}
