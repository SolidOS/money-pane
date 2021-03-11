const fs = require('fs')
const { parseMt940 } = require('./src/parsers/asnbank-mt940')

// eslint-disable-next-line import/no-absolute-path
const dataRoot = require(process.env.DATA_ROOT)

let converted = []
dataRoot.mt940.forEach(fileName => {
  const fileBuffer = fs.readFileSync(fileName, 'utf8')
  const { fullRecord, theseExpenses } = parseMt940(fileBuffer, dataRoot)
  converted = converted.concat(theseExpenses)
  console.log(`Parsed ${fileName} with ${theseExpenses.length} statements, total now ${converted.length}`)
})

function mccToCategory (mcc, t) {
  // See https://www.citibank.com/tts/solutions/commercial-cards/assets/docs/govt/Merchant-Category-Codes.pdf
  if (dataRoot.mcc[mcc]) {
    return dataRoot.mcc[mcc]
  }
  // console.log('MCC not found', mcc, t)
  return `MCC-${mcc}`
}

function dateToMonth (date) {
  return `${date.getUTCFullYear()}-${('0' + (date.getUTCMonth() + 1)).slice(-2)}`
}
function dateToFactor (date) {
  // console.log('factor 30 / ', date.getUTCDate(), 30 / date.getUTCDate())
  return 30 / date.getUTCDate()
}

const now = new Date()
const current = dateToMonth(now)
const factor = dateToFactor(now)
const totals: any = {
  [current]: {}
}

for (const expense of converted) {
  const month = dateToMonth(expense.date)
  // console.log(t.date, month)
  if (!totals[month]) {
    totals[month] = {}
  }
  if (!totals[month][expense.expenseCategory]) {
    totals[month][expense.expenseCategory] = {
      sum: 0,
      transactions: []
    }
  }
  totals[month][expense.expenseCategory].transactions.push(expense.transaction)
  totals[month][expense.expenseCategory].sum += expense.amount
}

const months = dataRoot.months

function round (x) {
  // return Math.floor(x * 100) / 100
  return Math.floor(x)
}

if (process.argv[2]) {
  Object.keys(totals[process.argv[2]]).forEach(category => {
    console.log(category,
      `${round(totals[process.argv[2]][category].sum)} (${dataRoot.budget[category]})`,
      totals[process.argv[2]][category].transactions.map(t => `${t.amount}: ${t.details.split('\n').map(line => line.trim()).join()}`))
  })
  console.log(totals[process.argv[2]].Unknown)
} else {
  console.log('category', 'budget', months)
  Object.keys(dataRoot.budget).forEach(category => {
    console.log(category, dataRoot.budget[category], months.map(month => {
      if (!totals[month].all) {
        totals[month].all = { sum: 0 }
      }
      const rounded = (totals[month][category] ? round(totals[month][category].sum) : 0)
      totals[month].all.sum += rounded
      return rounded
    }), (totals[current][category] ? round(totals[current][category].sum * factor) : 0))
  })
  console.log('all', months.map(month => totals[month].all.sum))
}
