import { v4 as uuidV4 } from 'uuid'
import { Parser as mt940Parser } from 'mt940js'
import { WorldLedgerView, Balance, ImportDetails, WorldLedgerMutation } from '../Ledger'

const PARSER_NAME = 'mt940-asnbank';
const PARSER_VERSION = 'v0.1.0';

const parser = new mt940Parser()

export function parseAsnbankMt940 ({ fileBuffer, fileId }): WorldLedgerView {
  const statements = parser.parse(fileBuffer)
  let account: string
  let startDate: Date
  let endDate: Date
  let startBalance: Balance
  let lastStatementNumber: number
  const mutations: WorldLedgerMutation[] = []
  for (let i = 0; i < statements.length; i++) {
    const s = statements[i]
    if (!account) {
      account = s.accountIdentification;
    } else if (account !== s.accountIdentification) {
      console.warn(`WARNING: extraneous statement about account ${s.accountIdentification} instead of ${account}`);
      console.log(s)
      process.exit(12)
    }
    if (!startDate) {
      startDate = s.openingBalanceDate;
      startBalance = new Balance({
        amount: s.openingBalance,
        unit: s.currency
      });
    } else if (parseInt(s.number.statement) !== lastStatementNumber + 1) {
      console.warn(`WARNING: Statements not contiguous ${s.number.statement} instead of ${lastStatementNumber}+1`);
      console.log(s)
      // process.exit(12)
    }
    if (s.number.sequence !== '1') {
      console.warn(`WARNING! Statement ${s.number.statement} contains a sequence of multiple "pages", now looking at page ${s.number.sequence}`)
    }
    lastStatementNumber = parseInt(s.number.statement);
    endDate = s.closingBalanceDate;
    for (let j = 0; j < s.transactions.length; j++) {
      const t = s.transactions[j]
      if (Math.abs(t.amount) !== 2134.1) {
        continue
      }

      let counterParty: string = 'Counter Party'
      let data: any = {
        description: t.details.split('\n').join('').trim(),
        transactionType: t.transactionType,
        fullTransaction: t
      }
      if (['NBEA', 'NBTL', 'NCOR'].indexOf(t.transactionType) !== -1) { // Find MCC
        const matches = /(.*)MCC:([0-9]*)(.*)/g.exec(data.description)
        if (matches !== null) {
          const mcc = matches[2]
          if (mcc.length !== 4) {
            console.log(t, data.description, matches)
            throw new Error('Could not parse MCC')
          }
          data.mcc = mcc.toString()
        }
      } else if (['NIDB', 'NIOB', 'NOVB', 'NSTO', 'FTRF'].indexOf(t.transactionType) !== -1) { // Find iban
        if (t.structuredDetails) {
          data.iban = t.structuredDetails[38]
        } else {
          data.iban = data.description.split(' ')[0]
          if (data.iban.substring(0, 16) !== t.reference) {
            console.error('unexpected mismatch between iban prefix and reference', data.iban, t.reference, t.details)
          }
        }
        // if (dataRoot.myIbans.indexOf(iban) !== -1) {
        //   console.log('internal!', t)
        // }
        counterParty = data.iban
      } else if (['NINC'].indexOf(t.transactionType) !== -1) { // Find incassant
        const matches = /(.*)-Incassant ID: (.*)-Kenmerk Machtiging: (.*)/g.exec(data.description)
        if (!matches) {
          console.log(t, matches, data.description)
          throw new Error('help! ' + data.description)
        }
        data.incassant = matches[2]
      } else if (['NDIV', 'NRNT', 'NKST', 'NGEA'].indexOf(t.transactionType) !== -1) { // Go by transactionType
      } else {
        console.error('Please implement parsing for transaction type ' + t.transactionType, t)
      }
      data.halfTradeId = `from-asnbank-mt940-${fileId}-${i}-${j}`
      mutations.push(new WorldLedgerMutation({
        from: s.accountIdentification,
        to: counterParty,
        date: t.date,
        amount: t.amount,
        unit: startBalance.unit,
        data
      }))
    }
  }
  const ret = new WorldLedgerView();
  ret.addExhaustiveChunk({
    account,
    startDate,
    endDate,
    mutations,
    startBalance,
    importedFrom: [
      new ImportDetails({
        fileId,
        parserName: PARSER_NAME,
        parserVersion: PARSER_VERSION,
        firstAffected: 0,
        lastAffected: mutations.length
      })
    ]
  });
  return ret;
}
