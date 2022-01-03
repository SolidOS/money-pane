const USD_TO_EUR = 0.85

function parseCurrency (x) {
  if (typeof x === 'string') {
    // console.log("string!", x)
    if (x.startsWith('usd ')) {
      return parseInt(x.substr('usd '.length), 10) * USD_TO_EUR
    } else {
      throw new Error('unknown!')
    }
  }
  return x
}

module.exports = {
  parseCurrency
}
