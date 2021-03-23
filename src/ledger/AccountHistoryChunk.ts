import { WorldLedgerMutation, Balance, ImportDetails } from "../Ledger"

export class AccountHistoryChunk {
  account: string // e.g. iban:NL08INGB0000000555
  startDate: Date
  endDate: Date
  mutations: WorldLedgerMutation[] // ordered
  startBalance?: Balance
  importedFrom: ImportDetails[]
  constructor (options: {
    account: string,
    startDate: Date,
    endDate: Date,
    mutations: WorldLedgerMutation[],
    startBalance?: Balance,
    importedFrom: ImportDetails[]
  }) {
    this.account = options.account
    this.startBalance = options.startBalance
    this.mutations = options.mutations
    this.startDate = options.startDate
    this.endDate = options.endDate
    this.importedFrom = options.importedFrom
  }
  restrictedTo(startDate: Date, endDate: Date): AccountHistoryChunk | null {
    if ((startDate > this.endDate) || (endDate < this.startDate)) {
      console.log('restricting to those dates leaves nothing');
      return null;
    }
    let balance: number
    let unit: string
    let startIndex: number
    let endIndex: number
    if (this.startBalance) {
      balance = this.startBalance.amount
      unit = this.startBalance.unit
    }
    for (let i = 0; i < this.mutations.length && this.mutations[i].date < endDate; i++) {
      if (this.mutations[i].date < startDate && balance !== undefined) {
        balance += this.mutations[i].amount
      }
      if (this.mutations[i].date >= startDate && startIndex === undefined) {
        startIndex = i
      }
      if (this.mutations[i].date <= endDate) {
        endIndex = i
      }
    }
    console.log('restricting', this.startDate, this.endDate, this.mutations.length, startIndex, endIndex + 1, balance, this.startBalance.amount);
    return new AccountHistoryChunk({
      account: this.account,
      startDate,
      endDate,
      mutations: this.mutations.slice(startIndex, endIndex + 1),
      startBalance: { amount: balance, unit },
      importedFrom: this.importedFrom
    })
  }
  splitAt(date: Date): AccountHistoryChunk[] {
    let balance: number
    let splitIndex: number
    if (this.startBalance) {
      balance = this.startBalance.amount
      for (let i = 0; i < this.mutations.length && this.mutations[i].date < date; i++) {
        balance += this.mutations[i].amount
        if (this.mutations[i].date >= date) {
          splitIndex = i
        }
      }
    }
    return [
      new AccountHistoryChunk({
        account: this.account,
        startDate: date, // mutations are allowed >= the startDate
        endDate: this.endDate, // mutations are allowed < the endDate
        mutations: this.mutations.slice(0, splitIndex),
        startBalance: { amount: balance, unit: this.startBalance.unit },
        importedFrom: this.importedFrom
      }),
      new AccountHistoryChunk({
        account: this.account,
        startDate: this.startDate,
        endDate: date,
        mutations: this.mutations.slice(splitIndex),
        startBalance: this.startBalance,
        importedFrom: this.importedFrom
      })
    ]
  }
  getEndBalance() {
    let balance = this.startBalance.amount
    for (let i = 0; i < this.mutations.length; i++) {
      balance += this.mutations[i].amount
    }
    return balance
  }
  prepend (other: AccountHistoryChunk) {
    if (other.startBalance) {
      if (this.startBalance) {
        if (this.startBalance.unit !== other.startBalance.unit) {
          throw new Error ('start balance units don\'t match!')
        }
        const otherEndBalance = other.getEndBalance()
        if (otherEndBalance !== this.startBalance.amount) {
          throw new Error(`other start balance would lead to ${otherEndBalance} instead of ${this.startBalance.amount} at ${this.startDate}`)
        }
      }
      this.startBalance = other.startBalance
    }
    if (this.startDate <= other.startDate) {
      throw new Error('nothing to prepend!')
    }
    if (this.startDate !== other.endDate) {
      throw new Error('prepend not ajacent!')
    }
    this.startDate = other.startDate
    this.mutations = other.mutations.concat(this.mutations)
    this.importedFrom = other.importedFrom.concat(this.importedFrom.map(i => new ImportDetails({
      fileId: i.fileId,
      parserName: i.parserName,
      parserVersion: i.parserVersion,
      firstAffected: i.firstAffected + other.mutations.length,
      lastAffected: i.lastAffected + other.mutations.length,
    })))
  }
  append (other: AccountHistoryChunk) {
    if (other.startBalance) {
      if (this.startBalance) {
        if (this.startBalance.unit !== other.startBalance.unit) {
          throw new Error ('start balance units don\'t match!')
        }
        const thisEndBalance = this.getEndBalance()
        if (thisEndBalance !== other.startBalance.amount) {
          throw new Error(`other start balance would lead to ${thisEndBalance} instead of ${other.startBalance.amount} at ${this.endDate}`)
        }
      }
      this.startBalance = other.startBalance
    }
    if (this.endDate >= other.endDate) {
      throw new Error('nothing to append!')
    }
    if (this.endDate !== other.startDate) {
      throw new Error('prepend not ajacent!')
    }
    this.endDate = other.endDate
    this.mutations = this.mutations.concat(other.mutations)
    this.importedFrom = this.importedFrom.concat(other.importedFrom.map(i => new ImportDetails({
      fileId: i.fileId,
      parserName: i.parserName,
      parserVersion: i.parserVersion,
      firstAffected: i.firstAffected + this.mutations.length,
      lastAffected: i.lastAffected + this.mutations.length,
    })))
  }

  mixIn (other: AccountHistoryChunk) {
    let firstAffected: number = -1
    for(let i = 0; i < this.mutations.length; i++) {
      // console.log('looping through this', this.mutations[i])
      if (this.mutations[i].date < other.startDate) {
        console.log('not overlapping yet', this.mutations[i].date, other.startDate)
        continue
      }
      if (this.mutations[i].date >= other.endDate) {
        break
      }
      if (firstAffected === -1) {
        firstAffected = i
        console.log('aligning mutations', firstAffected)
      }
      if (i + firstAffected >= other.mutations.length) {
        throw new Error('mutations missing at the end of mixIn!')
      }
      this.mutations[i].mixIn(other.mutations[i + firstAffected])
    }
    // console.log('not overlapping anymore')
    this.importedFrom = this.importedFrom.concat(other.importedFrom.map(i => new ImportDetails({
      fileId: i.fileId,
      parserName: i.parserName,
      parserVersion: i.parserVersion,
      firstAffected: i.firstAffected + firstAffected,
      lastAffected: i.lastAffected + firstAffected,
    })))
  }
  addData (other: AccountHistoryChunk) {
    if (other.endDate < this.startDate) {
      throw new Error('other ends before this starts')
    }
    if (other.startDate > this.endDate) {
      throw new Error('other starts after this ends')
    }
    let mixIn = other
    let prepend
    let append
    if (other.startDate < this.startDate) {
      [ prepend, mixIn ] = mixIn.splitAt(this.startDate)
      this.prepend(prepend)
    }
    if (other.endDate > this.endDate) {
      [ mixIn, append ] = mixIn.splitAt(this.endDate)
      this.append(append)
    }
    this.mixIn(mixIn)
  }
}
