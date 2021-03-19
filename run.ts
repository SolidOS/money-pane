import { readFileSync } from 'fs'
import { mutationToCategory } from './src/expenseCategories'
import { WorldLedgerView, WorldLedgerMutation } from './src/Ledger'
import { parseAsnbankCsv } from './src/parsers/asnbank-csv'
import { parseAsnbankMt940 } from './src/parsers/asnbank-mt940'
import { HoursProject, parseHours } from './src/parsers/hours'
import { parseIngCreditcardScrape } from './src/parsers/ing-creditcard-scrape'
import { parseIngbankCsv } from './src/parsers/ingbank-csv'
import { parsePaypalCsv } from './src/parsers/paypal-csv'
import { parseWieBetaaltWat } from './src/parsers/wiebetaaltwat'

// eslint-disable-next-line import/no-absolute-path
const dataRoot = require(process.env.DATA_ROOT)

const mainLedger = new WorldLedgerView();

const parsers: { [parserName: string]: (args: { fileBuffer: Buffer | string, fileId: string }) => WorldLedgerView } = {
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
    const chunk: WorldLedgerView = parser({ fileBuffer, fileId: fileName })
    mainLedger.addChunk(chunk)
      console.log(`Parsed ${chunk.importedFrom[0].fileId} with ${chunk.mutations.length} statements`)
  })
}

function importHours() {
  Object.keys(dataRoot.hours).forEach((yearStr: string) => {
    const chunk: WorldLedgerView = parseHours({ hours: dataRoot.hours[yearStr], year: parseInt(yearStr) })
    mainLedger.addChunk(chunk)
      console.log(`Parsed ${chunk.importedFrom[0].fileId} with ${chunk.mutations.length} statements`)
  })
}

function addImpliedExpenses() {
  if (!mainLedger.mutations.length) {
    return
  }
  const expenses = new WorldLedgerView();
  expenses.addExhaustiveChunk({
    account: 'expenses', // hmmm
    startDate: mainLedger.getStartDate(),
    endDate: mainLedger.getEndDate(),
    mutations: [],
    importedFrom: []
  });
  // console.log(JSON.stringify(mainLedger.getChunks(), null, 2))
  mainLedger.mutations.forEach(mutation => {
    const category = mutationToCategory(mutation, dataRoot);
    expenses.mutations.push(new WorldLedgerMutation({
      from: mutation.to,
      to: category,
      date: mutation.date,
      amount: mutation.amount,
      unit: mutation.unit,
      data: mutation.data
    }));
  });
  mainLedger.addChunk(expenses);
}

function addBudgets() {
  if (!mainLedger.mutations.length) {
    return
  }
  const budgets = new WorldLedgerView()
  budgets.addExhaustiveChunk({
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
  const total = mainLedger.mutations.map(mutation => mutation.amount).reduce((accumulator: number, currentValue: number) => accumulator + currentValue, 0)
  console.log('chunk!', total)
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