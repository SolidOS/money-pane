export type HalfTrade = {
  date: Date
  fromId: string
  toId: string
  halfTradeId: string
  amount: number
  unit: string
  description: string
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