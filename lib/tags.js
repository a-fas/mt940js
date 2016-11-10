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

    if (!tagClass) {
      throw new Error(`Unknown tag ${fullTagId}`);
    }

    return new tagClass(data);
  }
}


/**
* Abstract Tag base class
*/
class Tag {
  static get ID() { return 0; }
  constructor() {
    if (new.target === Tag) {
      throw new TypeError("Cannot construct Tag instances directly");
    }
    this.id = this.constructor.ID;
  }
}

class TagTransactionReferenceNumber extends Tag {
  static get ID() { return 20; }
  constructor(data) {
    super(20);
    this.data = data;
  }
}

class TagRelatedReference extends Tag {
  static get ID() { return 21; }
  constructor(data) {
    super();
    this.data = data;
  }
}

class TagAccountIdentification extends Tag {
  static get ID() { return 25; }
  constructor(data) {
    super();
    this.data = data;
  }
}

class TagStatementNumber extends Tag {
  static get ID() { return 28; }
  constructor(data) {
    super();
    this.data = data;
  }
}

class TagNonSwift extends Tag {
  static get ID() { return 'NS'; }
  constructor(data) {
    super();
    this.data = data;
  }
}

class TagOpeningBalance extends Tag {
  static get ID() { return 60; }
  constructor(data) {
    super();
    this.data = data;
  }
}

class TagClosingBalance extends Tag {
  static get ID() { return 62; }
  constructor(data) {
    super();
    this.data = data;
  }
}

class TagStatementLine extends Tag {
  static get ID() { return 61; }
  constructor(data) {
    super();
    this.data = data;
  }
}

class TagTransactionDetails extends Tag {
  static get ID() { return 86; }
  constructor(data) {
    super();
    this.data = data;
  }
}

module.exports = {
  TagFactory: TagFactory
};
