import { AccountHistoryChunk, Balance, ImportDetails } from "../Ledger";

export function parseGeneric ({ fileBuffer, fileId, parseLines, account, parserName, parserVersion }): AccountHistoryChunk {
  let startDate = new Date('31 Dec 9999');
  let endDate = new Date('1 Jan 100');
  const mutations = parseLines(fileBuffer.toString().split('\n'));
  mutations.map(mutation => {
    if (mutation.date < startDate) {
      startDate = mutation.date
    }
    if (mutation.date > endDate) {
      endDate = mutation.date
    }
  });
  return new AccountHistoryChunk({
    account,
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
        parserName,
        parserVersion,
        firstAffected: 0,
        lastAffected: mutations.length
      })
    ]
  });
}