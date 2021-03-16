import { v4 as uuidV4 } from 'uuid'
import { description } from '../../../../../Dropbox/work/personal finance/money-pane-private';
import { AccountHistoryChunk, Balance, HalfTrade, ImportDetails, WorldLedgerAccountId, WorldLedgerMutation } from "../Ledger";
import { toDate } from "./asnbank-csv";


const PARSER_NAME = 'paypal-csv';
const PARSER_VERSION = 'v0.1.0';

// "Datum","Tijd","Tijdzone","Omschrijving","Valuta","Bruto","Kosten","Net","Saldo","Transactiereferentie","Van e-mailadres","Naam","Naam bank","Bankrekening","Verzendkosten","BTW","Factuurreferentie","Reference Txn ID"
const PAYPAL_CSV_COLUMNS = [
  'Datum',
  'Tijd',
  'Tijdzone',
  'Omschrijving',
  'Valuta',
  'Bruto',
  'Kosten',
  'Net',
  'Saldo',
  'Transactiereferentie',
  'Van e-mailadres',
  'Naam',
  'Naam bank',
  'Bankrekening',
  'Verzendkosten',
  'BTW',
  'Factuurreferentie',
  'Reference Txn ID'
];

function parseLines(lines, csvUrl) {
  const objects = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '') {
      continue;
    }
    const cells = lines[i].substring(1, lines[i].length - 1).split('","');
    if (cells.length !== PAYPAL_CSV_COLUMNS.length) {
      console.log(lines[i]);
      console.log(cells);
      console.log(PAYPAL_CSV_COLUMNS);
      throw new Error(`Number of columns doesn\'t match! ${cells.length} != ${PAYPAL_CSV_COLUMNS.length}`);
    }
    const obj = {
      fullInfo: '',
      impliedBy: `${csvUrl}#L${i + 1}` // First line is line 1
    };
    for (let i=0; i< PAYPAL_CSV_COLUMNS.length; i++) {
      obj[PAYPAL_CSV_COLUMNS[i]] = cells[i];
      obj.fullInfo += `${PAYPAL_CSV_COLUMNS[i]}: ${cells[i]},`;
    }
    // console.log(obj);
    objects.push(obj);
  }
  return objects
}


export function parsePaypalCsv ({ fileBuffer, fileId }): AccountHistoryChunk {
  let startDate = new Date('31 Dec 9999');
  let endDate = new Date('1 Jan 100');
  const mutations = parseLines(fileBuffer.toString().split('\n'), fileId).map(obj => {
    // "Datum","Tijd","Tijdzone","Omschrijving","Valuta","Bruto","Kosten","Net","Saldo","Transactiereferentie","Van e-mailadres","Naam","Naam bank","Bankrekening","Verzendkosten","BTW","Factuurreferentie","Reference Txn ID"
    const date = new Date(`${obj.Datum} ${obj.Tijd} (${obj.Tijdzone})`); // FIXME: I think the browser will ignore the timezone and just use its own default one
    if (date < startDate) {
      startDate = date
    }
    if (date > endDate) {
      endDate = date
    }
    const amount = parseFloat(obj.Bruto.replace(',', '.'));
    const unit = obj.Valuta;
    const data = {
      halfTradeId: `paypal-${obj.Date}-${uuidV4()}`,
      description: obj.Omschrijving,
      impliedBy: obj.impliedBy,
      fullInfo: obj.fullInfo
    }
    if (amount < 0) {
      return new WorldLedgerMutation({
        from: 'paypal',
        to: obj.Naam,
        date,
        amount: -amount,
        unit,
        data
      });
    } else {
      return new WorldLedgerMutation({
        from: obj.Naam,
        to: 'paypal',
        date,
        amount,
        unit,
        data
      });
    }
  });
  return new AccountHistoryChunk({
    account: 'me-paypal',
    startBalance: new Balance({
      amount: 0,
      unit: 'EUR'
    }),
    startDate,
    endDate,
    mutations,
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
}
