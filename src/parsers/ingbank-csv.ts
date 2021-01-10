// "Date";"Name / Description";"Account";"Counterparty";"Code";"Debit/credit";"Amount (EUR)";"Transaction type";"Notifications";"Resulting balance";"Tag"
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

function parseLines(lines) {
  lines.forEach(line => {
    if (line === '') {
      return;
    }
    const cells = line.split(';');
    if (cells.length !== ING_BANK_CSV_COLUMNS.length) {
      throw new Error('number of columns doesn\'t match!');
    }
    const obj = {};
    for (let i=0; i< ING_BANK_CSV_COLUMNS.length; i++) {
      obj[ING_BANK_CSV_COLUMNS[i]] = cells[i];
    }
    console.log(obj);
  });
}

export function importIngCsv(text: string, filePath: string) {
  
}