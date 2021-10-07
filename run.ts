
import { MultiAccountView } from './src/Ledger'

// eslint-disable-next-line import/no-absolute-path
const dataRoot = require('./data/root.js');

const BUDGET_GRANULARITY_DAYS = 1;

const mainLedger = new MultiAccountView();

function run(startDate: Date, endDate: Date) {
  mainLedger.importFiles(dataRoot.files, startDate, endDate);
  mainLedger.addImpliedExpenses(dataRoot, startDate, endDate);
  // mainLedger.importHours(dataRoot.hours, startDate, endDate);
  mainLedger.addBudgets(dataRoot.budget, BUDGET_GRANULARITY_DAYS, startDate, endDate);
  mainLedger.printSubView(dataRoot.myIbans, startDate, endDate);
  // mainLedger.trackEquity(dataRoot.myIbans, startDate, endDate);
  console.log(JSON.stringify(mainLedger, null, 2));
  const balances = {};
  const collect = {};
  Object.keys(dataRoot.budget).forEach(category => {
    collect[category] = [];
  });
  mainLedger.chunks.forEach(chunk => {
    chunk.mutations.forEach(mutation => {
      if (!balances[mutation.from]) {
        balances[mutation.from] = 0;
      }
      if (!balances[mutation.to]) {
        balances[mutation.to] = 0;
      }
      balances[mutation.from] -= mutation.amount;
      balances[mutation.to] += mutation.amount;
      if (dataRoot.budget[mutation.to] !== undefined) {
        console.log(mutation.to, mutation.amount);
        collect[mutation.to].push([mutation.data.description, mutation.amount]);
      }
    })
  });
  // console.log(JSON.stringify(balances, null, 2));
  let total = 0;
  Object.keys(balances).forEach(account => {
    if (dataRoot.budget[account] !== undefined) {
      console.log(`${account}: ${balances[account]}`);
      total += balances[account];
      console.log(JSON.stringify(collect[account], null, 2));
    }
  });
  console.log(`Total: ${total}`);
}

// ...
run(new Date('1 September 2021'), new Date('30 September 2021'));
