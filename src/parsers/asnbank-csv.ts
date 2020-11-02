export function parseCsv(lines: string[], format: string) {
  if (format !== 'asnbank') {
    throw new Error('please contribute more csv format parsers at https://github.com/solid/money-pane/issues');
  }

  // Types:
  // ACC Acceptgirobetaling
  // AF Afboeking
  // AFB Afbetalen
  // BEA Betaalautomaat
  // BIJ Bijboeking
  // BTL Buitenlandse Overboeking
  // CHP Chipknip
  // CHQ Cheque
  // COR Correctie
  // DIV Diversen
  // EFF Effectenboeking
  // ETC Euro traveller cheques
  // GBK GiroBetaalkaart
  // GEA Geldautomaat
  // INC Incasso
  // IDB iDEAL betaling
  // IMB iDEAL betaling via mobiel
  // IOB Interne Overboeking
  // KAS Kas post
  // KTN Kosten/provisies
  // KST Kosten/provisies
  // OVB Overboeking
  // PRM Premies
  // PRV Provisies
  // RNT Rente
  // STO Storno
  // TEL Telefonische Overboeking
  // VV Vreemde valuta
  const perShop = {};
  lines
    .map(line => line.split(','))
    .map(arr => {
      const [ date1, us, them, themName, d1, d2, d3, balanceCurrency, prevBalance, currency, amount, date2, date3, x1, type, x2, x3, description, x4] = arr;
      return { date1, date2, date3, type, description, amount, from: us, to: them, toName: themName, d1, d2, d3, currency, balanceCurrency, newBalance: prevBalance, x1, x2, x3, x4 };

    }).map(obj => {
      if (obj.type === 'BEA') {
        return {
          shop: obj.description.substring(1, 23),
          details: obj
        };
      } else if (obj.type === 'INC') {
        return {
          shop: obj.description.substring(19, 39),
          details: obj
        };
      } else if (obj.type === 'IDB' || obj.type === 'OVB') {
        return {
          shop: obj.toName,
          details: obj
        };
      } else if (obj.type === 'KST') {
        return {
          shop: 'ASN Bank',
          details: obj
        };
      } else {
        return {
          shop: 'Unknown',
          details: obj
        };
      }
    }).map(({ shop, details }) => {
      if (!perShop[shop]) {
        perShop[shop] = [];
      }
      perShop[shop].push(details);
    });
  return perShop;
}