import { HalfTrade } from "../Ledger";
import { toDate } from "./asnbank-csv";

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

function parseLines(lines, csvUrl) {
  const objects = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '') {
      continue;
    }
    const cells = lines[i].split(';');
    if (cells.length !== ING_BANK_CSV_COLUMNS.length) {
      throw new Error('number of columns doesn\'t match!');
    }
    const obj = {
      fullInfo: '',
      impliedBy: `${csvUrl}#L${i + 1}` // First line is line 1
    };
    for (let i=0; i< ING_BANK_CSV_COLUMNS.length; i++) {
      obj[ING_BANK_CSV_COLUMNS[i]] = cells[i];
      obj.fullInfo += `${ING_BANK_CSV_COLUMNS[i]}: ${cells[i]},`;
    }
    objects.push(obj);
  }
  return objects;
}

export function importIngCsv(text: string, filePath: string): HalfTrade[] {
  return parseLines(text.split('\n'), filePath).map(obj => {
    return {
      from: obj.Account,
      to: obj.Counterparty,
      date: toDate(obj.Date),
      amount: -parseFloat(obj['Amount (EUR)']),
      unit: 'EUR',
      halfTradeId: `ing-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
      description: `${obj.globaleTransactiecode} transaction | ${obj.fullInfo}`,
      impliedBy: obj.impliedBy,
      fullInfo: obj.fullInfo
    }
  })
}