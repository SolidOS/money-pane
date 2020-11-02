/*   Long Chat Pane
 **
 **  A long chat consists a of a series of chat files saved by date.
 */

import { icons, ns } from 'solid-ui'
ns.money = function (tag) {
  return 'https://example.com/#' + tag // @@TBD
}

const $rdf = require('rdflib')

const mainClass = ns.money('Ledger')
const LEDGER_LOCATION_IN_CONTAINER = 'index.ttl#this'

export const MoneyPane = {
  // noun_704.svg Canoe   noun_346319.svg = 1 Chat  noun_1689339.svg = three chat
  icon: 'noun_1689339.svg',
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
      throw new Error('chat mintNew:  Invalid userid ' + newPaneOptions.me)
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
    const div = dom.createElement('div')
    div.appendChild(dom.createTextNode('this is the money pane'))
    return div
  }
}
