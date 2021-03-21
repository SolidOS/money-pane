import { v4 as uuidV4 } from 'uuid'
import { AccountHistoryChunk, WorldLedgerMutation } from "../Ledger";
import { makePositive, parseGeneric } from './parseGeneric';
import { DateTime } from 'luxon';

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

function toDate(dateStr: string, timeStr: string, timezoneStr: string): Date {
  const dateStrMatches = /(.+)\/(.*)\/(.*)/g.exec(dateStr)
  if (!dateStrMatches) {
    return null
  }
  let timeStrMatches: any = /(.+):(.*):(.*)/g.exec(timeStr)
  if (!timeStrMatches) {
    timeStrMatches = ['00:00:00', '00', '00', '00']
  }
  
  const day = Number.parseInt(dateStrMatches[1], 10);
  const month = Number.parseInt(dateStrMatches[2], 10);
  const year = Number.parseInt(dateStrMatches[3], 10);
  const hour = Number.parseInt(timeStrMatches[1], 10);
  const minute = Number.parseInt(timeStrMatches[2], 10);
  const second = Number.parseInt(timeStrMatches[3], 10);
  const dateTime = DateTime.fromObject({
    year,
    month,
    day,
    hour,
    minute,
    second,
    zone: timezoneStr
  } as any);
  const date = dateTime.toJSDate()
  // console.log('toDate', dateStr, timeStr, timezoneStr, year, month, day, hour, minute, second, dateTime, date);
  return date;
}

function parseLines(lines: string[]) {
  // "Datum","Tijd","Tijdzone","Omschrijving","Valuta","Bruto","Kosten","Net","Saldo","Transactiereferentie","Van e-mailadres","Naam","Naam bank","Bankrekening","Verzendkosten","BTW","Factuurreferentie","Reference Txn ID"    
  const mutations = [];
  // Top line is header, start at line 1
  for (let i = 1; i < lines.length; i++) {
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
    const obj: any = {
      fullInfo: '',
      // impliedBy: `${csvUrl}#L${i + 1}` // First line is line 1
    };
    for (let i=0; i< PAYPAL_CSV_COLUMNS.length; i++) {
      obj[PAYPAL_CSV_COLUMNS[i]] = cells[i];
      obj.fullInfo += `${PAYPAL_CSV_COLUMNS[i]}: ${cells[i]},`;
    }
    // console.log(obj);
    let from = obj.Naam || `${obj['Naam bank']}:${obj.Bankrekening}`;
    let to = 'paypal';
    let amount = parseFloat(obj.Bruto.replace(',', '.'));
    
    mutations.push(makePositive(new WorldLedgerMutation({
      from,
      to,
      date: toDate(obj.Datum, obj.Tijd, obj.Tijdzone),
      amount,
      unit: obj.Valuta,
      data: {
        halfTradeId: `paypal-${obj.Date}-${uuidV4()}`,
        description: obj.Omschrijving,
        impliedBy: obj.impliedBy,
        fullInfo: obj.fullInfo
      }
    })));
  }
  return mutations;
}

export function parsePaypalCsv ({ fileBuffer, fileId, details }): AccountHistoryChunk {
  return parseGeneric({
    fileBuffer,
    fileId,
    parseLines,
    account: details.acccount,
    parserName: PARSER_NAME,
    parserVersion: PARSER_VERSION
  });
}
