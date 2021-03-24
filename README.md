# money-pane

Solid-compatible personal finance insight applet for solid-panes framework

You can build with `npm install && npm run build && cd dist && npx serve`.
You can debug with VSCode + Chrome (see `.vscode/launch.json`).

## Issue Tracker

We're using the Solid OS native Issue Tracker for this project! \o/

* [MoneyPane issue tracker](https://solidos.solidcommunity.net/Team/2021/money-pane-project/money%20pane/index.ttl#this)

## Import transaction statements from your bank

Currently supported csv-file formats:
* [ASN Bank, The Netherlands](https://webcache.googleusercontent.com/search?q=cache:x3PuJKDKj2cJ:https://www.asnbank.nl/web/file%3Fuuid%3Dfc28db9c-d91e-4a2c-bd3a-30cffb057e8b%26owner%3D6916ad14-918d-4ea8-80ac-f71f0ff1928e%26contentid%3D852+&cd=1&hl=en&ct=clnk&gl=nl)
* Please add yours!

## Deploy stand-alone

You can deploy this code as a stand-alone Solid app.
The way to do that depends on your html-app hosting provider.
For instance, to deploy to https://solid-money.5apps.com/ you would:

```sh
git checkout deploy # this branch has dist/ commented out in .gitignore
git merge master
npm ci
npm run build
git add dist/
git commit --no-verify -am "build"
git remote add 5apps git@5apps.com:michiel_solid-money.git
git push 5apps deploy:master
```

## Active development
You can run:
```sh
DATA_ROOT=dataRoot.js ./node_modules/.bin/ts-node-dev run.ts
```

To see a report of your personal spending habits against your self-imposed budget.
I (Michiel de Jong) am running this with my own data root file now, ping me in
https://gitter.im/solid/solidos if you want to know more about its format, I can
create an up-to-date anonymized example data root file.

## Some notes about the current data format

(subject to change)

### Tracking the arms of the Y
Entries from an imported bank statement is interpreted with the Y-model:

```
Arrivals          Departures
          \   / 
            * (bank account)
            |
            me
```

A debit entry implies one mutation from `Arrivals` (for instance another IBAN bank account) to `* (bank account)` and another mutation from `* (bank account)` to `me` (account balance increases).
A credit entry implies one mutation from `me` to `* (bank account)`  (account balance decreases) and another mutation from `* (bank account)` to `Arrivals` (for instance another IBAN bank account).
In the `AccountHistoryChunk#mutations: WorldLedgerMutation[]` we track the "arms" of the Y, so only the
mutations from `Arrivals` (for instance another IBAN bank account) to `* (bank account)` and from `* (bank account)` to `Arrivals` (for instance another IBAN bank account),
*not* the mutations between `* (bank account)` and `me`.

This may seem unnatural since the entries describe mutations that change the balance between `* (bank account)` and `me`. But each can be derived from the other, it doesn't
seem useful to store both, the arrivals and departures contain more information, and for matching mutations-to-self (e.g. savings account to current account) we already need
to list out the arrivals and departures, so for now we decided to leave out the mutations between bank account and customer. It can of course be reconstructed at any time
using a method like `AccountHistoryChunk#getAccountMutations`.