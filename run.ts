import { readFileSync } from 'fs'
import { mutationToCategory } from './src/expenseCategories'
import { AccountHistoryChunk, MultiAccountView, WorldLedgerMutation } from './src/Ledger'
import { parseAsnbankCsv } from './src/parsers/asnbank-csv'
import { parseAsnbankMt940 } from './src/parsers/asnbank-mt940'
import { HoursProject, parseHours } from './src/parsers/hours'
import { parseIngCreditcardScrape } from './src/parsers/ing-creditcard-scrape'
import { parseIngbankCsv } from './src/parsers/ingbank-csv'
import { parsePaypalCsv } from './src/parsers/paypal-csv'
import { parseWieBetaaltWat } from './src/parsers/wiebetaaltwat'

// eslint-disable-next-line import/no-absolute-path
const dataRoot = require(process.env.DATA_ROOT)

const mainLedger = new MultiAccountView();

const parsers: { [parserName: string]: (args: { fileBuffer: Buffer | string, fileId: string }) => AccountHistoryChunk } = {
  'asnbank-csv': parseAsnbankCsv,
  'asnbank-mt940': parseAsnbankMt940,
  'ing-creditcard-scrape': parseIngCreditcardScrape,
  'ingbank-csv': parseIngbankCsv,
  'paypal-csv': parsePaypalCsv,
  'wiebetaaltwat': parseWieBetaaltWat,
}

function importFiles() {
  Object.keys(dataRoot.files).forEach((fileName: string) => {
    const fileBuffer = readFileSync(fileName, 'utf8')
    const parser = parsers[dataRoot.files[fileName]]
    const chunk: AccountHistoryChunk = parser({ fileBuffer, fileId: fileName })
    mainLedger.addChunk(chunk)
      console.log(`Parsed ${chunk.importedFrom[0].fileId} with ${chunk.mutations.length} statements`)
  })
}

function importHours() {
  Object.keys(dataRoot.hours).forEach((yearStr: string) => {
    const chunk: AccountHistoryChunk = parseHours({ hours: dataRoot.hours[yearStr], year: parseInt(yearStr) })
    mainLedger.addChunk(chunk)
      console.log(`Parsed ${chunk.importedFrom[0].fileId} with ${chunk.mutations.length} statements`)
  })
}

function addImpliedExpenses() {
  const expenses = new AccountHistoryChunk({
    account: 'expenses', // hmmm
    startDate: mainLedger.getStartDate(),
    endDate: mainLedger.getEndDate(),
    mutations: [],
    importedFrom: []
  });
  // console.log(JSON.stringify(mainLedger.getChunks(), null, 2))
  mainLedger.getChunks().forEach(chunk => {
    chunk.mutations.map(mutation => {
      const category = mutationToCategory(mutation, dataRoot);
      expenses.mutations.push(new WorldLedgerMutation({
        from: mutation.to,
        to: category,
        date: mutation.date,
        amount: mutation.amount,
        unit: mutation.unit,
        data: mutation.data
      }));
      // console.log(category, mutation);
    });
  });
  mainLedger.addChunk(expenses);
}

function addBudgets() {
  const budgets = new AccountHistoryChunk({
    account: 'budgets', // hmmm
    startDate: mainLedger.getStartDate(),
    endDate: mainLedger.getEndDate(),
    mutations: [],
    importedFrom: []
  });
  Object.keys(dataRoot.budget).forEach(budgetName => {
    [2020, 2021].forEach(year => {
      ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].forEach(month => {
        budgets.mutations.push(new WorldLedgerMutation({
          from: 'budget',
          to: budgetName,
          date: new Date(`1 ${month} ${year}`),
          amount: dataRoot.budget[budgetName],
          unit: 'EUR',
          data: {}
        }));   
      });
    });
  });
  mainLedger.addChunk(budgets);
}

function printMonthlyTotals(account: string): void {
  mainLedger.getChunks().filter(chunk => chunk.account === account).forEach(chunk => {
    const total = chunk.mutations.map(mutation => mutation.amount).reduce((accumulator: number, currentValue: number) => accumulator + currentValue, 0)
    console.log('chunk!', total)
  })
}

function run() {
  importFiles();
  importHours();
  addImpliedExpenses();
  addBudgets();
  printMonthlyTotals('worked');
}

// ...
run();