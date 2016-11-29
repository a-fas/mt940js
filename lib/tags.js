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
    const tagId     = Number.isNaN(id) ? id : Number.parseInt(id, 10);
    const fullTagId = tagId.toString() + subId.toString();
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
  get fields() { return {}; }

  constructor(data) {
    if (new.target === Tag) {
      throw new TypeError('Cannot construct Tag instances directly');
    }
    this.id   = this.constructor.ID;
    this.data = data;
    this._parse();
  }

  _parse() {
    this.match = this.data.match(this.constructor.PATTERN);
    if (!this.match) {
      throw Error(`Cannot parse tag ${this.id}: ${this.data}`);
    }
  }
}

class TagTransactionReferenceNumber extends Tag {
  static get ID() { return 20; }
  static get PATTERN() { return /(.{0,16})/; }
  get fields() {
    return {
      transactionReference: this.match[1]
    }
  }
}

class TagRelatedReference extends Tag {
  static get ID() { return 21; }
  static get PATTERN() { return /(.{0,16})/; }
  get fields() {
    return {
      relatedReference: this.match[1]
    }
  }
}

class TagAccountIdentification extends Tag {
  static get ID() { return 25; }
  static get PATTERN() { return /(.{0,35})/; }
  get fields() {
    return {
      accountIdentification: this.match[1]
    }
  }
}

class TagStatementNumber extends Tag {
  static get ID() { return 28; }
  static get PATTERN() { return /(\d{1,5})(\/(\d{1,5}))?(\/(\d{1,5}))?/; }
  get fields() {
    return {
      statementNumber: this.match[1],
      sequenceNumber: this.match[3] || '',
      sectionNumber: this.match[5] || ''
    }
  }
}

class TagNonSwift extends Tag {
  static get ID() { return 'NS'; }
  static get PATTERN() { return /(.*)/; }
  get fields() {
    return {
      nonSwift: this.match[1]
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
    if (new.target === Tag) {
      throw new TypeError('Cannot construct Tag instances directly');
    }
  }
  get fields() {
    return {
      date: helperModels.Date.parse(this.match[2], this.match[3], this.match[4]),
      currency: this.match[5],
      amount: helperModels.Amount.parse(this.match[1], this.match[6])
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
  get fields() {
    return {
      date: helperModels.Date.parse(this.match[1], this.match[2], this.match[3]),
      entryDate: this.match[4] && helperModels.Date.parse(this.match[1], this.match[5], this.match[6]),
      fundsCode: this.match[8],
      amount: helperModels.Amount.parse(this.match[7], this.match[9]),
      transactionType: this.match[10],
      reference: this.match[11],
      bankReference: this.match[13],
      extraDetails: this.match[14]
    };
  }
}

class TagTransactionDetails extends Tag {
  static get ID() { return 86; }
  static get PATTERN() { return /([\s\S]{0,390})/ }
  get fields() {
    return {
      transactionDetails: this.match[1]
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
