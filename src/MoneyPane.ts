/*   Money Pane
 **
 **  A ledger consists a of a series of transactions.
 */

import { icons, ns } from 'solid-ui'
import { fileUploadButtonDiv } from 'solid-ui/lib/widgets/buttons'
import { parseCsv } from './parsers/asnbank-csv'
ns.money = function (tag) {
  return 'https://example.com/#' + tag // @@TBD
}

const $rdf = require('rdflib')

const mainClass = ns.money('Ledger')
const LEDGER_LOCATION_IN_CONTAINER = 'index.ttl#this'

function importCsvFile(text: string, dom: HTMLDocument, listDiv: HTMLDivElement) { 
  listDiv.innerHTML = '<ul></ul>'
  const lines = text.split('\n')
  const transactions = parseCsv(lines, 'asnbank')
  for (let shop in transactions) {
    const li = dom.createElement('li')
    li.innerHTML = shop
    listDiv.appendChild(li)
  }
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

  render: function (subject, context, paneOptions) {
    const dom = context.dom
    // const kb = context.session.store
    const paneDiv = dom.createElement('div')
    const listDiv = dom.createElement('div')
    const uploadButton = fileUploadButtonDiv(document, (files) => {
      if (files.length === 1) {
        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
          importCsvFile(event.target.result.toString(), dom, listDiv);
        });
        reader.readAsText(files[0]);
      } else {
        window.alert('hm');
      }
    })
    paneDiv.appendChild(uploadButton)
    paneDiv.appendChild(listDiv)
    return paneDiv
  }
}
