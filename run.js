const fs = require('fs')
const mt940js = require('mt940js')

const statement = fs.readFileSync(process.env.MT940_FILE, 'utf8')
// eslint-disable-next-line import/no-absolute-path
const categories = require(process.env.CATEGORIES_FILE)
const parser = new mt940js.Parser()

const statements = parser.parse(statement)

function mccToCategory (mcc, t) {
  // See https://www.citibank.com/tts/solutions/commercial-cards/assets/docs/govt/Merchant-Category-Codes.pdf
  if (categories.mcc[mcc]) {
    return categories.mcc[mcc]
  }
  // console.log('MCC not found', mcc, t)
  return `MCC-${mcc}`
}

function descriptionToCategory (description, t) {
  const entries = Object.keys(categories.description)
  // console.log('looking for description prefix', description)
  for (let i = 0; i < entries.length; i++) {
    // console.log(entries[i], description.startsWith(entries[i]))
    if (description.startsWith(entries[i])) {
      return categories.description[entries[i]]
    }
  }
  // console.log('description not found', description, t)
  return 'Unknown description'
}

function incassantToCategory (incassantId, t) {
  if (categories.incassant[incassantId]) {
    return categories.incassant[incassantId]
  }
  // console.log('incassant not found', incassantId, t)
  return `INCASSANT-${incassantId}`
}

function ibanToCategory (tegenrekening, omschrijving, t) {
  if (categories.iban[tegenrekening]) {
    if (categories.iban[tegenrekening] === 'Unknown') {
      const strings = categories.description
      let ret = 'Unknown'
      Object.keys(strings).forEach(str => {
        if (omschrijving.indexOf(str) !== -1) {
          ret = strings[str]
        }
      })
      return ret
    }
    return categories.iban[tegenrekening]
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
      expenseCategory = categories.transactionType[t.transactionType]
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
    const month = dateToMonth(t.date)
    // console.log(t.date, month)
    if (!totals[month]) {
      totals[month] = {}
    }
    if (!totals[month][expenseCategory]) {
      totals[month][expenseCategory] = 0
    }
    totals[month][expenseCategory] -= t.amount
  }
}
const months = categories.months

function round (x) {
  // return Math.floor(x * 100) / 100
  return Math.floor(x)
}
console.log('category', 'budget', months)
Object.keys(categories.budget).forEach(category => {
  console.log(category, categories.budget[category], months.map(month => round(totals[month][category] || 0)), round(totals[current][category] * factor || 0))
})
