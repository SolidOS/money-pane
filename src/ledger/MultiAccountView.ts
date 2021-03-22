import { readFileSync } from 'fs'
import { mutationToCategory } from '../expenseCategories'
import { WorldLedgerMutation } from '../Ledger'
import { parseAsnbankCsv } from '../parsers/asnbank-csv'
import { parseAsnbankMt940 } from '../parsers/asnbank-mt940'
import { parseHours } from '../parsers/hours'
import { parseIngCreditcardScrape } from '../parsers/ing-creditcard-scrape'
import { parseIngbankCsv } from '../parsers/ingbank-csv'
import { parsePaypalCsv } from '../parsers/paypal-csv'
import { parseWieBetaaltWat } from '../parsers/wiebetaaltwat'
import { AccountHistoryChunk } from './AccountHistoryChunk'


const parsers: { [parserName: string]: (args: { fileBuffer: Buffer | string, fileId: string, details: any }) => AccountHistoryChunk } = {
  'asnbank-csv': parseAsnbankCsv,
  'asnbank-mt940': parseAsnbankMt940,
  'ing-creditcard-scrape': parseIngCreditcardScrape,
  'ingbank-csv': parseIngbankCsv,
  'paypal-csv': parsePaypalCsv,
  'wiebetaaltwat': parseWieBetaaltWat,
}

export class MultiAccountView {
  chunks: AccountHistoryChunk[]
  constructor () {
    this.chunks = []
  }
  addChunk(chunk) {
    for (let i = 0; i < this.chunks.length; i++) {
      if(this.chunks[i].account === chunk.account) {
        console.log('Mixing in!', chunk.account);
        this.chunks[i].mixIn(chunk);
        return
      }
    }
    console.log(`First chunk we see for ${chunk.account}`);
    this.chunks.push(chunk);
  }
  getChunks() {
    return this.chunks;
  }
  
  getStartDate() {
    let earliest = new Date('31 December 9999');
    this.chunks.forEach(chunk => {
      if (chunk.startDate < earliest) {
        earliest = chunk.startDate;
      }
    });
    return earliest;
  }

  getEndDate() {
    let latest = new Date('1 January 100');
    this.chunks.forEach(chunk => {
      if (chunk.endDate < latest) {
        latest = chunk.endDate;
      }
    });
    return latest;
  }
  
  importFiles (files: { [fileName: string]: any }) {
    Object.keys(files).forEach((fileName: string) => {
      const fileBuffer = readFileSync(fileName, 'utf8')
      const parser = parsers[files[fileName].parser]
      const chunk: AccountHistoryChunk = parser({ fileBuffer, fileId: fileName, details: files[fileName] })
      this.addChunk(chunk)
        console.log(`Parsed ${chunk.importedFrom[0].fileId} with ${chunk.mutations.length} statements`)
    })
  }
  
  importHours (hours: any) {
    Object.keys(hours).forEach((yearStr: string) => {
      const chunk: AccountHistoryChunk = parseHours({ hours: hours[yearStr], year: parseInt(yearStr) })
      this.addChunk(chunk)
        console.log(`Parsed ${chunk.importedFrom[0].fileId} with ${chunk.mutations.length} statements`)
    })
  }
  
