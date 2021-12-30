/*   Money Pane
 **
 **  A ledger consists a of a series of transactions.
 */

import { v4 as uuidv4 } from 'uuid'
import { icons, ns, solidLogicSingleton, authn } from 'solid-ui'
import { st, namedNode, NamedNode } from 'rdflib'
import { fileUploadButtonDiv } from 'solid-ui/lib/widgets/buttons'
import { importAsnCsv, parseAsnCsv } from './parsers/asnbank-csv'
import { HalfTrade, HALF_TRADE_FIELDS } from './Ledger'
import { importIngCsv } from './parsers/ingbank-csv'
import { importIngCcScrape } from './parsers/ing-creditcard-scrape'
import { importPaypalCsv } from './parsers/paypal-csv'
import { importWiebetaaltwatScrape } from './parsers/wiebetaaltwat'

ns.halftrade = (label: string) => namedNode(`https://ledgerloops.com/vocab/halftrade#${label}`)
ns.money = (tag: string) => namedNode(`https://example.com/#${tag}`) // @@TBD

const mainClass = ns.halftrade('Ledger')
const LEDGER_LOCATION_IN_CONTAINER = 'index.ttl#this'

;(window as any).analyze = function() {
  const month = document.getElementById('month').getAttribute('value')
  const year = document.getElementById('year').getAttribute('value')
  const monthStart = new Date(`${month}-1-${year}`)
  const monthEnd = (month === '12' ? new Date(`1-1-${parseInt(year) + 1}`) : new Date(`${parseInt(month) + 1}-1-${year}`))
  if (!Array.isArray((window as any).halfTrades)) {
    console.error('Please upload a csv file first');
    (window as any).halfTrades = [];
  }
  const forMonth = (window as any).halfTrades.filter(x => x.date >= monthStart && x.date < monthEnd)
  console.log({ month, year, monthStart, monthEnd, forMonth });
  document.getElementById('list').innerHTML = generateTable(forMonth)
  ;(window as any).forMonth = forMonth;
}
;(window as any).halfTrades = [];
;(window as any).importBankStatement = async function() {
  const filepath = document.getElementById('filepath').getAttribute('value')
  const format = document.getElementById('format').getAttribute('value')
  const fetchResult = await (window as any).SolidAuthClient.fetch(filepath)
  const text = await fetchResult.text()
  let halfTrades: HalfTrade[]
  if (format === 'asn') {
    ;(window as any).halfTrades = (window as any).halfTrades.concat(importAsnCsv(text, filepath));
  } else if (format === 'ing') {
    ;(window as any).halfTrades = (window as any).halfTrades.concat(importIngCsv(text, filepath));
  } else if (format === 'ing-cc-scrape') {
    ;(window as any).halfTrades = (window as any).halfTrades.concat(importIngCcScrape(text, filepath));
  } else if (format === 'paypal') {
    ;(window as any).halfTrades = (window as any).halfTrades.concat(importPaypalCsv(text, filepath));
  } else if (format === 'wiebetaaltwat-scrape') {
    ;(window as any).halfTrades = (window as any).halfTrades.concat(importWiebetaaltwatScrape(text, filepath));
  } else {
    throw new Error('Format not recognized')
  }
  console.log('window.halfTrades.length', (window as any).halfTrades.length)
}

function extractExpenseCategory(halfTrade: HalfTrade) {
  return 'expenses';
}

function generateTable(halfTrades: HalfTrade[]) {
  console.log(`Generating table from ${halfTrades.length} HalfTrades`);
  // let str = '<p><ul>';
  // Object.keys(totals).forEach(key => {
  //   str += `<li>${key}: ${totals[key]} EUR</li>`;
  // });
  // document.write(str + '<ul></p>');
  let str = {}
  let totals = {}
  halfTrades.forEach(halfTrade => {
    const expenseCategory = extractExpenseCategory(halfTrade);
    if(!expenseCategory) {
      return
    }
    if (!str[expenseCategory]) {
      str[expenseCategory] = '<table><tr><td>Date</td><td>Category</td><td>From</td><td>To</td><td>Amount</td><td>Description</td>\n'
      totals[expenseCategory] = 0
    }
    str[expenseCategory] += `<tr><td>${halfTrade.date}</td>`
      + `<td>${expenseCategory}</td>`
      + `<td>${halfTrade.from}</td>`
      + `<td>${halfTrade.to}</td>`
      + `<td>${halfTrade.amount} ${halfTrade.unit}</td>`
      + `<td>${halfTrade.description}</td></tr>\n`
    totals[expenseCategory] += halfTrade.amount
  })
  return Object.keys(str).map(key => `<h2>${key} (${totals[key]})</h2>${str[key]}</table>\n`).join('\n')
}

async function findLedgers(): Promise<NamedNode[]> {
  const context = await authn.findAppInstances({}, ns.halftrade('Ledger'))
  return context.instances
}

