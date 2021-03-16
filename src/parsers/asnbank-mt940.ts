import { v4 as uuidV4 } from 'uuid'
import { Parser as mt940Parser } from 'mt940js'

const parser = new mt940Parser()

function mccToCategory (mcc, t, dataRoot) {
  // See https://www.citibank.com/tts/solutions/commercial-cards/assets/docs/govt/Merchant-Category-Codes.pdf
  if (dataRoot.mcc[mcc]) {
    return dataRoot.mcc[mcc]
  }
  // console.log('MCC not found', mcc, t)
  return `MCC-${mcc}`
}

function descriptionToCategory (description, t, dataRoot) {
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

function incassantToCategory (incassantId, t, dataRoot) {
  if (dataRoot.incassant[incassantId]) {
    return dataRoot.incassant[incassantId]
  }
  // console.log('incassant not found', incassantId, t)
  return `INCASSANT-${incassantId}`
}

function ibanToCategory (tegenrekening, omschrijving, t, dataRoot) {
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

export function parseAsnbankMt940 ({ fileBuffer, fileId, dataRoot }) {
  const statements = parser.parse(fileBuffer)
  
  const converted = []
  for (let i = 0; i < statements.length; i++) {
    const s = statements[i]
    for (let j = 0; j < s.transactions.length; j++) {
      const t = s.transactions[j]
      if (Math.abs(t.amount) !== 2134.1) {
        continue
      }
      // console.log('transaction:', t)
      let expenseCategory
      let counterParty
      const description = t.details.split('\n').join('').trim()
      if (['NBEA', 'NBTL', 'NCOR'].indexOf(t.transactionType) !== -1) {
        const matches = /(.*)MCC:([0-9]*)(.*)/g.exec(description)
        if (matches === null) {
          // console.log('NBEA but not MCC in details?', t, description)
          expenseCategory = descriptionToCategory(description, t, dataRoot)
        } else {
          const mcc = matches[2]
          if (mcc.length !== 4) {
            console.log(t, description, matches)
            throw new Error('Could not parse MCC')
          }
          expenseCategory = mccToCategory(mcc.toString(), t, dataRoot)
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
        // if (dataRoot.myIbans.indexOf(iban) !== -1) {
        //   console.log('internal!', t)
        // }
        counterParty = iban
        expenseCategory = ibanToCategory(iban, description, t, dataRoot)
      } else if (['NINC'].indexOf(t.transactionType) !== -1) {
        const matches = /(.*)-Incassant ID: (.*)-Kenmerk Machtiging: (.*)/g.exec(description)
        if (!matches) {
          console.log(t, matches, description)
          throw new Error('help! ' + description)
        }
        expenseCategory = incassantToCategory(matches[2], t, dataRoot)
      } else {
        console.error('Please implement parsing for transaction type ' + t.transactionType, t)
        expenseCategory = t.transactionType
      }
      const halfTradeId = `from-asnbank-mt940-${fileId}-${i}-${j}`
      converted.push({
        from: s.accountIdentification,
        to: 'Counterparty',
        date: t.date,
        amount: -t.amount,
        unit: 'EUR',
        halfTradeId,
        expenseCategory,
        transaction: t
      })
      // addToFullRecord({
      //   date: t.date,
      //   amount: t.amount,
      //   thisAccount: s.accountIdentification,
      //   otherAccount: counterParty || expenseCategory,
      //   fileId,
      //   halfTradeId
      // })
    }
  }
  return {
    theseExpenses: converted
  }
}

