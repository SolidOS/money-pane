
function mccToCategory (mcc, t, dataRoot) {
  // See https://www.citibank.com/tts/solutions/commercial-cards/assets/docs/govt/Merchant-Category-Codes.pdf
  if (dataRoot.mcc[mcc]) {
    return dataRoot.mcc[mcc]
  }
  // console.log('MCC not found', mcc, t)
  return `MCC-${mcc}`
}

function descriptionToCategory (description, t, dataRoot) {
  const entries = Object.keys(dataRoot.description)
  // console.log('looking for description prefix', description)
  for (let i = 0; i < entries.length; i++) {
    // console.log(entries[i], description.startsWith(entries[i]))
    if (description.startsWith(entries[i])) {
      return dataRoot.description[entries[i]]
    }
  }
  // console.log('description not found', description, t)
  return 'Unknown description'
}

function incassantToCategory (incassantId, t, dataRoot) {
  if (dataRoot.incassant[incassantId]) {
    return dataRoot.incassant[incassantId]
  }
  // console.log('incassant not found', incassantId, t)
  return `INCASSANT-${incassantId}`
}

function ibanToCategory (tegenrekening, omschrijving, t, dataRoot) {
  if (dataRoot.iban[tegenrekening]) {
    if (dataRoot.iban[tegenrekening] === 'Unknown') {
      const strings = dataRoot.description
      let ret = 'Unknown'
      Object.keys(strings).forEach(str => {
        if (omschrijving.indexOf(str) !== -1) {
          ret = strings[str]
        }
      })
      return ret
    }
    return dataRoot.iban[tegenrekening]
  }
  // console.log('iban not found', t)
  return `iban-${tegenrekening}`
}

export function mutationToCategory(mutation, dataRoot) {
  if (mutation.data.mcc) {
    return mccToCategory(mutation.data.mcc, mutation.data.fullTransaction, dataRoot);
  }
  if (mutation.data.incassant) {
    return incassantToCategory(mutation.data.incassant, mutation.data.fullTransaction, dataRoot);
  }
  if (mutation.data.iban) {
    return ibanToCategory(mutation.data.iban, mutation.data.description, mutation.data.fullTransaction, dataRoot);
  }
  return descriptionToCategory(mutation.data.description, mutation.data.fullTransaction, dataRoot);
}