import { HalfTrade, SettledPurchase, Shop } from '../Ledger'

function capitalize(str) {
  let truncated
  if (str[str.length - 1] == ' ') {
    truncated = str.trim()
  } else {
    truncated = `${str}...`
  }
  return truncated.split(' ').map(x => x[0] + x.substring(1).toLowerCase()).join(' ')
}


// The ledger between 'me' and the specific ASN Bank account number
// should be an almost exact transaction-by-transaction copy of what was imported.
// It should be robust to re-import and contain the exact text of the import line.
// The HalfTrade from the bank to the shop is implied
// As is the HalfTrade from the shop to the budget

function parseAsnBankTransaction (obj, bankAccountNumber): HalfTrade[] {
  console.log('parsing', obj)
  return [
    {
      from: bankAccountNumber,
      to: 'me',
      date: new Date(obj.boekingsdatum),
      amount: parseFloat(obj.transactiebedrag),
      unit: obj.valutasoortMutatieMutatie,
      halfTradeId: `imported-from-asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
      description: obj.omschrijving
    }
  ]
  switch (obj.globaleTransactiecode) {
    case 'ACC': // Acceptgirobetaling AF Afboeking
      console.log(obj)
      throw new Error(`Please implement parseAsnBankTransaction for globale transactiecode ${obj.globaleTransactiecode}`)
    case 'AFB': // Afbetalen
      console.log(obj)
      throw new Error(`Please implement parseAsnBankTransaction for globale transactiecode ${obj.globaleTransactiecode}`)
    case 'BEA': { // Betaalautomaat BIJ Bijboeking
      const shop = new Shop({
        name: capitalize(obj.omschrijving.substring(1, 23)),
        city: capitalize(obj.omschrijving[24] + obj.omschrijving.substring(25, 33)),
        mcc: obj.omschrijving.substring(69).split(' ')[0]
      })
      return [
        {
          from: shop.id,
          to: 'me',
          date: new Date(obj.boekingsdatum),
          amount: -parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatieMutatie,
          halfTradeId: `purchase-implied-by-asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `Purchase implied by ${obj.globaleTransactiecode} transaction`
        },
        {
          from: obj.opdrachtgeversrekening,
          to: shop.id,
          date: new Date(obj.boekingsdatum),
          amount: -parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatieMutatie,
          halfTradeId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `${obj.globaleTransactiecode} transaction`
        }
      ]
    }
    case 'BTL': { // Buitenlandse Overboeking
      // FIXME: hard to interpret this
      return [
        {
          from: obj.opdrachtgeversrekening,
          to: 'abroad',
          date: new Date(obj.boekingsdatum),
          amount: -parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatieMutatie,
          halfTradeId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `${obj.globaleTransactiecode} transaction`
        }
      ]
    }
    case 'CHP': // Chipknip
      console.log(obj)
      throw new Error(`Please implement parseAsnBankTransaction for globale transactiecode ${obj.globaleTransactiecode}`)
    case 'CHQ': // Cheque
      console.log(obj)
      throw new Error(`Please implement parseAsnBankTransaction for globale transactiecode ${obj.globaleTransactiecode}`)
    case 'COR': { // Correctie
      // FIXME: hard to interpret this
      return [
        {
          from: obj.opdrachtgeversrekening,
          to: 'unknown',
          date: new Date(obj.boekingsdatum),
          amount: -parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatieMutatie,
          halfTradeId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `${obj.globaleTransactiecode} transaction`
        }
      ]
    }
    case 'DIV': { // Diversen
      if (obj.omschrijving === "'Kosten gebruik betaalrekening inclusief 1 betaalpas'") {
        const shop = new Shop({ name: 'ASN Bank', city: '', mcc: 0 })
        return [
          {
            from: shop.id,
            to: 'me',
            date: new Date(obj.boekingsdatum),
            amount: -parseFloat(obj.transactiebedrag),
            unit: obj.valutasoortMutatieMutatie,
            halfTradeId: `purchase-implied-by-asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
            description: `Purchase implied by ${obj.globaleTransactiecode} transaction`
          },
          {
            from: obj.opdrachtgeversrekening,
            to: shop.id,
            date: new Date(obj.boekingsdatum),
            amount: -parseFloat(obj.transactiebedrag),
            unit: obj.valutasoortMutatieMutatie,
            halfTradeId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
            description: `${obj.globaleTransactiecode} transaction`
          }
        ]
      }
      if (obj.transactiebedrag === '0.00') {
        return []
      }
      // FIXME: hard to interpret this
      return [
        {
          from: obj.opdrachtgeversrekening,
          to: 'unknown',
          date: new Date(obj.boekingsdatum),
          amount: -parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatieMutatie,
          halfTradeId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `${obj.globaleTransactiecode} transaction`
        }
      ]
    }
    case 'EFF': // Effectenboeking
      console.log(obj)
      throw new Error(`Please implement parseAsnBankTransaction for globale transactiecode ${obj.globaleTransactiecode}`)
    case 'ETC': // Euro traveller cheques GBK GiroBetaalkaart
      console.log(obj)
      throw new Error(`Please implement parseAsnBankTransaction for globale transactiecode ${obj.globaleTransactiecode}`)
    case 'GEA': { // Geldautomaat
      return [
        {
          from: obj.opdrachtgeversrekening,
          to: 'cash',
          date: new Date(obj.boekingsdatum),
          amount: -parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatie,
          halfTradeId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `${obj.globaleTransactiecode} transaction`
        }
      ]
    }
    case 'INC': {// Incasso
      let matches = /'Europese incasso: (.*)-Incassant ID: (.*)-Kenmerk Machtiging: (.*)'/g.exec(obj.omschrijving)
      if (!matches) {
        matches = /'Europese incasso door:(.*)-Incassant ID: (.*)-Kenmerk Machtiging: (.*)'/g.exec(obj.omschrijving)
      }
      if (!matches) {
        throw new Error('help!'+obj.omschrijving)
      }
      // console.log(obj.omschrijving, matches)
      const [ dummy, service, incassantId, kenmerkMachtiging ] = matches
      const purchase = new SettledPurchase({
        date: new Date(obj.boekingsdatum),
        shopId: incassantId,
        amount: -parseFloat(obj.transactiebedrag),
        settlementTransactionId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`
      })
      return [
        {
          from: service,
          to: 'me',
          date: new Date(obj.boekingsdatum),
          amount: -parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatie,
          halfTradeId: `purchase-implied-by-asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `Purchase implied by ${obj.globaleTransactiecode} transaction`
        },
        {
          from: obj.opdrachtgeversrekening,
          to: service,
          date: new Date(obj.boekingsdatum),
          amount: -parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatie,
          halfTradeId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `${obj.globaleTransactiecode} transaction`
        }
      ]
  }
    case 'IDB': { // iDEAL betaling
      // FIXME: this transfer probably implies a purchase of some goods or services
      return [
        {
          from: obj.opdrachtgeversrekening,
          to: obj.tegenrekeningnummer,
          date: new Date(obj.boekingsdatum),
          amount: parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatie,
          halfTradeId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `${obj.globaleTransactiecode} transaction`
        }
      ]
    }
    case 'IMB': // iDEAL betaling via mobiel
      console.log(obj)
      throw new Error(`Please implement parseAsnBankTransaction for globale transactiecode ${obj.globaleTransactiecode}`)
    case 'IOB': { // Interne Overboeking
      return [
        {
          from: obj.opdrachtgeversrekening,
          to: obj.tegenrekeningnummer,
          date: new Date(obj.boekingsdatum),
          amount: parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatie,
          halfTradeId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `${obj.globaleTransactiecode} transaction`
        }
      ]
    }
    case 'KAS': // Kas post
      console.log(obj)
      throw new Error(`Please implement parseAsnBankTransaction for globale transactiecode ${obj.globaleTransactiecode}`)
    case 'KTN': // Kosten/provisies
      console.log(obj)
      throw new Error(`Please implement parseAsnBankTransaction for globale transactiecode ${obj.globaleTransactiecode}`)
    case 'KST': { // Kosten/provisies
      const shop = new Shop({ name: 'ASN Bank', city: '', mcc: 0 })
      return [
        {
          from: shop.id,
          to: 'me',
          date: new Date(obj.boekingsdatum),
          amount: -parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatie,
          halfTradeId: `purchase-implied-by-asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `Purchase implied by ${obj.globaleTransactiecode} transaction`
        },
        {
          from: obj.opdrachtgeversrekening,
          to: shop.id,
          date: new Date(obj.boekingsdatum),
          amount: -parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatie,
          halfTradeId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `${obj.globaleTransactiecode} transaction`
        }
      ]
    }
    case 'OVB': { // Overboeking
      return [
        {
          from: obj.opdrachtgeversrekening,
          to: obj.tegenrekeningnummer,
          date: new Date(obj.boekingsdatum),
          amount: parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatie,
          halfTradeId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `${obj.globaleTransactiecode} transaction`
        }
      ]
    }
    case 'PRM': // Premies
      console.log(obj)
      throw new Error(`Please implement parseAsnBankTransaction for globale transactiecode ${obj.globaleTransactiecode}`)
    case 'PRV': // Provisies
      console.log(obj)
      throw new Error(`Please implement parseAsnBankTransaction for globale transactiecode ${obj.globaleTransactiecode}`)
    case 'RNT': { // Rente
      if (obj.omschrijving.startsWith("'DEBETRENTE") || obj.omschrijving.startsWith("'CREDITRENTE")) {
        const shop = new Shop({ name: 'ASN Bank', city: '', mcc: 0 })
        return [
          {
            from: shop.id,
            to: 'me',
            date: new Date(obj.boekingsdatum),
            amount: -parseFloat(obj.transactiebedrag),
            unit: obj.valutasoortMutatie,
            halfTradeId: `purchase-implied-by-asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
            description: `Purchase implied by ${obj.globaleTransactiecode} transaction`
          },
          {
            from: obj.opdrachtgeversrekening,
            to: shop.id,
            date: new Date(obj.boekingsdatum),
            amount: -parseFloat(obj.transactiebedrag),
            unit: obj.valutasoortMutatie,
            halfTradeId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
            description: `${obj.globaleTransactiecode} transaction`
          }
        ]
        }
      console.log(obj)
      throw new Error('Rente, onbekend!')
    }
    case 'STO': { // Storno
      // FIXME: if this undoes a transaction that implied a purchase,
      // then the purchase should also be undone
      return [
        {
          from: obj.opdrachtgeversrekening,
          to: obj.tegenrekeningnummer,
          date: new Date(obj.boekingsdatum),
          amount: parseFloat(obj.transactiebedrag),
          unit: obj.valutasoortMutatie,
          halfTradeId: `asn-bank-${obj.journaaldatum}-${obj.volgnummerTransactie}`,
          description: `${obj.globaleTransactiecode} transaction`
        }
      ]
    }
    case 'TEL': // Telefonische Overboeking VV Vreemde valuta
      console.log(obj)
      throw new Error(`Please implement parseAsnBankTransaction for globale transactiecode ${obj.globaleTransactiecode}`)
    default:
      console.log(obj)
      throw new Error(`Unknown globale transactiecode ${obj.globaleTransactiecode}`)
    }
}

// This type uses the exact names as documented in Dutch
// at https://www.asnbank.nl/web/file?uuid=fc28db9c-d91e-4a2c-bd3a-30cffb057e8b&owner=6916ad14-918d-4ea8-80ac-f71f0ff1928e&contentid=852
const ASN_BANK_CSV_COLUMNS = [
  'boekingsdatum', // dd-mm-jjjj Dit veld geeft de datum weer waarop de transactie daadwerkelijk heeft plaatsgevonden. Voorbeeld: 3­4­2000
  'opdrachtgeversrekening', // X (18) Uw ASN­Rekening (IBAN). Voorbeeld: NL01ASNB0123456789
  'tegenrekeningnummer', // X (34) Dit veld bevat het rekeningnummer (IBAN) naar of waarvan de transactie afkomstig is. Het IBAN telt maximaal 34 alfanumerieke tekens en heeft een vaste lengte per land. Het IBAN bestaat uit een landcode (twee letters), een controlegetal (twee cijfers) en een (voor bepaalde landen aangevuld) nationaal rekeningnummer. Voorbeeld: NL01BANK0123456789
  'naamTegenrekening', // X (70) Hier wordt de naam van de tegenrekening vermeld. De naam is maximaal 70 posities lang en wordt in kleine letters weergegeven. Voorbeeld: jansen
  'adres', // niet gebruikt
  'postcode', // niet gebruikt
  'plaats', // niet gebruikt
  'valutasoortRekening', // XXX Dit veld geeft de ISO valutasoort van de rekening weer. Een bestand kan verschillende valutasoorten bevatten. Voorbeeld: EUR
  'saldoRekeningVoorMutatie', // ­999999999.99 Geeft het saldo weer van de rekening voordat de mutatie is verwerkt. Als decimaal scheidingsteken wordt een punt gebruikt. Er wordt geen duizend separator gebruikt. In het geval van een negatieve waarde wordt het bedrag voorafgegaan van een – (min) teken. Voorbeeld: 122800.83 of ­123.30
  'valutasoortMutatie', // XXX Dit veld geeft de ISO valutasoort van de mutatie weer. Een bestand kan verschillende valutasoorten bevatten. Voorbeeld: EUR
  'transactiebedrag', // ­999999999.99 Geeft het transactiebedrag weer. Als decimaal scheidingsteken wordt een punt gebruikt. Een negatief bedrag wordt voorafgegaan door een – (min) teken. Voorbeeld: 238.45 of ­43.90
  'journaaldatum', // dd­mm­jjjj De journaaldatum is de datum waarop een transactie in de systemen van ASN Bank wordt geboekt. Dit hoeft niet noodzakelijkerwijs gelijk te zijn aan de boekingsdatum. Voorbeeld: 21­01­2000
  'valutadatum', // dd­mm­jjjj Dit veld geeft de valutadatum weer. De valutadatum is de datum waarop een bedrag rentedragend wordt. Voorbeeld: 01­04­2001
  'interneTransactiecode', // 9999 Dit is een interne transactiecode zoals die door de ASN Bank wordt gebruikt. Deze transactiecodes kunnen gebruikt worden om heel verfijnd betaalde transacties te herkennen. Zoals een bijboeking van een geldautomaat opname. Er kan geen garantie worden gegeven dat deze codes in de toekomst hetzelfde blijven en/of dat er codes vervallen en/of toegevoegd zullen worden. Voorbeeld: 8810 of 9820
  'globaleTransactiecode', // XXX De globale transactiecode is een vertaling van de interne transactiecode. Gebruikte afkortingen zijn bijvoorbeeld BEA voor een betaalautomaat opname of GEA voor een geldautomaat opname. In de bijlage wordt een overzicht gegeven van alle gebruikte afkortingen. Voorbeeld: GEA of BEA of VV. Zie ook Bijlage 1: Gebruikte boekingscodes
  'volgnummerTransactie', // N (8) Geeft het transactievolgnummer van de transactie weer. Dit volgnummer vormt samen met de journaaldatum een uniek transactie id. Voorbeeld: 90043054
  'betalingskenmerk', // X (16) Het betalingskenmerk bevat de meest relevante gegevens zoals die door de betaler zijn opgegeven. Zoals debiteuren nummer en/of factuurnummer. Het betalingskenmerk wordt tussen enkele quotes (’) geplaatst. Voorbeeld: ’factuur 9234820’
  'omschrijving', // X (140) De omschrijving zoals die bij de overboeking is opgegeven. De omschrijving kan maximaal 140 posities beslaan. Voorbeeld ’02438000140032extra trekking werelddierendag 4info’
  'afschriftnummer', // N (3) Het nummer van het afschrift waar de betreffende boeking op staat vermeld. Voorbeeld: 42
]

function parseCsv (csv: string, columnNames: string[]): { [fieldName: string]: string }[] {
  const objs = []
  let lines = csv.split('\n')
  if (lines[lines.length - 1].length === 0) {
    lines = lines.slice(0, lines.length - 1)
  } else {
    console.warn('Last line seems to be missing its newline at the end')
  }
  lines.map(line => line.split(','))
    .map(arr => {
      if (arr.length === columnNames.length) {
        const obj = {}
        for (let i=0; i < arr.length; i++) {
          // console.log(i, columnNames[i], arr[i])
          obj[columnNames[i]] = arr[i]
        }
        objs.push(obj)
      } else {
        console.warn(`Expected ${columnNames} columns but saw ${arr.length}:`)
        console.warn(arr)
      }
    })
  return objs
}

export function csvFileNameToData(fileName: string) {
  // e.g. 1234567890_17082020_123456
  const [ iban, dateStr, transactionNumber] = fileName.split('.')[0].split('_')
  return {
    iban,
    dateStr,
    transactionNumber
  }
}

export function parseAsnCsv(csv: string, iban: string): HalfTrade[] {
  return parseCsv(csv, ASN_BANK_CSV_COLUMNS)
    .map(parseAsnBankTransaction, iban)
    .reduce((acc: HalfTrade[], val: HalfTrade[]): HalfTrade[] => acc.concat(val), []); // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
}
