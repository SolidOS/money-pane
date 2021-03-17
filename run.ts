import { readFileSync } from 'fs'
import { mutationToCategory } from './src/expenseCategories'
import { AccountHistoryChunk } from './src/Ledger'
import { parseAsnbankCsv } from './src/parsers/asnbank-csv'
import { parseAsnbankMt940 } from './src/parsers/asnbank-mt940'
import { HoursProject, parseHours } from './src/parsers/hours'
import { parseIngCreditcardScrape } from './src/parsers/ing-creditcard-scrape'
import { parseIngbankCsv } from './src/parsers/ingbank-csv'
import { parsePaypalCsv } from './src/parsers/paypal-csv'
import { parseWieBetaaltWat } from './src/parsers/wiebetaaltwat'

// eslint-disable-next-line import/no-absolute-path
const dataRoot = require(process.env.DATA_ROOT)

let accountHistoryChunks: AccountHistoryChunk[] = []
const parsers: { [parserName: string]: (args: { fileBuffer: Buffer | string, fileId: string }) => AccountHistoryChunk } = {
  'asnbank-csv': parseAsnbankCsv,
  'asnbank-mt940': parseAsnbankMt940,
  'ing-creditcard-scrape': parseIngCreditcardScrape,
  'ingbank-csv': parseIngbankCsv,
  'paypal-csv': parsePaypalCsv,
  'wiebetaaltwat': parseWieBetaaltWat,
}

Object.keys(dataRoot.files).forEach((fileName: string) => {
  const fileBuffer = readFileSync(fileName, 'utf8')
  const parser = parsers[dataRoot.files[fileName]]
  const chunk: AccountHistoryChunk = parser({ fileBuffer, fileId: fileName })
  accountHistoryChunks.push(chunk)
    console.log(`Parsed ${chunk.importedFrom[0].fileId} with ${chunk.mutations.length} statements`)
})

Object.keys(dataRoot.hours).forEach((yearStr: string) => {
  const chunk: AccountHistoryChunk = parseHours({ hours: dataRoot.hours[yearStr], year: parseInt(yearStr) })
  accountHistoryChunks.push(chunk)
    console.log(`Parsed ${chunk.importedFrom[0].fileId} with ${chunk.mutations.length} statements`)
})
// console.log(JSON.stringify(accountHistoryChunks, null, 2))
accountHistoryChunks[0].mutations.map(mutation => {
  const category = mutationToCategory(mutation, dataRoot);
  // console.log(category, mutation);
});

function printMonthlyTotals(account: string): void {
  accountHistoryChunks.filter(chunk => chunk.account === account).forEach(chunk => {
    const total = chunk.mutations.map(mutation => mutation.amount).reduce((accumulator: number, currentValue: number) => accumulator + currentValue, 0)
    console.log('chunk!', total)
  })
}

printMonthlyTotals('worked');