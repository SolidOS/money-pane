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
  const year = Number.parseInt(str.substring(0, 4), 10);
  const month = Number.parseInt(str.substring(4, 6), 10);
  const day = Number.parseInt(str.substring(6, 8), 10);
  const date = new Date(Date.UTC(year, month - 1, day))
  // console.log('toDate', str, year, month, day, date);
  return date;
}

export function parseIngbankCsv ({ fileBuffer, fileId, details }): AccountHistoryChunk {
  return parseGeneric({
    fileBuffer,
    fileId,
    parseLines: (lines: string[]): WorldLedgerMutation[] => {
      const mutations = [];
      // Top line is header, start at line 1
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '') {
          continue;
        }
        const cells = lines[i].split(';').map((c: string) => c.substring(1, c.length - 1));
        // console.log(cells)
        if (cells.length !== ING_BANK_CSV_COLUMNS.length) {
          throw new Error('number of columns doesn\'t match!');
        }
        const obj: any = {
          fullInfo: '',
          // impliedBy: `${csvUrl}#L${i + 1}` // First line is line 1
        };
        for (let i=0; i< ING_BANK_CSV_COLUMNS.length; i++) {
          obj[ING_BANK_CSV_COLUMNS[i]] = cells[i];
          obj.fullInfo += `${ING_BANK_CSV_COLUMNS[i]}: ${cells[i]},`;
        }
        const date = toDate(obj.Date)
        let amountSign: number;
        if (obj['Debit/credit'] === 'Credit') {
          amountSign = -1;
        } else if (obj['Debit/credit'] === 'Debit') {
          amountSign = 1;
        } else {
          throw new Error(`Debit or Credit? "${obj['Debit/credit']}"`);
        }
        Object.keys(details.creditCardsLinked).forEach(creditCardAccountNr => {
          if (obj['Name / Description'] === `INCASSO CREDITCARD ACCOUNTNR ${creditCardAccountNr}`) {
            obj.Counterparty = details.creditCardsLinked[creditCardAccountNr];
          }
        });
        mutations.push(new WorldLedgerMutation({
          from: obj.Account,
          to: obj.Counterparty || 'Counter Party',
          date,
          amount: amountSign * parseFloat(obj['Amount (EUR)'].split(',').join('.')),
          unit: 'EUR',
          data: {
            halfTradeId: `ing-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
            description: `${obj.globaleTransactiecode} transaction | ${obj.fullInfo}`,
            impliedBy: obj.impliedBy,
            fullInfo: obj.fullInfo
          }
        }));
      }
      return mutations
    },
    account: details.account,
    parserName: PARSER_NAME,
    parserVersion: PARSER_VERSION
  });
}
