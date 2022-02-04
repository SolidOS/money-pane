const { parseCurrency } = require('./utils.js')

const hours = require('./data/hours.js')
const expenses = require('./data/expenses.js')
const transactions = require('./data/transactions.js')

function toHledgerDate (dateStr) {
  const date = new Date(dateStr)
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  ].join('/')
}

function expense ({ dateStr, amount, vat, description, assetGroup, expenser }) {
  console.log(`${toHledgerDate(dateStr)}  ${description}`)
  console.log(`  assets:${assetGroup}  ${amount}`)
  if (vat) {
    console.log(`  assets:credit:vat  ${vat}`)
  }
  console.log(`  liabilities:expenses:${expenser}  ${(-amount - vat).toFixed(2)}`)
}

function writeOff () {
  // TODO: find out how best to implement this for HLedger
}

function processExpenses (expenser) {
  expenses.forEach(entry => {
    // console.log(entry)
    let normalizedIncl = parseCurrency(entry.incl)
    let normalizedVat = parseCurrency(entry.vat)
    let normalizedExcl = parseCurrency(entry.excl)
    if (typeof normalizedIncl === 'undefined') {
      normalizedIncl = parseCurrency(entry.salary)
    }
    if (typeof normalizedVat === 'undefined') {
      normalizedVat = 0
      normalizedExcl = normalizedIncl
    }
    const arr = [normalizedIncl, normalizedVat, normalizedExcl]
    // console.log({ arr })
    arr.forEach(v => {
      if (typeof v !== 'number') {
        console.log('erroring on:', entry, v)
        throw new Error('not a number!', arr, entry)
      }
      if (isNaN(v)) {
        throw new Error('number but not!', arr, entry)
      }
    })
    const timestamp = new Date(entry.date).getTime()
    if (isNaN(timestamp)) {
      console.log(entry)
      throw new Error('wrong date!', entry)
    }
    if (!entry.expenser || entry.expenser !== expenser) {
      // console.log(entry, 'This expense is from someone else?')
    } else {
      expense({
        dateStr: new Date(entry.date),
        amount: normalizedExcl.toFixed(2),
        vat: normalizedVat.toFixed(2),
        description: entry.description,
        assetGroup: entry.assetGroup,
        expenser
      })
    }

    if (typeof entry.writeOffStart !== 'undefined') {
      writeOff({ amount: normalizedExcl, writeOffStartTimestamp: new Date(entry.writeOffStart).getTime(), writeOffEndTimestamp: new Date(entry.writeOffEnd).getTime() })
    }
    if (entry.writeOffStrategy === 'monthly') {
      writeOff({ amount: normalizedExcl, writeOffStartTimestamp: new Date(entry.date).getTime(), writeOffEndTimestamp: new Date(entry.date).getTime() + 24 * 3600 * 1000 * 30.44 })
    }
    if (entry.writeOffStrategy === 'yearly') {
      writeOff({ amount: normalizedExcl, writeOffStartTimestamp: new Date(entry.date).getTime(), writeOffEndTimestamp: new Date(entry.date).getTime() + 24 * 3600 * 1000 * 365.24 })
    }
  })
}

function processTransactions () {
  // FIXME: the transactions we've been adding have all been bills paid by clients,
  // so we're booking them as decreasing the 'salaries' asset and decreasing our bank debt.
  transactions.forEach(entry => {
    // console.log('Transaction!', entry)
    if (isNaN(entry.amount)) {
      console.log({ entry })
      throw new Error('NaN amount!')
    }
    console.log(`${toHledgerDate(entry.date)}  ${entry.description}`)
    console.log(`  assets:salaries  ${-entry.amount}`)
    console.log(`  liabilities:expenses:Triodos  ${entry.amount}`) // FIXME: But what if we want to book the bank account as an asset?
  })
}

// ...
const expenser = process.argv[2]
// console.log({ expenser })
processExpenses(expenser)
// processTransactions()
