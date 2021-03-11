const fs = require('fs')
const mt940js = require('mt940js')

// eslint-disable-next-line import/no-absolute-path
const dataRoot = require(process.env.DATA_ROOT)
const parser = new mt940js.Parser()

let statements = []
dataRoot.mt940.forEach(fileName => {
  const fileBuffer = fs.readFileSync(fileName, 'utf8')
  const theseStatements = parser.parse(fileBuffer)
  statements = statements.concat(theseStatements)
  console.log(`Parsed ${fileName} with ${theseStatements.length} statements, total now ${statements.length}`)
})

function mccToCategory (mcc, t) {
  // See https://www.citibank.com/tts/solutions/commercial-cards/assets/docs/govt/Merchant-Category-Codes.pdf
  if (dataRoot.mcc[mcc]) {
    return dataRoot.mcc[mcc]
  }
  // console.log('MCC not found', mcc, t)
  return `MCC-${mcc}`
}

function descriptionToCategory (description, t) {
  const entries = Object.keys(dataRoot.description)
  // console.log('looking for description prefix', description)
  for (let i = 0; i < entries.length; i++) {
    // console.log(entries[i], description.startsWith(entries[i]))
    if (description.startsWith(entries[i])) {
      return dataRoot.description[entries[i]]
    }
  }
  // console.log('description not found', description, t)
  return 'Unknown description'
}

function incassantToCategory (incassantId, t) {
  if (dataRoot.incassant[incassantId]) {
    return dataRoot.incassant[incassantId]
  }
  // console.log('incassant not found', incassantId, t)
  return `INCASSANT-${incassantId}`
}

function ibanToCategory (tegenrekening, omschrijving, t) {
  if (dataRoot.iban[tegenrekening]) {
    if (dataRoot.iban[tegenrekening] === 'Unknown') {
      const strings = dataRoot.description
      let ret = 'Unknown'
      Object.keys(strings).forEach(str => {
        if (omschrijving.indexOf(str) !== -1) {
          ret = strings[str]
        }
      })
      return ret
    }
    return dataRoot.iban[tegenrekening]
  }
  // console.log('iban not found', t)
  return `iban-${tegenrekening}`
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
const totals = {
  [current]: {}
}

const converted = []
for (const s of statements) {
  // console.log('statement:', s)
  for (const t of s.transactions) {
    // console.log('transaction:', t)
    let expenseCategory
    const description = t.details.split('\n').join('').trim()
    if (['NBEA', 'NBTL', 'NCOR'].indexOf(t.transactionType) !== -1) {
      const matches = /(.*)MCC:([0-9]*)(.*)/g.exec(description)
      if (matches === null) {
        // console.log('NBEA but not MCC in details?', t, description)
        expenseCategory = descriptionToCategory(description, t)
      } else {
        const mcc = matches[2]
        if (mcc.length !== 4) {
          console.log(t, description, matches)
          throw new Error('Could not parse MCC')
        }
        expenseCategory = mccToCategory(mcc.toString(), t)
      }
    } else if (['NDIV', 'NRNT', 'NKST', 'NGEA'].indexOf(t.transactionType) !== -1) {
      expenseCategory = dataRoot.transactionType[t.transactionType]
    } else if (['NIDB', 'NIOB', 'NOVB', 'NSTO', 'FTRF'].indexOf(t.transactionType) !== -1) {
      let iban
      if (t.structuredDetails) {
        iban = t.structuredDetails[38]
      } else {
        iban = description.split(' ')[0]
        if (iban.substring(0, 16) !== t.reference) {
          console.error('unexpected mismatch between iban prefix and reference', iban, t.reference, t.details)
        }
      }
      expenseCategory = ibanToCategory(iban, description, t)
    } else if (['NINC'].indexOf(t.transactionType) !== -1) {
      const matches = /(.*)-Incassant ID: (.*)-Kenmerk Machtiging: (.*)/g.exec(description)
      if (!matches) {
        console.log(t, matches, description)
        throw new Error('help! ' + description)
      }
      expenseCategory = incassantToCategory(matches[2], t)
    } else {
      console.error('Please implement parsing for transaction type ' + t.transactionType, t)
      expenseCategory = t.transactionType
    }
    converted.push({
      date: t.date,
      amount: -t.amount,
      expenseCategory,
      transaction: t
    })
  }
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
