import { v4 as uuidV4 } from 'uuid'
import { HalfTrade } from "../Ledger";
import { parseCsv, toDate } from "./asnbank-csv";

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

function parseLines(lines) {
  const objects = [];
  lines.forEach(line => {
    if (line === '') {
      return;
    }
    const cells = line.substring(1, line.length - 1).split('","');
    if (cells.length !== PAYPAL_CSV_COLUMNS.length) {
      console.log(line);
      console.log(cells);
      console.log(PAYPAL_CSV_COLUMNS);
      throw new Error(`Number of columns doesn\'t match! ${cells.length} != ${PAYPAL_CSV_COLUMNS.length}`);
    }
    const obj = {};
    for (let i=0; i< PAYPAL_CSV_COLUMNS.length; i++) {
      obj[PAYPAL_CSV_COLUMNS[i]] = cells[i];
    }
    // console.log(obj);
    objects.push(obj);
  });
  return objects
}

export function importPaypalCsv(text: string, filePath: string): HalfTrade[] {
  return parseLines(text.split('\n')).map(obj => {
    // "Datum","Tijd","Tijdzone","Omschrijving","Valuta","Bruto","Kosten","Net","Saldo","Transactiereferentie","Van e-mailadres","Naam","Naam bank","Bankrekening","Verzendkosten","BTW","Factuurreferentie","Reference Txn ID"
    if (parseFloat(obj.Bruto) > 0) {
      return {
        from: 'paypal',
        to: obj.Naam,
        date: toDate(obj.Datum),
        amount: parseFloat(obj.Bruto),
        unit: obj.Valuta,
        halfTradeId: `paypal-${obj.Date}-${uuidV4()}`,
        description: obj.Omschrijving
      }
    } else {
      return {
        to: 'paypal',
        from: obj.Naam,
        date: toDate(obj.Datum),
        amount: -parseFloat(obj.Bruto),
        unit: obj.Valuta,
        halfTradeId: `paypal-${obj.Date}-${uuidV4()}`,
        description: obj.Omschrijving
      }
    }
  })
}