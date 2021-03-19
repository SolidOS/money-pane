import { WorldLedgerView, Balance, ImportDetails, WorldLedgerMutation } from "../Ledger";
const PARSER_NAME = 'hours';
const PARSER_VERSION = 'v0.1.0';

type Entry = {
  date: string
  hours: string
  numHours: number
  note: string
}

export type HoursProject = {
  status: string
  rate?: number
  entries: Entry[]
}
export function parseHours (args: { hours: { [ projectName: string]: HoursProject }, year: number }): WorldLedgerView {
  const mutations: WorldLedgerMutation[] = [];
  Object.keys(args.hours).forEach((projectName: string) => {
    const project: HoursProject = args.hours[projectName];
    if (project.rate) {
      project.entries.forEach((entry: Entry) => {
        mutations.push(new WorldLedgerMutation({
          from: 'work',
          to: projectName,
          date: new Date(`${entry.date} ${args.year}`),
          amount: entry.numHours * project.rate,
          unit: 'EUR',
          data: entry
        }))
      })
    }
  })
  const ret = new WorldLedgerView();
  ret.addExhaustiveChunk({
    account: 'worked',
    startDate: new Date(`1 January ${args.year}`),
    endDate: new Date(`1 January ${args.year + 1}`),
    startBalance: new Balance({
      amount: 0,
      unit: 'hours'
    }),
    mutations,
    importedFrom: [
      new ImportDetails({
        fileId: `erp-data-hours-${args.year}`,
        parserName: PARSER_NAME,
        parserVersion: PARSER_VERSION,
        firstAffected: 0,
        lastAffected: mutations.length - 1
      })
    ]
  });
  return ret;
}
