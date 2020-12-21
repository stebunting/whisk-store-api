// Requirements
import { DateTime } from 'luxon';

// Function to calculate MOMs amount from a final sale price (rounded to nearest krona)
function calculateMoms(gross: number, momsRate: number): number {
  const decimalRate = 1 + (momsRate / 100);
  return Math.round(gross - (gross / decimalRate));
}

interface PriceFormatOptions {
  includeOre?: boolean,
  includeSymbol?: boolean
}

function priceFormat(n: number, userOptions = {} as PriceFormatOptions): string {
  const options: PriceFormatOptions = {
    includeOre: userOptions.includeOre || false,
    includeSymbol: true
  };

  if (userOptions.includeSymbol === false) {
    options.includeSymbol = false;
  } else {
    options.includeSymbol = true;
  }
  const num = (n == null || Number.isNaN(n)) ? 0 : n;
  let str = (num / 100).toLocaleString(undefined, {
    minimumFractionDigits: options.includeOre ? 2 : 0,
    maximumFractionDigits: options.includeOre ? 2 : 0
  });
  str = str.replace(/,/g, '');
  str += options.includeSymbol ? ' SEK' : '';
  return str;
}

interface DateCode {
  datetime: DateTime,
  dateLong: string,
  year: number,
  month: number,
  date: number,
  code: string,
  startTime: string,
  endTime: string,
  range: string
}

// Parse Date Code
function parseDateCode(code: string): DateCode {
  const [yearStr, monthStr, dayStr, startTime, endTime] = code.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const datetime = DateTime.fromObject({ year, month, day });
  const dateLong = datetime.toLocaleString({
    weekday: 'long',
    month: 'long',
    day: '2-digit'
  });
  return {
    datetime,
    dateLong,
    year,
    month,
    date: day,
    code: `${year}-${month}-${day}`,
    startTime,
    endTime,
    range: `${dateLong} (${startTime} - ${endTime})`
  };
}

// Capitalise first letter in word
function capitaliseFirst(word: string): string {
  return `${word.charAt(0).toUpperCase()}${word.substring(1).toLowerCase()}`;
}

export {
  calculateMoms,
  priceFormat,
  parseDateCode,
  capitaliseFirst
};
