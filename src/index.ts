/* global SolidAuthClient */
import { sym } from 'rdflib'
import { store } from 'solid-ui'
import * as SolidAuth from 'solid-auth-client'
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

window.onload = () => {
  console.log('document ready')
  SolidAuth.trackSession(async session => {
    if (!session) {
      console.log('The user is not logged in')
      document.getElementById('loginBanner').innerHTML = '<button onclick="popupLogin()">Log in</button>'
    } else {
      console.log(`Logged in as ${session.webId}`)

      document.getElementById('loginBanner').innerHTML = `Logged in as ${session.webId} <button onclick="logout()">Log out</button>`
      appendMoneyPane(document, session.webId)
    }
  })
}
;(window as any).logout = () => {
  SolidAuth.logout()
  ;(window as any).location = ''
}
;(window as any).popupLogin = async function () {
  let session = await SolidAuth.currentSession()
  const popupUri = 'https://solidcommunity.net/common/popup.html'
  if (!session) {
    session = await SolidAuth.popupLogin({ popupUri })
  }
}
