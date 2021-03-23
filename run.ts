
import { MultiAccountView } from './src/Ledger'

// eslint-disable-next-line import/no-absolute-path
const dataRoot = require(process.env.DATA_ROOT)

const mainLedger = new MultiAccountView();

function run(startDate: Date, endDate: Date) {
  mainLedger.importFiles(dataRoot.files, startDate, endDate);
  mainLedger.importHours(dataRoot.hours, startDate, endDate);
  mainLedger.addImpliedExpenses(dataRoot, startDate, endDate);
  mainLedger.addBudgets(dataRoot.budget, startDate, endDate);
  // mainLedger.printSubView(dataRoot.myIbans, startDate, endDate);
  mainLedger.trackEquity(dataRoot.myIbans, startDate, endDate);
  // console.log(JSON.stringify(mainLedger, null, 2));
}

// ...
run(new Date('16 December 2020'), new Date('17 December 2020'));
