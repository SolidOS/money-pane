import { AccountHistoryChunk, ImportDetails, WorldLedgerMutation } from '../../src/Ledger'

describe('AccountHistoryChunk', () => {
  it('can addData', () => {
    const existing = new AccountHistoryChunk({
      account: 'iban:NL08INGB0000000555',
      startDate: new Date('20 Jan 2015'),
      endDate: new Date('30 Jan 2015'),
      mutations: [
        new WorldLedgerMutation({
          from: 'iban:NL08INGB0000000123',
          to: 'iban:NL08INGB0000000555',
          date: new Date('25 Jan 2015'),
          amount: 213.04,
          unit: 'EUR',
          data: {
            description: 'donation, good luck!'
          }
        })
      ],
      startBalance: {
        amount: 0,
        unit: 'EUR'
      },
      importedFrom: [
        new ImportDetails({
          fileId: 'some-file.txt',
          parserName: 'txt-parser',
          parserVersion: 'v0.20.4',
          firstAffected: 0,
          lastAffected: 0
        })
      ]
    })
    const other = new AccountHistoryChunk({
      account: 'iban:NL08INGB0000000555',
      startDate: new Date('20 Jan 2015'),
      endDate: new Date('30 Jan 2015'),
      mutations: [
        new WorldLedgerMutation({
          from: 'iban:NL08INGB0000000123',
          to: 'iban:NL08INGB0000000555',
          date: new Date('25 Jan 2015'),
          amount: 213.04,
          unit: 'EUR',
          data: {
            description: 'donation, good luck!'
          }
        })
      ],
      startBalance: {
        amount: 0,
        unit: 'EUR'
      },
      importedFrom: [
        new ImportDetails({
          fileId: 'some-file.other',
          parserName: 'other-parser',
          parserVersion: 'v1.20.4',
          firstAffected: 0,
          lastAffected: 0
        })
      ]
    })
    existing.addData(other)
    expect(existing.importedFrom).toEqual([
      new ImportDetails({
        fileId: 'some-file.txt',
        parserName: 'txt-parser',
        parserVersion: 'v0.20.4',
        firstAffected: 0,
        lastAffected: 0
      }),
      new ImportDetails({
        fileId: 'some-file.other',
        parserName: 'other-parser',
        parserVersion: 'v1.20.4',
        firstAffected: 0,
        lastAffected: 0
      })
    ])
  })
  it.skip('throws an error if description mismatches', () => {
    const existing = new AccountHistoryChunk({
      account: 'iban:NL08INGB0000000555',
      startDate: new Date('20 Jan 2015'),
      endDate: new Date('30 Jan 2015'),
      mutations: [
        new WorldLedgerMutation({
          from: 'iban:NL08INGB0000000123',
          to: 'iban:NL08INGB0000000555',
          date: new Date('25 Jan 2015'),
          amount: 213.04,
          unit: 'EUR',
          data: {
            description: 'donation, good luck!'
          }
        })
      ],
      startBalance: {
        amount: 0,
        unit: 'EUR'
      },
      importedFrom: [
        new ImportDetails({
          fileId: 'some-file.txt',
          parserName: 'txt-parser',
          parserVersion: 'v0.20.4',
          firstAffected: 0,
          lastAffected: 0
        })
      ]
    })
    const other = new AccountHistoryChunk({
      account: 'iban:NL08INGB0000000555',
      startDate: new Date('20 Jan 2015'),
      endDate: new Date('30 Jan 2015'),
      mutations: [
        new WorldLedgerMutation({
          from: 'iban:NL08INGB0000000123',
          to: 'iban:NL08INGB0000000555',
          date: new Date('25 Jan 2015'),
          amount: 213.04,
          unit: 'EUR',
          data: {
            description: 'donation, good lucks!'
          }
        })
      ],
      startBalance: {
        amount: 0,
        unit: 'EUR'
      },
      importedFrom: [
        new ImportDetails({
          fileId: 'some-file.txt',
          parserName: 'txt-parser',
          parserVersion: 'v0.20.4',
          firstAffected: 0,
          lastAffected: 0
        })
      ]
    })
    expect(() => existing.addData(other)).toThrow('data.description doesn\'t match!')
  })
})
