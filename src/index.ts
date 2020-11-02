/* global SolidAuthClient */
import { sym } from 'rdflib'
import { store } from 'solid-ui'
import * as SolidAuth from 'solid-auth-client'
import { MoneyPane } from './moneyPane'

const menuDiv = document.createElement('div')

async function appendMoneyPane (dom, uri) {
  const subject = sym(uri)
  const doc = subject.doc()

  await new Promise((resolve, reject) => {
    store.fetcher.load(doc).then(resolve, reject)
  })
  const context = { // see https://github.com/solid/solid-panes/blob/005f90295d83e499fd626bd84aeb3df10135d5c1/src/index.ts#L30-L34
    dom,
    session: {
      store
    }
  }
  const options = {}
  // renderMenuDiv()
  dom.body.appendChild(menuDiv)
  const paneDiv = MoneyPane.render(subject, context, options)
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
      appendMoneyPane(document, 'https://michielbdejong.solidcommunity.net/profile/card#me')
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
