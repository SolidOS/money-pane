import { v4 as uuidV4 } from 'uuid'
import { HalfTrade } from '../Ledger';
import { toDate } from "./asnbank-csv";

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

function parseLines(lines) {
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

export function importWiebetaaltwatScrape(text: string, filePath: string): HalfTrade[] {
  return parseLines(text.split('\n')).map(obj => {
    return {
      from: obj.from,
      to: obj.to,
      date: toDate(obj.date),
      amount: obj.amount,
      unit: 'EUR',
      halfTradeId: `wiebetaaltwat-${obj.date}-${obj.from}-${obj.to}-${uuidV4()}`,
      description: obj.description,
      impliedBy: obj.impliedBy,
      fullInfo: obj.fullInfo
    }
  })
}