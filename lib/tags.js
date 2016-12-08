const helperModels = require('./helperModels');

class TagFactory {
  /**
  * constructor - Build tag map
  */
  constructor () {
    this.tagMap = [
      TagTransactionReferenceNumber,
      TagRelatedReference,
      TagAccountIdentification,
      TagStatementNumber,
      TagNonSwift,
      TagOpeningBalance,
      TagClosingBalance,
      TagStatementLine,
      TagTransactionDetails
    ].reduce((map, i) => map.set(i.ID, i), new Map());
  }

  /**
  * Create proper tag instance
  */
  createTag(id, subId, data) {
    const tagId     = isNaN(id) ? id : Number.parseInt(id, 10);
    const fullTagId = tagId.toString() + (subId?subId.toString():'');
    const tagClass  = this.tagMap.get(fullTagId) || this.tagMap.get(tagId);

    if (!tagClass) { throw new Error(`Unknown tag ${fullTagId}`); }

    return new tagClass(data);
  }
}


/**
* Abstract Tag base class
*/
class Tag {
  static get ID() { return 0; }
  static get PATTERN() { return /(.*)/; }

  constructor(data) {
    if (new.target === Tag) {
      throw new TypeError('Cannot construct Tag instances directly');
    }
    this.id   = this.constructor.ID;
    this.data = data;
    this._parse();
  }

  _parse() {
    const match = this.data.match(this.constructor.PATTERN);
    if (!match) { throw Error(`Cannot parse tag ${this.id}: ${this.data}`); }
    this.fields = this._extractFields(match);
  }

  _extractFields(match) { return {}; }
}

class TagTransactionReferenceNumber extends Tag {
  static get ID() { return 20; }
  static get PATTERN() { return /(.{0,16})/; }
  _extractFields(match) {
    return {
      transactionReference: match[1]
    }
  }
}

class TagRelatedReference extends Tag {
  static get ID() { return 21; }
  static get PATTERN() { return /(.{0,16})/; }
  _extractFields(match) {
    return {
      relatedReference: match[1]
    }
  }
}

class TagAccountIdentification extends Tag {
  static get ID() { return 25; }
  static get PATTERN() { return /(.{0,35})/; }
  _extractFields(match) {
    return {
      accountIdentification: match[1]
    }
  }
}

class TagStatementNumber extends Tag {
  static get ID() { return 28; }
  static get PATTERN() { return /(\d{1,5})(\/(\d{1,5}))?(\/(\d{1,5}))?/; }
  _extractFields(match) {
    return {
      statementNumber: match[1],
      sequenceNumber: match[3] || '',
      sectionNumber: match[5] || ''
    }
  }
}

class TagNonSwift extends Tag {
  static get ID() { return 'NS'; }
  static get PATTERN() { return /(.*)/; }
  _extractFields(match) {
    return {
      nonSwift: match[1]
    }
  }
}

class TagBalance extends Tag {
  static get PATTERN() {
    const re = '([DC])'                   // DC indicator
             + '(\\d{2})(\\d{2})(\\d{2})' // Date
             + '([A-Z]{3})'               // Currency
             + '([0-9,]{0,16})';          // Amount
    return new RegExp(re);
  }
  constructor(data) {

    super(data);
    if (new.target === TagBalance) {
      throw new TypeError('Cannot construct TagBalance instances directly');
    }
  }
  _extractFields(match) {
    return {
      date: helperModels.Date.parse(match[2], match[3], match[4]),
      currency: match[5],
      amount: helperModels.Amount.parse(match[1], match[6])
    };
  }
}

class TagOpeningBalance extends TagBalance { static get ID() { return 60; } }
class TagClosingBalance extends TagBalance { static get ID() { return 62; } }

class TagStatementLine extends Tag {
  static get ID() { return 61; }
  static get PATTERN() {
    const re = '(\\d{2})(\\d{2})(\\d{2})' // Date
             + '((\\d{2})(\\d{2}))?'      // Entry date
             + '(R?[DC])([A-Z])?'         // DC indicator + funds code
             + '([0-9,]{0,16})'           // Amount
             + '([A-Z][A-Z0-9]{3})'       // Transaction type
             + '([^/]{0,16})'             // Customer reference
             + '(//(.{0,16}))?'           // Bank reference
             + '(\\n?(.{0,34}))?'         // Extra
    return new RegExp(re);
  }
  _extractFields(match) {
    return {
      date: helperModels.Date.parse(match[1], match[2], match[3]),
      entryDate: match[4] && helperModels.Date.parse(match[1], match[5], match[6]),
      fundsCode: match[8],
      amount: helperModels.Amount.parse(match[7], match[9]),
      transactionType: match[10],
      reference: match[11],
      bankReference: match[13],
      extraDetails: match[14]
    };
  }
}

class TagTransactionDetails extends Tag {
  static get ID() { return 86; }
  static get PATTERN() { return /([\s\S]{0,390})/ }
  _extractFields(match) {
    return {
      transactionDetails: match[1]
    };
  }
}

module.exports = {
  TagFactory,
  Tag,
  TagTransactionReferenceNumber,
  TagRelatedReference,
  TagAccountIdentification,
  TagStatementNumber,
  TagNonSwift,
  TagBalance,
  TagOpeningBalance,
  TagClosingBalance,
  TagStatementLine,
  TagTransactionDetails
};
