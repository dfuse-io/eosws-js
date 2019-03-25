import { ActionTrace, Action } from "./action-trace"
import { DbRow } from "./table-delta"

export interface TransactionData {
  lifecycle: TransactionLifecycle
}

/**
 * Represents a node in the creation tree.
 * first number represents the creation node index
 * second number represents the parent node index (-1 for root)
 * third number represents the action index
 */
export type CreationNode = [number, number, number]

export interface TableOp {
  op: string
  action_idx: number
  payer: string
  path: string
}

export interface TransactionLifecycle {
  id: string
  transaction: Transaction
  transaction_status: string
  execution_trace: TransactionTrace
  execution_block_header: BlockHeader
  dtrxops: DTrxOp[]
  dbops: DBOp[]
  ramops?: RAMOp[]
  tableops?: TableOp[]
  pub_keys: string[]
  creation_tree?: CreationNode[]
  created_by?: ExtDTrxOp
  canceled_by?: ExtDTrxOp
  execution_irreversible: boolean
  creation_irreversible: boolean
  cancelation_irreversible: boolean
}

export interface Transaction {
  expiration: string
  ref_block_num: number
  ref_block_prefix: number
  max_net_usage_words: number
  max_cpu_usage_ms: number
  delay_sec: number
  context_free_actions: Array<Action<any>>
  actions: Array<Action<any>>
  transaction_extensions: any[]
  signatures?: string[]
  context_free_data?: Array<Action<any>>
}

export interface ExtDTrxOp extends DTrxOp {
  src_trx_id: string
  block_num: number
  block_id: string
  block_time: string
}

export interface DTrxOp {
  op: string
  action_idx: number
  sender: string
  sender_id: string
  payer: string
  published_at: string
  delay_until: string
  expiration_at: string
  trx_id: string
  trx?: Transaction
}

export interface DBOp<T = unknown> {
  op: string
  action_idx: number
  account: string
  table: string
  scope: string
  old: DbRow<T>
  new: DbRow<T>
  key: string
}

export interface RAMOp {
  op: string
  action_idx: number
  payer: string
  delta: number
  usage: number
}

export interface TransactionReceipt {
  status: string
  cpu_usage_us: number
  net_usage_words: number
}

export interface TransactionTrace {
  id: string
  block_num: number
  block_time: string
  producer_block_id: string
  receipt: TransactionReceipt
  elapsed: number
  net_usage: number
  scheduled: boolean
  action_traces: Array<ActionTrace<any>>
  failed_dtrx_trace: TransactionTrace
  except: any
}

export interface BlockHeader {
  timestamp: string
  producer: string
  confirmed: number
  previous: string
  transaction_mroot: string
  action_mroot: string
  schedule_version: number
  new_producers: null
  header_extensions: any[]
}