  addImpliedExpenses (dataRoot: any) {
    const expenses = new AccountHistoryChunk({
      account: 'expenses', // hmmm
      startDate: this.getStartDate(),
      endDate: this.getEndDate(),
      mutations: [],
      importedFrom: []
    });
    // console.log(JSON.stringify(this.getChunks(), null, 2))
    this.getChunks().forEach(chunk => {
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
    this.addChunk(expenses);
  }
  
  addBudgets (budget: any) {
    const budgets = new AccountHistoryChunk({
      account: 'budgets', // hmmm
      startDate: this.getStartDate(),
      endDate: this.getEndDate(),
      mutations: [],
      importedFrom: []
    });
    Object.keys(budget).forEach(budgetName => {
      [2020, 2021].forEach(year => {
        ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].forEach(month => {
          budgets.mutations.push(new WorldLedgerMutation({
            from: 'budget',
            to: budgetName,
            date: new Date(`1 ${month} ${year}`),
            amount: budget[budgetName],
            unit: 'EUR',
            data: {}
          }));   
        });
      });
    });
    this.addChunk(budgets);
  }
  
  printSubView(accountsToInclude: string[], startDate: Date, endDate: Date): void {
    this.chunks.forEach(chunk => console.log(chunk.mutations.filter(m => ((m.date >= startDate) && (m.date <= endDate)))));

    let united = {};
    let i=0;
    const chunks = this.getChunks();
    console.log('Have chunks for the following accounts:', chunks.map(c => c.account))
    for (let i=0; i < chunks.length; i++) {
      if (accountsToInclude.indexOf(chunks[i].account) === -1) {
        console.log(`WARNING: ${chunks[i].account} is not in the list`, accountsToInclude);
      }
      // we will look at mutations from one of our accounts to one of our other accounts.

      const mutationsToSelf = chunks[i].mutations.filter(m => ((accountsToInclude.indexOf(m.from) !== -1) && (accountsToInclude.indexOf(m.to) !== -1) && (m.date >= startDate) && (m.date <= endDate)));
      // relevantMutations.forEach(x => { console.log(x.from, x.to, (accountsToInclude.indexOf(x.from) === -1), (accountsToInclude.indexOf(x.to) === -1)); });
      mutationsToSelf.forEach(mutation => {
        // console.log(chunks[i].account, mutation);
        if (!united[mutation.from]) {
          united[mutation.from] = {}
        }
        if (!united[mutation.from][mutation.to]) {
          united[mutation.from][mutation.to] = {}
        }
        if (!united[mutation.from][mutation.to][mutation.date.toString()]) {
          united[mutation.from][mutation.to][mutation.date.toString()] = {}
        }
        if (!united[mutation.from][mutation.to][mutation.date.toString()][mutation.amount]) {
          united[mutation.from][mutation.to][mutation.date.toString()][mutation.amount] = {}
        }
        if (!united[mutation.from][mutation.to][mutation.date.toString()][mutation.amount][mutation.unit]) {
          united[mutation.from][mutation.to][mutation.date.toString()][mutation.amount][mutation.unit] = {}
        }
        if (!united[mutation.from][mutation.to][mutation.date.toString()][mutation.amount][mutation.unit][chunks[i].account]) {
          united[mutation.from][mutation.to][mutation.date.toString()][mutation.amount][mutation.unit][chunks[i].account] = []
        }
        united[mutation.from][mutation.to][mutation.date.toString()][mutation.amount][mutation.unit][chunks[i].account].push(mutation.data)
      })
      const total = mutationsToSelf.map(mutation => mutation.amount).reduce((accumulator: number, currentValue: number) => accumulator + currentValue, 0)
      console.log('chunk!', chunks[i].account, total, mutationsToSelf.length, chunks[i].startDate, chunks[i].endDate)
    }
    const floaters = [];
    const moves = [];
    Object.keys(united).forEach(from => {
      Object.keys(united[from]).forEach(to => {
        Object.keys(united[from][to]).forEach(dateStr => {
          Object.keys(united[from][to][dateStr]).forEach(amount => {
            Object.keys(united[from][to][dateStr][amount]).forEach(unit => {
              if (JSON.stringify(Object.keys(united[from][to][dateStr][amount][unit]).sort()) == JSON.stringify([from, to].sort())) {
                // console.log(`[${from} => ${to} ${amount} ${unit} @ ${dateStr}]` /* , united[from][to][dateStr][amount][unit][from], united[from][to][dateStr][amount][unit][to] */);
              } else {
                if (Object.keys(united[from][to][dateStr][amount][unit]).length === 1) {
                  const reporter = Object.keys(united[from][to][dateStr][amount][unit])[0];
                  const thisOne = { from, to, amount, unit };
                  // console.log('Finding floater', thisOne);
                  let matched = false;
                  for (let i = 0; i < floaters.length; i++) {
                    // console.log('Comparing to', floaters[i], `${i} of ${floaters.length}`);
                    let floaterMatch = true;
                    ['from', 'to', 'amount', 'unit'].forEach(field => {
                      if (floaters[i][field] !== thisOne[field]) {
                        // console.log('floater no', floaters[i]);
                        floaterMatch = false;
                      }
                    });
                    if (floaterMatch) {
                      // console.log('Floater match!');
                      moves.push({ from, to, dateStr, toDateStr: floaters[i].dateStr, amount, unit, reporter });
                      console.log('FLOATER-', from, to, `[${dateStr} => ${floaters[i].dateStr}]`, amount, unit, reporter)
                      // console.log('Floaters before removal:');
                      // floaters.forEach(floater => console.log(floater))  
                      floaters.splice(i, 1);
                      // console.log('Floaters after removal:');
                      // floaters.forEach(floater => console.log(floater))  
                      matched = true;
                      break
                    }
                  }
                  if (!matched) {
                    console.log('FLOATER+', from, to, dateStr, amount, unit, reporter)
                    floaters.push({ from, to, dateStr, amount, unit, reporter, data: united[from][to][dateStr][amount][unit][reporter] })
                    // console.log('Floaters after addition:');
                    // floaters.forEach(floater => console.log(floater))
                  }
                } else {
                  console.log(`Not reported twice! [${from} => ${to} ${amount} ${unit} @ ${dateStr}]`, Object.keys(united[from][to][dateStr][amount][unit]));
                  Object.keys(united[from][to][dateStr][amount][unit]).forEach(reporter => console.log(`${reporter} reported:`, united[from][to][dateStr][amount][unit][reporter]));
                }
              }
            })
          })
        })
      })
    });
    moves.forEach(({from, to, dateStr, toDateStr, amount, unit, reporter}) => {
      console.log('moving', from, to, dateStr, toDateStr, amount, unit, reporter);
      united[from][to][toDateStr][amount][unit][reporter] = united[from][to][dateStr][amount][unit][reporter];
        delete united[from][to][dateStr][amount][unit][reporter];
    });
    console.log('Floaters left:', floaters.length, this.chunks.map(c => `${c.account}: ${c.startDate} .. ${c.endDate}`));
    console.log(floaters);
  }

}
