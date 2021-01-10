function isYear(str) {
  let asNumber = parseInt(str, 10);
  if (isNaN(asNumber)) {
    return false;
  }
  if (asNumber < 1900) {
    return false;
  }
  if (asNumber > 2500) {
    return false;
  }
  return true;
}

function toEnglish(dateStr) {
  const parts = dateStr.split(' ');
  const months = {
    'januari': 'January',
    'februari': 'February',
    'maart': 'March',
    'april': 'April',
    'mei': 'May',
    'juni': 'June',
    'juli': 'July',
    'augustus': 'August',
    'september': 'September',
    'oktober': 'October',
    'november': 'November',
    'december': 'December'
  }
  return `${parts[0]} ${months[parts[1]]}`;
}

function parseLines(lines) {
  let year = '2021';
  let date = new Date();
  let cursor = 14;
  const entries = [];
  do {
    if (lines[cursor].startsWith('Periode ')) {
      cursor += 9;
    }
    if (isYear(lines[cursor])) {
      year = lines[cursor];
      cursor++;
    }
    if (lines[cursor] !== '') {
      date = new Date(`${toEnglish(lines[cursor])} ${year} UTC`);
      cursor++;
    }
    if (lines[cursor] === 'EUR') {
      cursor++;
    }
    if (lines[cursor] !== '') {
      console.log(entries);
      throw new Error(`Expected newline at line ${cursor}!`);
    };
    cursor++;
    const description = lines[cursor];
    cursor++;
    const amount = lines[cursor];
    cursor++;
    entries.push({ description, date, amount });
  } while (cursor < lines.length);
  console.log(entries);
}

export function importIngCcScrape(text: string, filePath: string) {

}