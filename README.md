# money-pane

Solid-compatible personal finance insight applet for solid-panes framework

## DEPRECATED
The experiments of the Solid Money-Pane have evolved to what is now
the [Prejournal](https://prejournal.org) project.

## Previously
[NOTE](https://github.com/solid/money-pane/issues/42#issuecomment-1003326750):
We have moved our books from our own custom `HalfLedger` format to the
more commonly used [Plain Text Accounting](https://plaintextaccounting.org/)
standard (specifially, the [HLedger](https://hledger.org/) dialect).

This has many advantages, for instance, we get to profit from the existing
ecosystem data conversion tools from/to the [H]Ledger format, as well as
(obviously) the existing reporting tools themselves.

Also, it will make our work more useful since whatever we build (e.g. importers
for CSV formats from specific banks) will be usable by anybody who uses plain
text accounting.

We are only switching the file format, not moving away from the 'store your
personal data on your personal data store' philosophy of Solid.
Since your books would generally not be shared directly with others using WAC,
this could also be a local data store (your laptop), it doesn't matter that much
if it's not an online data store. For this same reason it doesn't matter that much
whether we access the data using Solid-CRUD or just straightforward filesystem
access (specifically since the most common edit operation would be a lexical append).
We could still accept RDF documents into the pod's inbox, for instance when someone
submits an expense, receipt, timesheet, etc from inside some Solid app. That's a parser
we could add to the existing ecosystem of Plain Text Accounting parsers. Turtle is not
as "plain" as CSV, but it's after all pretty close in the sense of being both simple
to read and easy edit by hand. :)

One first downside is that we no longer have a data format that is self-describing
in a machine-readable way (in RDF, the link to the ontology acts as a machine-readable
identifier of the data format, whereas in Plain Text Accounting files,
it would be best practice to add a human-readable comment at the top describing
the precise file format version. But maybe we can at some point (help to) formalize this notion
and teach our machines to read such a file format version comment.

The other downside is we can't as easily include hyperlink references to other data in a meaningful way.
There may be a way to do something like that in Plain Text Accounting which we haven't discovered yet
(at the least, you would expect account names and currency names to act as globally unique identifiers).
Maybe we'll find a way to bring this part of the RDF philosophy to the Plain Text Accounting world.

For now, consider this code as deprecated (with, for now, the exception of `./exportToHLedger.js`).

You can build with `npm install && npm run build && cd dist && npx serve`.
You can debug with VSCode + Chrome (see `.vscode/launch.json`).

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
mkdir data
ln -s path/to/your/data/root.js data/root.js
./node_modules/.bin/ts-node run.ts
```

Data root format:
```js
{
  hours: {
    2021: ...
  },
  invoices: {
    2021: ...
  },
  myIbans: [
    'some-iban...',
  ],
  files: {
    'path/to/file.csv': {
      parser: 'asnbank-mt940',
      account: 'some-iban...',
    },
  },
  mcc: {
    '0763': 'Groceries',
  },
  incassant: {
    'some=iban...': 'House',
  },
  iban: {
    'some=iban...': 'Transport',
  },
  description: {
    'TIN RABBIT            >NEEDHAM': 'Stuff',
  },
  transactionType: {
    NDIV: 'Services',
  },
  budget: {
    Transport: 200/30, // daily budget amount in main currency e.g. euros
  },
  months: {
    '2021-09',
  }
}

To see a report of your personal spending habits against your self-imposed budget.
I (Michiel de Jong) am running this with my own data root file now, ping me in
https://gitter.im/federatedbookkeeping/community
if you want to know more about its format, I can
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


# Equity Graph
To generate the equity graph:

```sh
node makeBooks.js > ./data/books.js
npx serve
```
Then visit http://localhost:5000/chart

The script `makeBooks.js converts from the data/expenses.js format
to the ./books.js format.

## entries in ./books.js
The data in books.js is optimized for displaying the equity graph,
and takes the form:
```js
{ seriesLiquid, seriesLiquidCredit, seriesLiquidCreditAssets, step }
```
Here `step` is the number of days between two dots plotted in the graph (for instance 5).
The other items are arrays of numbers.

## entries in data/transactions.js
The file data/transactions.js should have a default export that is an array of objects (transactions).
Use these when a client pays an outstanding invoice.
The amount is added to 'liquid' and substracted from 'credit'.

## Example transaction
```js
{
  date: '3 sep 2021',
  description: 'customer ABC paid invoice XYZ',
  amount: 123.45
}
```

## entries in data/expenses.js
The file data/expenses.js should have a default export that is an array of objects (expenses).

### Example expense
```js
  {
    description: 'laptop',
    file: 'expenses/laptop-michiel.pdf',
    date: '4 jul 2020',
    writeOffStart: '4 jul 2020',
    writeOffEnd: '4 jul 2024', // write off ~ 150 eur per year
    assetGroup: 'computer equipment',
    excl: 593.43,
    vat: 124.62,
    from: 'nl',
    incl: 718.05
  },
```

### Parsing
* if `writeOffStart` is missing, default it to `date`
* if `writeOffEnd` is missing, default it to `date`
* if `fooi` is missing, default it to 0
* if `vat` is missing, default it to 0
* if `excl` is missing, default it to `incl`
* if `incl` is missing, default it to `salary`

### Formats
* amounts (i.e. `excl`, `vat`, `incl`, `fooi`, `salary`) can be a Float like 124.62 or a string like 'usd 15.16'
* `from` can be `nl` or `EU` or `non-EU`
* dates are of the format '9 aug 2021'
* `writeOffStrategy` 'monthly' means: `writeOffStartDate` := `date` ; `writeOffEndDate` := `date` + 1 month
* `writeOffStrategy` 'yearly' means: `writeOffStartDate` := `date` ; `writeOffEndDate` := `date` + 1 year

### Effects
* increase debt of `excl+fooi` on `date`
* increase value of `excl+fooi` in assetGroup on `date`
* increase `vat` to ask back
* schedule write-off from assetGroup to /dev/null over `writeOffStart -> writeOffEnd`