async function importCsvFile(text: string, graphStr: string): Promise<void> { 
  // let str = '<table><tr><td>Date</td><td>From</td><td>To</td><td>Amount</td><td>Description</td>\n'
  // TODO: Support more banks than just ASN Bank
  const halfTrades = parseAsnCsv(text, graphStr)
  console.log({ halfTrades })
  ;(window as any).halfTrades = halfTrades
  // FIXME: Store these in rdflib
  // const ins = []
  // const why = namedNode(graphStr)
  // halfTrades.forEach(halfTrade => {
    // str += `<tr><td>${halfTrade.date}</td><td>${halfTrade.from}</td><td>${halfTrade.to}</td><td>${halfTrade.amount} ${halfTrade.unit}</td><td>${halfTrade.description}</td></tr>\n`
    // console.log(halfTrade)

    // const sub = namedNode(new URL(`#${uuidv4()}`, graphStr).toString())
    // ins.push(st(sub, ns.rdf('type'), ns.halftrade('HalfTrade'), why))
    // HALF_TRADE_FIELDS.forEach((field: string) => {
    //   if (!!halfTrade[field]) {
    //     // console.log(halfTrade)
    //     ins.push(st(sub, ns.halftrade(field), halfTrade[field], why))
    //   }
    // })
  // })
  // console.log(`Imported ${ins.length} triples, patching your ledger`)
  // await solidLogicSingleton.updatePromise([], ins)
  console.log('done')
}

function displayLedger(node) {
  console.log("ploading")
  solidLogicSingleton.load(node);
}

export const MoneyPane = {
  icon: 'noun_Trade_1585569.svg', // Trade by bezier master from the Noun Project
  name: 'Personal Finance',
  label (subject, context) {
    const kb = context.session.store
    if (kb.holds(subject, ns.rdf('type'), mainClass)) {
      return 'Ledger'
    }
    return null // Suppress pane otherwise
  },

  mintClass: mainClass,

  mintNew: function (context, newPaneOptions) {
    const kb = context.session.store
    var updater = kb.updater
    if (newPaneOptions.me && !newPaneOptions.me.uri) {
      throw new Error('money mintNew:  Invalid userid ' + newPaneOptions.me)
    }

    var newInstance = (newPaneOptions.newInstance =
      newPaneOptions.newInstance ||
      kb.sym(newPaneOptions.newBase + LEDGER_LOCATION_IN_CONTAINER))
    var newLedgerDoc = newInstance.doc()

    kb.add(newInstance, ns.rdf('type'), mainClass, newLedgerDoc)
    kb.add(newInstance, ns.dc('title'), 'Ledger', newLedgerDoc)
    kb.add(newInstance, ns.dc('created'), new Date(), newLedgerDoc)
    if (newPaneOptions.me) {
      kb.add(newInstance, ns.dc('author'), newPaneOptions.me, newLedgerDoc)
    }

    return new Promise(function (resolve, reject) {
      updater.put(
        newLedgerDoc,
        kb.statementsMatching(undefined, undefined, undefined, newLedgerDoc),
        'text/turtle',
        function (uri2, ok, message) {
          if (ok) {
            resolve(newPaneOptions)
          } else {
            reject(
              new Error(
                'FAILED to save new ledger at: ' + uri2 + ' : ' + message
              )
            )
          }
        }
      )
    })
  },
  kickOffAsyncRender: async function (listDiv: HTMLElement) {
    listDiv.innerHTML = `<p>(finding HalfTrade ledgers on your pod...)</p>\n`
    console.log('finding ledgers')
    const ledgers = await findLedgers()
    await solidLogicSingleton.load(ledgers)
    let halfTradeSubjects = solidLogicSingleton.store.each(undefined, ns.rdf('type'), ns.halftrade('HalfTrade'))
    if (!Array.isArray(halfTradeSubjects)) {
      halfTradeSubjects = [ halfTradeSubjects ]
    }
    const halfTrades: HalfTrade[] = halfTradeSubjects.map(sub => new HalfTrade(sub as NamedNode, solidLogicSingleton.store))
    console.log(solidLogicSingleton.store.each(halfTradeSubjects[0] as any))
    listDiv.innerHTML = generateTable(halfTrades)
  },
  render: function (subject: string, context: { dom: HTMLDocument }, paneOptions: {}) {
    console.log('rendering')
    const dom = context.dom
    // const kb = context.session.store
    const paneDiv = dom.createElement('div')
    const listDiv = dom.createElement('div')
    listDiv.setAttribute('id', 'list')
    const uploadButton = fileUploadButtonDiv(document, (files) => {
      if (files.length === 1) {
        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
          importCsvFile(event.target.result.toString(), subject);
        });
        reader.readAsText(files[0]);
      } else {
        window.alert('hm');
      }
    })
    // void this.kickOffAsyncRender(listDiv)
    paneDiv.innerHTML='<h2>under construction</h2>' +
     '<p>Upload a .csv file from your bank by drag=dropping it onto the green "+" somewhere on your pod.</p>' +
     '<p>Select a file and format to import.</p>' +
     '<p>File: <input id="filepath" value="">' +
     'Format: <input id="format" value="asn"><input type="submit" value="Import" onclick="importBankStatement()"></p>' +
     '<p>Month: <input id="month" value="12"> Year: <input id="year" value="2020"><input type="submit" value="Analyze" onclick="analyze()"></p>'
    paneDiv.appendChild(uploadButton)
    paneDiv.appendChild(listDiv)
    console.log('returning paneDiv')
    return paneDiv
  }
}
