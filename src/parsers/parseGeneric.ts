import { AccountHistoryChunk, Balance, ImportDetails, WorldLedgerMutation } from "../Ledger";

export function parseGeneric (args: {
  fileBuffer: Buffer,
  fileId: string,
  parseLines: (lines: string[]) => WorldLedgerMutation[],
  account: string,
  parserName: string,
  parserVersion: string
}): AccountHistoryChunk {
  let startDate = new Date('31 Dec 9999');
  let endDate = new Date('1 Jan 100');
  const mutations = args.parseLines(args.fileBuffer.toString().split('\n'));
  mutations.map(mutation => {
    if (mutation.date < startDate) {
      startDate = mutation.date
    }
    if (mutation.date > endDate) {
      endDate = mutation.date
    }
  });
  return new AccountHistoryChunk({
    account: args.account,
    startBalance: new Balance({
      amount: 0,
      unit: 'EUR'
    }),
    startDate,
    endDate,
    mutations,
    importedFrom: [
      new ImportDetails({
        fileId: args.fileId,
        parserName: args.parserName,
        parserVersion: args.parserName,
        firstAffected: 0,
        lastAffected: mutations.length
      })
    ]
  });
}