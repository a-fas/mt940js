/**
 * Helper models
 * @module lib/helperModels
 */

/** helper class to parse date based on 2-digit year */
class BankDate {
  /**
   * Parses date
   * @param {string} year - 4-digit or 2-digit year, 20xx assumed for the latter
   * @param {string} month - month number (starting from 1 = January)
   * @param {string} day - day number
   * @return {Date} a Date object
   * @static
   */
  static parse(year, month, day) {
    let fullyear = Number.parseInt(year, 10);
    if (fullyear < 100) {
      fullyear += 2000;
    }
    return new Date(Date.UTC(fullyear, Number.parseInt(month, 10) - 1, day));
  }
}

/** helper class to parse amount and identify it's sign based on Debit/Credit mark */
class BankAmount {

  /**
   * Parses amount, identifies sign based on Debit or Credit mark.
   * @param {string} dcmark - D or C representing Debit or credit (reversed for banks, C = positive)
   * @param {string} amoutStr - string with positive float number
   * @return {float} amount, rounded to 2 fractional digits, with sign
   * @static
   */
  static parse(dcmark, amountStr) {
    if ('DC'.indexOf(dcmark) < 0) {
      throw Error( `Wrong debit/credit mark: ${dcmark}` );
    }
    let amount = Number.parseFloat(amountStr.replace(',', '.'));
    if (Number.isNaN(amount)) { throw Error( `Amount cannot be parsed: ${amountStr}` ); }
    if (amount < 0) { throw Error( `Positive amount string expected: ${amountStr}` ); }
    amount = Math.round(amount * 100) / 100;
    return dcmark === 'C' ? amount : -amount;
  }

  /**
   * Compares amounts (floats in fact), returns True if difference < 0.001
   * @param {float} a - number 1
   * @param {float} b - number 2
   * @static
   */
  static isEqual(a, b) {
    return Math.abs(a - b) < 0.001;
  }
}

module.exports = {
  /** Bank amount, parses debit/credit mark + amount string */
  Amount: BankAmount,

  /** Bank date, parses date with 2digit year */
  Date: BankDate
};
