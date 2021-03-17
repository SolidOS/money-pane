import { AccountHistoryChunk, Balance, HalfTrade, ImportDetails, WorldLedgerMutation } from "../Ledger";
import { parseGeneric } from "./parseGeneric";

const PARSER_NAME = 'ingbank-csv';
const PARSER_VERSION = 'v0.1.0';

// "Date";"Name / Description";"Account";"Counterparty";"Code";"Debit/credit";"Amount (EUR)";"Transaction type";"Notifications";"Resulting balance";"Tag"
const ING_BANK_CSV_COLUMNS = [
  'Date',
  'Name / Description',
  'Account',
  'Counterparty',
  'Code',
  'Debit/credit',
  'Amount (EUR)',
  'Transaction type',
  'Notifications',
  'Resulting balance',
  'Tag'
];

function toDate(str: string): Date {
  const year = parseInt(str.substring(0, 4));
  const month = parseInt(str.substring(4, 6));
  const day = parseInt(str.substring(6, 8));
  // console.log(str, year, month, day);
  return new Date(year, month, day);
}

function parseLines(lines: string[]): WorldLedgerMutation[] {
  const objects = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '') {
      continue;
    }
    const cells = lines[i].split(';').map((c: string) => c.substring(1, c.length - 2));
    // console.log(cells)
    if (cells.length !== ING_BANK_CSV_COLUMNS.length) {
      throw new Error('number of columns doesn\'t match!');
    }
    const obj = {
      fullInfo: '',
      // impliedBy: `${csvUrl}#L${i + 1}` // First line is line 1
    };
    for (let i=0; i< ING_BANK_CSV_COLUMNS.length; i++) {
      obj[ING_BANK_CSV_COLUMNS[i]] = cells[i];
      obj.fullInfo += `${ING_BANK_CSV_COLUMNS[i]}: ${cells[i]},`;
    }
    objects.push(obj);
  }
  return objects.map(obj => {
    const date = toDate(obj.Date)
    return new WorldLedgerMutation({
      from: obj.Account,
      to: obj.Counterparty,
      date,
      amount: parseFloat(obj['Amount (EUR)'].split(',').join('.')),
      unit: 'EUR',
      data: {
        halfTradeId: `ing-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
        description: `${obj.globaleTransactiecode} transaction | ${obj.fullInfo}`,
        impliedBy: obj.impliedBy,
        fullInfo: obj.fullInfo
      }
    });
  });
}

export function parseIngbankCsv ({ fileBuffer, fileId }): AccountHistoryChunk {
  return parseGeneric({
    fileBuffer,
    fileId,
    parseLines,
    account: 'me-ingbank',
    parserName: PARSER_NAME,
    parserVersion: PARSER_VERSION
  });
}
