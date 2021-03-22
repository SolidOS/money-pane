export class WorldLedgerMutation {
  from: string
  to: string
  date: Date
  amount: number
  unit: string
  data: {
    [field: string]: any
  }
  constructor(options: {
    from: string
  to: string
  date: Date
  amount: number
  unit: string
  data: any
  }) {
    this.from = options.from
    this.to = options.to
    this.date = options.date
    this.amount = options.amount
    this.unit = options.unit
    this.data = options.data
  }
  mixIn(other: WorldLedgerMutation) {
    // console.log('mixing in mutation', this, other);
    ['from', 'to', /* 'date', FIXME: https://github.com/solid/money-pane/issues/33 */ 'amount', 'unit'].forEach(field => {

      if (other[field].toString() !== this[field].toString()) {
        console.log('while mixing in mutation:', this, other);

        throw new Error(`${field} doesn\'t match!`)
      }
    })
    Object.keys(other.data).forEach(field => {
      while (this.data[field] && this.data[field].toString() !== other.data[field].toString()) {
        field += '_'
      }
      this.data[field] = other.data[field]
    })
  }
}
