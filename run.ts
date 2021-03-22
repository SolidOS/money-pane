
import { MultiAccountView } from './src/Ledger'

// eslint-disable-next-line import/no-absolute-path
const dataRoot = require(process.env.DATA_ROOT)

const mainLedger = new MultiAccountView();

function run() {
  mainLedger.importFiles(dataRoot.files);
  mainLedger.importHours(dataRoot.hours);``
  mainLedger.addImpliedExpenses(dataRoot);
  mainLedger.addBudgets(dataRoot.budget);
  mainLedger.printSubView(dataRoot.myIbans, new Date('1 February 2018'), new Date('15 October 2030'));
}

// ...
run();
