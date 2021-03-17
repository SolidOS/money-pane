import { v4 as uuidV4 } from 'uuid'
import { AccountHistoryChunk, Balance, ImportDetails, WorldLedgerMutation } from '../Ledger';
import { toDate } from './asnbank-csv';
import { parseGeneric } from './parseGeneric';

const PARSER_NAME = 'ing-creditcard-scrape';
const PARSER_VERSION = 'v0.1.0';

function isYear(str) {
  let asNumber = parseInt(str, 10);
  if (isNaN(asNumber)) {
    return false;
  }
  if (asNumber < 1900) {
    return false;
  }
  if (asNumber > 2500) {
    return false;
  }
  return true;
}

function toEnglish(dateStr) {
  const parts = dateStr.split(' ');
  const months = {
    'januari': 'January',
    'februari': 'February',
    'maart': 'March',
    'april': 'April',
    'mei': 'May',
    'juni': 'June',
    'juli': 'July',
    'augustus': 'August',
    'september': 'September',
    'oktober': 'October',
    'november': 'November',
    'december': 'December'
  }
  return `${parts[0]} ${months[parts[1]]}`;
}

function parseLines(lines: string[]): WorldLedgerMutation[] {
  // console.log('parsing lines', lines);
  let year = '2021';
  let date = new Date();
  let cursor = 14;
  const entries = [];
  do {
    const cursorStarted = cursor;
    if (lines[cursor].startsWith('Periode ')) {
      cursor += 9;
    }
    if (isYear(lines[cursor])) {
      year = lines[cursor];
      cursor++;
    }
    if (lines[cursor] !== '') {
      date = new Date(`${toEnglish(lines[cursor])} ${year} UTC`);
      cursor++;
    }
    if (lines[cursor] === 'EUR') {
      cursor++;
    }
    if (lines[cursor] !== '') {
      console.log(entries);
      throw new Error(`Expected newline at line ${cursor}!`);
    };
    cursor++;
    const description = lines[cursor];
    cursor++;
    const amount = lines[cursor];
    cursor++;
    entries.push({
      description,
      date,
      amount,
      fullInfo: lines.slice(cursorStarted, cursor),
      // impliedBy: `${scrapeFileUrl}#L${cursorStarted + 1}-L${cursor + 1}` // First line is line 1
    });
  } while (cursor < lines.length);
  return entries.map(obj => new WorldLedgerMutation({
    from: 'ING Creditcard',
    to: 'Counterparty',
    date: obj.date,
    amount: getAmount(obj.amount),
    unit: 'EUR',
    data: {
      halfTradeId: `ing-bank-cc-${obj.date}-${uuidV4()}`,
      description: obj.description
    }
  }));
}

function getAmount(amountStr: string) {
  const match = /.(.*),(.*)EUR/g.exec(amountStr)
  if (match === null) {
    return 0
  }
  return parseFloat(`${match[1]}.${match[2]}`)
}

export function parseIngCreditcardScrape ({ fileBuffer, fileId }): AccountHistoryChunk {
  return parseGeneric({
    fileBuffer,
    fileId,
    account: 'me-ing-creditcard',
    parseLines,
    parserName: PARSER_NAME,
    parserVersion: PARSER_VERSION
  });
}
