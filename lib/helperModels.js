/*
 * Helper models
 */

class BankDate {
  static parse(year, month, day) {
    let fullyear = Number.parseInt(year, 10);
    if (fullyear < 100) {
      fullyear += 2000;
    }
    return new Date(Date.UTC(fullyear, Number.parseInt(month, 10) - 1, day));
  }
}

class BankAmount {
  static parse(dcmark, amountStr) {
    if ('DC'.indexOf(dcmark) < 0) {
      throw Error( `Wrong debit/credit mark: ${dcmark}` );
    }
    const amount = Number.parseFloat(amountStr.replace(',', '.'));
    if (Number.isNaN(amount)) {
      throw Error( `Amount cannot be parsed: ${amountStr}` );
    }
    return dcmark === 'C' ? amount : -amount;
  }
  static isEqual(a, b) {
    return Math.abs(a - b) < 0.001;
  }
}

module.exports = {
  Amount: BankAmount,
  Date: BankDate
};
