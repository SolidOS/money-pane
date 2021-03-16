import { v4 as uuidV4 } from 'uuid'
import { HalfTrade } from "../Ledger";
import { toDate } from "./asnbank-csv";

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

export function importPaypalCsv(text: string, filePath: string): HalfTrade[] {
  return parseLines(text.split('\n'), filePath).map(obj => {
    // "Datum","Tijd","Tijdzone","Omschrijving","Valuta","Bruto","Kosten","Net","Saldo","Transactiereferentie","Van e-mailadres","Naam","Naam bank","Bankrekening","Verzendkosten","BTW","Factuurreferentie","Reference Txn ID"
    if (parseFloat(obj.Bruto) > 0) {
      return {
        from: 'paypal',
        to: obj.Naam,
        date: new Date(`${obj.Datum} ${obj.Tijd} (${obj.Tijdzone})`), // FIXME: I think the browser will ignore the timezone and just use its own default one
        amount: parseFloat(obj.Bruto),
        unit: obj.Valuta,
        halfTradeId: `paypal-${obj.Date}-${uuidV4()}`,
        description: obj.Omschrijving,
        impliedBy: obj.impliedBy,
        fullInfo: obj.fullInfo
      }
    } else {
      return {
        to: 'paypal',
        from: obj.Naam,
        date: toDate(obj.Datum),
        amount: -parseFloat(obj.Bruto),
        unit: obj.Valuta,
        halfTradeId: `paypal-${obj.Date}-${uuidV4()}`,
        description: obj.Omschrijving,
        impliedBy: obj.impliedBy,
        fullInfo: obj.fullInfo
      }
    }
  })
}

export function parsePaypalCsv ({ fileBuffer, fileId }) {
  console.log('implement me!')
}