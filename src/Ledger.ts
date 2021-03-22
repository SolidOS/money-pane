export { WorldLedgerMutation } from './ledger/WorldLedgerMutation'
export { AccountHistoryChunk } from './ledger/AccountHistoryChunk'
export { MultiAccountView } from './ledger/MultiAccountView'

export class Balance {
  amount: number // in the 'obvious' (FIXME) direction, e.g. what the bank owes its customer.
  unit: string // e.g. the string 'EUR' or 
  constructor(options: { amount: number, unit: string }) {
    this.amount = options.amount;
    this.unit = options.unit;
  }
}

export class ImportDetails {
  fileId: string
  parserName: string
  parserVersion: string
  firstAffected: number
  lastAffected: number
  constructor (options: {
    fileId: string
    parserName: string
    parserVersion: string
    firstAffected: number
    lastAffected: number
  }) {
    this.fileId = options.fileId
    this.parserName = options.parserName
    this.parserVersion = options.parserVersion
    this.firstAffected = options.firstAffected
    this.lastAffected = options.lastAffected
  }
}

