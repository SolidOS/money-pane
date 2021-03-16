import { readFileSync } from 'fs'
import { parseAsnbankCsv } from './src/parsers/asnbank-csv'
import { parseAsnbankMt940 } from './src/parsers/asnbank-mt940'
import { parseIngCreditcardScrape } from './src/parsers/ing-creditcard-scrape'
import { parseIngbankCsv } from './src/parsers/ingbank-csv'
import { parsePaypalCsv } from './src/parsers/paypal-csv'
import { parseWieBetaaltWat } from './src/parsers/wiebetaaltwat'

// eslint-disable-next-line import/no-absolute-path
const dataRoot = require(process.env.DATA_ROOT)

let converted = []
const parsers = {
  'asnbank-csv': parseAsnbankCsv,
  'asnbank-mt940': parseAsnbankMt940,
  'ing-creditcard-scrape': parseIngCreditcardScrape,
  'ingbank-csv': parseIngbankCsv,
  'paypal-csv': parsePaypalCsv,
  'wiebetaaltwat': parseWieBetaaltWat
}

Object.keys(dataRoot.files).forEach(fileName => {
  const fileBuffer = readFileSync(fileName, 'utf8')
  const parser = parsers[dataRoot.files[fileName]]
  const { theseExpenses } = parser({ fileBuffer, fileId: fileName, dataRoot })
  converted = converted.concat(theseExpenses)
  console.log(`Parsed ${fileName} with ${theseExpenses.length} statements, total now ${converted.length}`)
})

console.log(JSON.stringify(converted, null, 2))