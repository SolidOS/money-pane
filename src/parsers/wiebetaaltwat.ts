import { v4 as uuidV4 } from 'uuid'
import { AccountHistoryChunk, Balance, HalfTrade, ImportDetails, WorldLedgerMutation } from '../Ledger';
import { parseGeneric } from './parseGeneric';

const PARSER_NAME = 'wiebetaaltwat';
const PARSER_VERSION = 'v0.1.0';

function toDate(str: string) {
  // e.g. 30-12-19
  const dateStrMatches = /(.+)-(.*)-(.*)/g.exec(str)
  if (!dateStrMatches) {
    return null
  }
  const day = parseInt(dateStrMatches[1], 10);
  const month = parseInt(dateStrMatches[2], 10) - 1;
  const year = 2000 + parseInt(dateStrMatches[3], 10);
  const date = new Date(Date.UTC(year, month, day));
  console.log('toDate', str, year, month, day, date);
  return date
}

// WieBetaaltWat has several formats:
// Alice // tickets //  € 100,00 // 16-02-18 // Bob, Charlie, Dan
// Alice // tickets //  € 100,00 // 16-02-18 // Bob, Charlie (50,00), Dan
// Alice // tickets //  € 100,00 // 16-02-18 // Bob, Charlie (50,00), Dan (20,00)
// Alice // tickets //  € 100,00 // 16-02-18 // Bob (30,00), Charlie (50,00), Dan (20,00)
// Alice // tickets //  € 100,00 // 16-02-18 // Bob, Charlie (2x), Dan

function parseWbwToParts(amount, tos) {
  let total = 0;
  let parts = {};
  tos.forEach(to => {
    const match = to.match(/^([a-zA-Z0-9]*) \((.*)x\)$/);
    let name = to;
    let times = 1;
    if (match !== null) {
      name = match[1];
      times = parseInt(match[2]);
    }
    parts[name] = times;
    total += times;
  });
  const factor = amount / total;
  Object.keys(parts).forEach(name => {
    parts[name] = parts[name] * factor;
  });
  console.log('parsed', parts);
  return parts;
}

function parseWbwTo(amount, tos) {
  if (tos[0].match(/^[a-zA-Z0-9]* \((.*)x\)$/) !== null) {
      return parseWbwToParts(amount, tos);
  }
  const entries = {};
  let spent = 0;
  // pass 1
  tos.forEach(to => {
    const match = to.match(/^([a-zA-Z0-9]*) \((.*),(.*)\)$/);
    if (match !== null) {
      const name = match[1];
      const thisAmount = parseFloat(`${match[2]}.${match[3]}`);
      entries[name] = thisAmount;
      spent += thisAmount;
    }
  });
  const restPart = (amount - spent) / (tos.length - Object.keys(entries).length);
  // console.log({ restPart, amount, spent, tos, entries });
  // pass 2
  tos.forEach(to => {
    const parts = to.split(' ');
    if (parts.length == 1) {
      entries[parts[0]] = restPart;
    }
  });
  // console.log('parsed', entries);
  return entries;
}

function parseLines(lines: string[]): WorldLedgerMutation[] {
  let cursor = 0;
  const mutations = [];
  do {
    const entryAmount = parseFloat(lines[cursor+2].split(' ')[1].replace(',', '.'));
    const amounts = parseWbwTo(entryAmount, lines[cursor+4].split(', '));
    let sanityCheck = 0;
    Object.keys(amounts).forEach(name => {
      mutations.push(new WorldLedgerMutation({
        from: lines[cursor],
        to: name,
        amount: amounts[name],
        date: toDate(lines[cursor+3]),
        unit: 'EUR',
        data: {
          description: lines[cursor+1],
          fullInfo: lines.slice(cursor, cursor + 6),
        }
      }));
      sanityCheck += amounts[name];
    });
    if (Math.abs(sanityCheck - entryAmount) > 0.01) {
      console.log({ cursor, amounts, entryAmount });
      throw new Error(`Split amounts don\'t add up! ${sanityCheck} != ${entryAmount} | ${Math.abs(sanityCheck - entryAmount)}`);
    }
    cursor += 6;
  } while(cursor < lines.length);
  return mutations;
}

export function parseWieBetaaltWat ({ fileBuffer, fileId, details }) {
  return parseGeneric({
    fileBuffer,
    fileId,
    parserName: PARSER_NAME,
    parserVersion: PARSER_VERSION,
    account: details.account,
    parseLines
  });
}