import { v4 as uuidV4 } from 'uuid'
import { AccountHistoryChunk, Balance, ImportDetails, WorldLedgerMutation } from '../Ledger';
import { toDate } from './asnbank-csv';
import { makePositive, parseGeneric } from './parseGeneric';

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

function getAmount(amountStr: string) {
  const match = /.(.*),(.*)EUR/g.exec(amountStr)
  if (match === null) {
    return 0
  }
  return parseFloat(`${match[1]}.${match[2]}`)
}

export function parseIngCreditcardScrape ({ fileBuffer, fileId, details }): AccountHistoryChunk {
  return parseGeneric({
    fileBuffer,
    fileId,
    account: details.account,
    parseLines: (lines: string[]) => {
      // console.log('parsing lines', lines);
      let year = '2021';
      let date = new Date();
      let cursor = 14;
      const mutations = [];
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
          console.log(mutations);
          throw new Error(`Expected newline at line ${cursor}!`);
        };
        cursor++;
        const description = lines[cursor];
        cursor++;
        const amount = lines[cursor];
        cursor++;
        mutations.push(makePositive(new WorldLedgerMutation({
          from: details.account,
          to: (description ? description.split(' ')[0] : 'Counterparty'),
          date,
          amount: getAmount(amount),
          unit: 'EUR',
          data: {
            description,
            fullInfo: lines.slice(cursorStarted, cursor),
          }
        })));
      } while (cursor < lines.length);
      return mutations;
    },
    parserName: PARSER_NAME,
    parserVersion: PARSER_VERSION
  });
}
