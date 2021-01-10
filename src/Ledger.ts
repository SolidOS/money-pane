import { IndexedFormula, namedNode, NamedNode } from 'rdflib'
import { ns } from 'solid-ui'

ns.halftrade = (label: string) => namedNode(`https://ledgerloops.com/vocab/halftrade#${label}`)
ns.money = (tag: string) => namedNode(`https://example.com/#${tag}`) // @@TBD

export const HALF_TRADE_FIELDS = [
  'date',
  'from',
  'to',
  'amount',
  'unit',
  'impliedBy',
  'description'
];

export class HalfTrade {
  uri?: NamedNode
  expenseCategory?: string
  date: Date
  from: string
  to: string
  halfTradeId: string
  amount: number
  unit: string
  description: string
  constructor(uri: NamedNode, kb: IndexedFormula) {
    this.uri = uri
    HALF_TRADE_FIELDS.forEach((field: string) => {
      const pred = ns.halftrade(field)
      console.log('Finding', uri, pred, uri.doc())
      this[field]
      const node = kb.any(uri, pred, undefined, uri.doc())
      if (node) {
        this[field] = node.value
      }
    })
    console.log('constructed', this)
  }
}

export class Shop {
  id: string
  name: string
  city: string
  mcc: number
  constructor(values: { name: string, city: string, mcc: number }) {
    this.name = values.name
    this.city = values.city
    this.mcc = values.mcc
    this.id = this.generateId(values)
  }
  generateId(values: { name: string, city: string, mcc: number }) {
    return `${values.name.replace(' ', '_')}:${values.city.replace(' ', '_')}:${values.mcc}`
  }
}

export class SettledPurchase {
  date: Date
  shopId: string
  amount: number
  purchaseId: string
  constructor(values: { date: Date, shopId: string, amount: number, settlementTransactionId: string}) {
    this.date = values.date
    this.shopId = values.shopId
    this.amount = values.amount
    this.purchaseId = `purchase-settled-by-${values.settlementTransactionId}`
  }
}