/*   Money Pane
 **
 **  A ledger consists a of a series of transactions.
 */

import { v4 as uuidv4 } from 'uuid'
import { icons, ns, solidLogicSingleton, authn } from 'solid-ui'
import { st, namedNode, NamedNode } from 'rdflib'
import { fileUploadButtonDiv } from 'solid-ui/lib/widgets/buttons'
import { csvFileNameToData, parseAsnCsv } from './parsers/asnbank-csv'
import { HalfTrade, HALF_TRADE_FIELDS } from './Ledger'

ns.halftrade = (label: string) => namedNode(`https://ledgerloops.com/vocab/halftrade#${label}`)
ns.money = (tag: string) => namedNode(`https://example.com/#${tag}`) // @@TBD

const mainClass = ns.halftrade('Ledger')
const LEDGER_LOCATION_IN_CONTAINER = 'index.ttl#this'

function generateTable(halfTrades: HalfTrade[]) {
  let str = '<table><tr><td>Date</td><td>From</td><td>To</td><td>Amount</td><td>Description</td>\n'
  halfTrades.forEach(halfTrade => {
    str += `<tr><td>${halfTrade.date}</td>`
      + `<td>${halfTrade.from}</td>`
      + `<td>${halfTrade.to}</td>`
      + `<td>${halfTrade.amount} ${halfTrade.unit}</td>`
      + `<td>${halfTrade.description}</td></tr>\n`
  })
  return str + '</table>\n'
}

async function findLedgers(): Promise<NamedNode[]> {
  const context = await authn.findAppInstances({}, ns.halftrade('Ledger'))
  return context.instances
}

async function importCsvFile(text: string, iban: string, graphStr: string): Promise<void> { 
  let str = '<table><tr><td>Date</td><td>From</td><td>To</td><td>Amount</td><td>Description</td>\n'
  // TODO: Support more banks than just ASN Bank
  const halfTrades = parseAsnCsv(text, iban)
  console.log(halfTrades)
  const ins = []
  const why = namedNode(graphStr)
  halfTrades.forEach(halfTrade => {
    // str += `<tr><td>${halfTrade.date}</td><td>${halfTrade.from}</td><td>${halfTrade.to}</td><td>${halfTrade.amount} ${halfTrade.unit}</td><td>${halfTrade.description}</td></tr>\n`
    console.log(halfTrade)

    const sub = namedNode(new URL(`#${uuidv4()}`, graphStr).toString())
    solidLogicSingleton.store.add(sub, ns.rdf('type'), ns.halftrade('HalfTrade'), why)
    HALF_TRADE_FIELDS.forEach((field: string) => {
      if (!!halfTrade[field]) {
        // console.log(halfTrade)
        solidLogicSingleton.store.add(sub, ns.halftrade(field), halfTrade[field], why)
      }
    })
  })
  // console.log(`Imported ${ins.length} triples, patching your ledger`)
  await solidLogicSingleton.store.fetcher.putBack(why)
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
    const halfTrades: HalfTrade[] = halfTradeSubjects.map(sub => new HalfTrade(sub, solidLogicSingleton.store))
    console.log(solidLogicSingleton.store.each(halfTradeSubjects[0]))
    listDiv.innerHTML = generateTable(halfTrades)
  },
  render: function (subject: string, context: { dom: HTMLDocument }, paneOptions: {}) {
    console.log('rendering')
    const dom = context.dom
    // const kb = context.session.store
    const paneDiv = dom.createElement('div')
    const listDiv = dom.createElement('div')
    const uploadButton = fileUploadButtonDiv(document, (files) => {
      if (files.length === 1) {
        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
          const { iban } = csvFileNameToData(files[0].name);
          importCsvFile(event.target.result.toString(), iban, subject);
        });
        reader.readAsText(files[0]);
      } else {
        window.alert('hm');
      }
    })
    void this.kickOffAsyncRender(listDiv)
    paneDiv.innerHTML='<h2>under construction</h2>' +
     '<p>Upload a .csv file from your bank. Currently only <a href="https://asnbank.nl">ASN Bank</a>\'s csv format is supported.</p>' +
     'Month: <input id="month" value="11"> Year: <input id="year" value="2020"><input type="submit" value="Analyze" onclick="analyze()">'
    paneDiv.appendChild(uploadButton)
    paneDiv.appendChild(listDiv)
    console.log('returning paneDiv')
    return paneDiv
  }
}
