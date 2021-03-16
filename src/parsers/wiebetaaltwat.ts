import { v4 as uuidV4 } from 'uuid'
import { AccountHistoryChunk, Balance, HalfTrade, ImportDetails, WorldLedgerMutation } from '../Ledger';
import { toDate } from "./asnbank-csv";

const PARSER_NAME = 'wiebetaaltwat';
const PARSER_VERSION = 'v0.1.0';

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
  // console.log('parsed', parts);
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

function parseLines(lines, scrapeFileUrl) {
  let cursor = 0;
  const entries = [];
  do {
    const entryAmount = parseFloat(lines[cursor+2].split(' ')[1].replace(',', '.'));
    const amounts = parseWbwTo(entryAmount, lines[cursor+4].split(', '));
    let sanityCheck = 0;
    Object.keys(amounts).forEach(name => {
      entries.push({
        from: lines[cursor],
        description: lines[cursor+1],
        to: name,
        amount: amounts[name],
        date: lines[cursor+3],
        fullInfo: lines.slice(cursor, cursor + 6),
        impliedBy: `${scrapeFileUrl}#L${cursor + 1}-L${cursor + 5}` // First line is line 1
      });
      sanityCheck += amounts[name];
    });
    if (Math.abs(sanityCheck - entryAmount) > 0.01) {
      console.log({ cursor, amounts, entryAmount });
      throw new Error(`Split amounts don\'t add up! ${sanityCheck} != ${entryAmount} | ${Math.abs(sanityCheck - entryAmount)}`);
    }
    cursor += 6;
  } while(cursor < lines.length);
  return entries;
}

export function parseWieBetaaltWat ({ fileBuffer, fileId }) {
  let startDate = new Date('31 Dec 9999');
  let endDate = new Date('1 Jan 100');
  const mutations = parseLines(fileBuffer.toString().split('\n'), fileId).map(obj => {
    const date = toDate(obj.date);
    if (date < startDate) {
      startDate = date
    }
    if (date > endDate) {
      endDate = date
    }
    return new WorldLedgerMutation({
      from: obj.from,
      to: obj.to,
      date,
      amount: obj.amount,
      unit: 'EUR',
      data: {
        halfTradeId: `wiebetaaltwat-${obj.date}-${obj.from}-${obj.to}-${uuidV4()}`,
        description: obj.description,
        impliedBy: obj.impliedBy,
        fullInfo: obj.fullInfo
      }
    })
  });
  return new AccountHistoryChunk({
    account: 'me-wie-betaalt-wat',
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