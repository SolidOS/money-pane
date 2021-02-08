import { IndexedFormula, namedNode, NamedNode } from 'rdflib'
import { ns } from 'solid-ui'

ns.halftrade = (label: string) => namedNode(`https://ledgerloops.com/vocab/halftrade#${label}`)
ns.money = (tag: string) => namedNode(`https://example.com/#${tag}`) // @@TBD

const ING_BANK_CSV_COLUMNS = [
  'Date',
  'Name / Description',
  'Account',
  'Counterparty',
  'Code',
  'Debit/credit',
  'Amount (EUR)',
  'Transaction type',
  'Notifications',
  'Resulting balance',
  'Tag'
];

// This list uses the exact names as documented in Dutch
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
const PAYPAL_CSV_COLUMNS = [
  'Datum',
  'Tijd',
  'Tijdzone',
  'Omschrijving',
  'Valuta',
  'Bruto',
  'Kosten',
  'Net',
  'Saldo',
  'Transactiereferentie',
  'Van e-mailadres',
  'Naam',
  'Naam bank',
  'Bankrekening',
  'Verzendkosten',
  'BTW',
  'Factuurreferentie',
  'Reference Txn ID'
];
export class TransactionLogEntry {
  account: string
  amount: number
  currency: string
  date: Date
  newBalance?: number
  transactionType?: string
  counterParty: {
    name?: string
    iban?: string
    incassantId?: string
    mcc?: string
    description?: string
  }
}

export const HALF_TRADE_FIELDS = [
  'date',
  'from',
  'to',
  'amount',
  'unit',
  'impliedBy',
  'description',
  'fullInfo'
];

export class HalfTrade {
  uri?: NamedNode
  halfTradeId: string
  // These should match HALF_TRADE_FIELDS above:
  date: Date
  from: string
  to: string
  amount: number
  unit: string
  impliedBy: string
  description: string
  fullInfo: string
  constructor(uri: NamedNode, kb: IndexedFormula) {
    this.uri = uri
    HALF_TRADE_FIELDS.forEach((field: string) => {
      const pred = ns.halftrade(field)
      console.log('Finding', uri, pred, uri.doc())
      this[field]
      const node = kb.any(uri, pred, undefined, uri.doc())
      if (node) {
        this[field] = node.value
      }
    })
    console.log('constructed', this)
  }
}

export class Shop {
  id: string
  name: string
  city: string
  mcc: number
  constructor(values: { name: string, city: string, mcc: number }) {
    this.name = values.name
    this.city = values.city
    this.mcc = values.mcc
    this.id = this.generateId(values)
  }
  generateId(values: { name: string, city: string, mcc: number }) {
    return `${values.name.replace(' ', '_')}:${values.city.replace(' ', '_')}:${values.mcc}`
  }
}

export class SettledPurchase {
  date: Date
  shopId: string
  amount: number
  purchaseId: string
  constructor(values: { date: Date, shopId: string, amount: number, settlementTransactionId: string}) {
    this.date = values.date
    this.shopId = values.shopId
    this.amount = values.amount
    this.purchaseId = `purchase-settled-by-${values.settlementTransactionId}`
  }
}