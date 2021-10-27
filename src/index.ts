/* global SolidAuthClient */
import { sym } from 'rdflib'
import { store, authn } from 'solid-ui'
import { MoneyPane } from './moneyPane'

const LEDGER_DOC = '/ledger.ttl'

const menuDiv = document.createElement('div')

async function appendMoneyPane (dom: HTMLDocument, currentWebId: string) {
  const context = {
    dom
  }
  const options = {
  }
  const graphStr: string = new URL(LEDGER_DOC, currentWebId).toString()
  // renderMenuDiv()
  dom.body.appendChild(menuDiv)
  const paneDiv = MoneyPane.render(graphStr, context, options)
  dom.body.appendChild(paneDiv)
}

document.addEventListener('DOMContentLoaded', function () {
})

window.onload = async () => {
  console.log('document ready')
  await authn.authSession.handleIncomingRedirect()
  const onSessionUpdate = () => {
    const currentUser = authn.currentUser()
    if (!currentUser) {
      console.log('The user is not logged in')
      document.getElementById('loginBanner').innerHTML = '<button onclick="popupLogin()">Log in</button>'
    } else {
      console.log(`Logged in as ${currentUser.value}`)

      document.getElementById('loginBanner').innerHTML = `Logged in as ${currentUser.value} <button onclick="logout()">Log out</button>`
      appendMoneyPane(document, currentUser.value)
    }
  }

  authn.authSession.onLogin(() => onSessionUpdate())
  authn.authSession.onSessionRestore(() => onSessionUpdate())
  onSessionUpdate()
}
;(window as any).logout = () => {
  authn.authSession.logout()
  ;(window as any).location = ''
}
;(window as any).popupLogin = async function () {
  if (!authn.currentUser()) {
    authn.renderSignInPopup(document)
  }
}
