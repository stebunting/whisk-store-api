// Requirements
const assert = require('assert').strict;
const { priceFormat, calculateMoms } = require('../src/functions/helpers');

describe('Helper Functions...', () => {
  describe('convert number to price format...', () => {
    it('with currency symbol', () => {
      assert.strictEqual(priceFormat(1000), '10 SEK');
      assert.strictEqual(priceFormat(786), '8 SEK');
      assert.strictEqual(priceFormat(), '0 SEK');
      assert.strictEqual(priceFormat(123456789), '1234568 SEK');
      assert.strictEqual(priceFormat(5.687), '0 SEK');
      assert.strictEqual(priceFormat(758.415), '8 SEK');
      assert.strictEqual(priceFormat(749.999999999), '7 SEK');
      assert.strictEqual(priceFormat(750), '8 SEK');
      assert.strictEqual(priceFormat(-97297), '-973 SEK');
    });

    it('without currency symbol', () => {
      assert.strictEqual(priceFormat(0, { includeSymbol: false }), '0');
      assert.strictEqual(priceFormat(123456789, { includeSymbol: false }), '1234568');
      assert.strictEqual(priceFormat(12345678901234567, { includeSymbol: false }), '123456789012346');
    });

    it('with öre and currency symbol', () => {
      assert.strictEqual(priceFormat(786, { includeOre: true }), '7.86 SEK');
      assert.strictEqual(priceFormat(1, { includeOre: true }), '0.01 SEK');
    });
  });

  describe('calculate rounded MOMs...', () => {
    it('from gross price and MOMs rate as percentage', () => {
      assert.strictEqual(calculateMoms(112, 12), 12);
      assert.strictEqual(calculateMoms(1300, 12), 139);
      assert.strictEqual(calculateMoms(10, 25), 2);
      assert.strictEqual(calculateMoms(1798, 0), 0);
      assert.strictEqual(calculateMoms(-1798, 25), -360);
      assert.strictEqual(calculateMoms(1798, 25), 360);
      assert.strictEqual(calculateMoms(0, 25), 0);
    });
  });
});
