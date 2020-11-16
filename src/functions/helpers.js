// Function to calculate MOMs amount from a final sale price (rounded to nearest krona)
function calculateMoms(gross, momsRate) {
  const decimalRate = 1 + (momsRate / 100);
  return Math.round(gross - (gross / decimalRate));
}

function priceFormat(n, userOptions = {}) {
  const options = {
    includeOre: userOptions.includeOre || false
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

module.exports = {
  calculateMoms,
  priceFormat
};
