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

const parsers: { [parserName: string]: (args: { fileBuffer: Buffer | string, fileId: string, details: any }) => AccountHistoryChunk } = {
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
    const parser = parsers[dataRoot.files[fileName].parser]
    const chunk: AccountHistoryChunk = parser({ fileBuffer, fileId: fileName, details: dataRoot.files[fileName] })
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

function printSubView(accountsToInclude: string[]): void {
  let united = [];
  let i=0;
  const chunks = mainLedger.getChunks();
  console.log('Have chunks for the following accounts:', chunks.map(c => c.account))
  for (let i=0; i < chunks.length; i++) {
    const relevantMutations = chunks[i].mutations.filter(m => ((accountsToInclude.indexOf(m.from) !== -1) && (accountsToInclude.indexOf(m.to) !== -1)));
    united = united.concat(relevantMutations)
    const total = relevantMutations.map(mutation => mutation.amount).reduce((accumulator: number, currentValue: number) => accumulator + currentValue, 0)
    console.log('chunk!', chunks[i].account, total, relevantMutations.length, chunks[i].startDate, chunks[i].endDate)
    i++;
  }
  // console.log(united.sort((a, b) => (a.date - b.date)));
}

function run() {
  importFiles();
  // importHours();
  // addImpliedExpenses();
  // addBudgets();
  printSubView(dataRoot.myIbans);
}

// ...
run();