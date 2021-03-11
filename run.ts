const fs = require('fs')
const { parseMt940 } = require('./src/parsers/asnbank-mt940')

// eslint-disable-next-line import/no-absolute-path
const dataRoot = require(process.env.DATA_ROOT)

let converted = []
const fullRecord = {}
function addToFullRecord({ date, amount: amount, thisAccount, otherAccount, fileId, halfTradeId }) {
  let from = (amount < 0 ? thisAccount : otherAccount)
  let to = (amount < 0 ? otherAccount : thisAccount)
  let absAmount = Math.abs(amount)
  // console.log('addToFullRecord', { from, to, date, amount: absAmount, halfTradeId })
  if (!fullRecord[date]) {
    fullRecord[date] = {}
  }
  if (!fullRecord[date][absAmount]) {
    fullRecord[date][absAmount] = {}
  }
  if (!fullRecord[date][absAmount][from]) {
    fullRecord[date][absAmount][from] = {}
  }
  if (!fullRecord[date][absAmount][from][to]) {
    fullRecord[date][absAmount][from][to] = []
  }
  for (let i=0; i < fullRecord[date][absAmount][from][to].length; i++) {
    if (!fullRecord[date][absAmount][from][to][i][fileId]) {
      console.log('taking slot', i)
      fullRecord[date][absAmount][from][to][i][fileId] = halfTradeId
      return
    }
    console.log('slot is taken', i)
  }
  console.log('adding slot')
  fullRecord[date][absAmount][from][to].push({
    [fileId]: halfTradeId
  })
}
const parsers = {
  'asnbank-mt940': parseMt940
}

Object.keys(dataRoot.files).forEach(fileName => {
  const fileBuffer = fs.readFileSync(fileName, 'utf8')
  const parser = parsers[dataRoot.files[fileName]]
  const { theseExpenses } = parser(fileBuffer, fileName, dataRoot, addToFullRecord)
  converted = converted.concat(theseExpenses)
  console.log(`Parsed ${fileName} with ${theseExpenses.length} statements, total now ${converted.length}`)
})

// function dateToMonth (date) {
//   return `${date.getUTCFullYear()}-${('0' + (date.getUTCMonth() + 1)).slice(-2)}`
// }
// function dateToFactor (date) {
//   // console.log('factor 30 / ', date.getUTCDate(), 30 / date.getUTCDate())
//   return 30 / date.getUTCDate()
// }

// const now = new Date()
// const current = dateToMonth(now)
// const factor = dateToFactor(now)
// const totals: any = {
//   [current]: {}
// }

// for (const expense of converted) {
//   const month = dateToMonth(expense.date)
//   // console.log(t.date, month)
//   if (!totals[month]) {
//     totals[month] = {}
//   }
//   if (!totals[month][expense.expenseCategory]) {
//     totals[month][expense.expenseCategory] = {
//       sum: 0,
//       transactions: []
//     }
//   }
//   totals[month][expense.expenseCategory].transactions.push(expense.transaction)
//   totals[month][expense.expenseCategory].sum += expense.amount
// }

// const months = dataRoot.months

// function round (x) {
//   // return Math.floor(x * 100) / 100
//   return Math.floor(x)
// }

// if (process.argv[2]) {
//   Object.keys(totals[process.argv[2]]).forEach(category => {
//     console.log(category,
//       `${round(totals[process.argv[2]][category].sum)} (${dataRoot.budget[category]})`,
//       totals[process.argv[2]][category].transactions.map(t => `${t.amount}: ${t.details.split('\n').map(line => line.trim()).join()}`))
//   })
//   console.log(totals[process.argv[2]].Unknown)
// } else {
//   console.log('category', 'budget', months)
//   Object.keys(dataRoot.budget).forEach(category => {
//     console.log(category, dataRoot.budget[category], months.map(month => {
//       if (!totals[month]) {
//         return
//       }
//       if (!totals[month].all) {
//         totals[month].all = { sum: 0 }
//       }
//       const rounded = (totals[month][category] ? round(totals[month][category].sum) : 0)
//       totals[month].all.sum += rounded
//       return rounded
//     }), (totals[current][category] ? round(totals[current][category].sum * factor) : 0))
//   })
//   console.log('all', months.map(month => totals[month] && totals[month].all.sum))
// }

console.log(JSON.stringify(fullRecord, null, 2))