const hours = require('./data/hours.js')

const expenses = require('./data/expenses.js')
const transactions = require('./data/transactions.js')
const { parseCurrency } = require('./utils.js')

// function report(category) {
//   let excl = 0
//   let vat = 0
//   let incl = 0
//   y21q2[category].forEach(entry => {
//     let normalizedIncl = parseCurrency(entry.incl)
//     let normalizedVat = parseCurrency(entry.vat)
//     let normalizedExcl = parseCurrency(entry.excl)
//     // console.log({ entry }, typeof normalizedVat)
//     if (typeof normalizedVat === 'undefined') {
//       // console.log('defining!')
//       normalizedVat = 0
//       normalizedExcl = normalizedIncl
//     }
//     arr = [normalizedIncl, normalizedVat, normalizedExcl]
//     // console.log({ arr })
//     arr.forEach(v => {
//       if (typeof v !== 'number') {
//         throw new Error('not a number!', arr, entry)
//       }
//       if (isNaN(v)) {
//         throw new Error('number but not!', arr, entry)
//       }
//     })
//     incl += normalizedIncl
//     vat += normalizedVat
//     excl += normalizedExcl
//     console.log(entry.description, normalizedIncl, incl)
//   })
//   console.log({ category, incl, excl, vat })
// }

// In Dutch tax law, "voorbelasting" is
// the VAT a company pays when purchasing
// goods or services.
// Each quarter, the company can get this
// money back, which is why it's useful
// to calculate how much VAT was paid each
// quarter. This function is not currently
// being used.
function voorbelasting (quarter, from, to) {
  let vat = 0
  expenses.forEach(entry => {
    if (new Date(entry.date) < new Date(from)) {
      // console.log(`${entry.date} < ${from}`)
      return
    }
    if (new Date(entry.date) >= new Date(to)) {
      // console.log(`${entry.date} >= ${to}`)
      return
    }
    let normalizedVat = parseCurrency(entry.vat)
    if (typeof normalizedVat === 'undefined') {
      normalizedVat = 0
    }
    if (typeof normalizedVat !== 'number') {
      throw new Error('not a number!', normalizedVat)
    }
    if (isNaN(normalizedVat)) {
      throw new Error('number but not!', normalizedVat)
    }
    vat += normalizedVat
    console.log('voorbelasting', quarter, entry.description, normalizedVat, vat)
  })
  console.log('voorbelasting', quarter, vat)
}

// calls `buy` and `writeOff` for each expense
function calcSpent () {
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
    buy({ timestamp, amount: normalizedExcl, vat: normalizedVat })
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

// relevant fields for PKI chart:
// date e.g. '10 feb 2021'
// incl, excl, vat
// for assets:
// * writeOffStart + writeOffEnd | writeOffStrategy 'monthly' | writeOffStrategy 'yearly'
// * assetGroup: ...
// should convert hours to halftrades
//
// # expenses:
// * reduce liquid
// * increase vat Credit
// * increase Assets
// * set up write-off transactions
//
// # salary:
// * reduce liquid
// * increase Assets
// * set up write-off transactions
//
// # hours:
// * increase Credit

const trans = transactions.map(entry => {
  // console.log('Transaction!', entry)
  if (isNaN(entry.amount)) {
    console.log({ entry })
    throw new Error('NaN amount!')
  }
  return {
    timestamp: new Date(entry.date).getTime(),
    liquid: entry.amount,
    assets: 0,
    credit: -entry.amount,
    comment: 'trans'
  }
})

function buy ({ timestamp, amount, vat }) {
  // console.log('buy', { timestamp, amount, vat })
  trans.push({
    timestamp,
    liquid: -amount,
    assets: amount,
    credit: 0,
    comment: 'buy'
  })
  if (vat > 0) {
    trans.push({
      timestamp,
      liquid: -vat,
      assets: 0,
      credit: vat,
      comment: 'vat'
    })
  }
}

function writeOff ({ amount, writeOffStartTimestamp, writeOffEndTimestamp }) {
  // console.log('writeOff', { amount, writeOffStartTimestamp, writeOffEndTimestamp })

  const days = Math.floor((writeOffEndTimestamp - writeOffStartTimestamp) / (24 * 3600 * 1000))
  const installment = amount / days
  for (let i = 0; i < days; i++) {
    trans.push({
      timestamp: writeOffStartTimestamp + i * 24 * 3600 * 1000,
      liquid: 0,
      assets: -installment,
      credit: 0
    })
  }
}

function work ({ timestamp, amount }) {
  trans.push({
    timestamp,
    liquid: 0,
    assets: 0,
    credit: amount
  })
}

function printPKIData (startDate, step) {
  calcSpent()
  const earnedWorking = hours.calcEarned()
  Object.keys(earnedWorking).forEach(timestamp => {
    work({ timestamp, amount: earnedWorking[timestamp] })
  })
  const sorted = trans.sort((a, b) => a.timestamp - b.timestamp)
  // console.log(sorted)
  // const earnedWorking = hours.calcEarned()
  // Object.keys(earnedWorking).forEach(timestamp => {
  //   if (typeof earned[timestamp] === 'undefined') {
  //     earned[timestamp] = { owed: {}, spent: 0 }
  //   }
  //   earned[timestamp].owed.working = earnedWorking[timestamp]
  // })
  // console.log(earnedWorking)
  const seriesLiquid = []
  const seriesLiquidCredit = []
  const seriesLiquidCreditAssets = []
  let liquid = 0
  let assets = 0
  let credit = 0
  // const now = new Date().getTime()
  let nextDate = new Date(startDate).getTime()
  for (let i = 0; i < sorted.length; i++) {
    while (sorted[i].timestamp > nextDate) {
      seriesLiquid.push(liquid)
      seriesLiquidCredit.push(liquid + credit)
      seriesLiquidCreditAssets.push(liquid + credit + assets)
      nextDate += 24 * 3600 * 1000 * step
      // console.log(new Date(nextDate), liquid, assets, credit)
    }
    // if ((sorted[i].timestamp > new Date('1 oct 2021'))
    //     && (sorted[i].timestamp < new Date('31 oct 2021'))) {
    //   console.log(sorted[i]);
    // }
    liquid += sorted[i].liquid
    assets += sorted[i].assets
    credit += sorted[i].credit
  }
  console.log('Books = ', JSON.stringify({ seriesLiquid, seriesLiquidCredit, seriesLiquidCreditAssets, step }))
}

// ...
// report('fromNL')
// report('fromEU')
// report('nonEU')
// report('salaries')

// voorbelasting('y20q3', '1 jul 2020', '1 oct 2020')
// voorbelasting('y20q4', '1 oct 2020', '1 jan 2021')
// voorbelasting('y21q1', '1 jan 2021', '1 apr 2021')
// voorbelasting('y21q2', '1 apr 2021', '1 jul 2021')

printPKIData('30 jun 2020', 5)
