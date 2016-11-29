const Tags         = require('./tags');
const helperModels = require('./helperModels');

class Parser {
  constructor() {
  }

  /**
  * Parse text data into tags
  * @param {String} data
  * @return {Array} tags
  */
  parse(data, withTags = false) {
    const factory   = new Tags.TagFactory();
    const dataLines = this._splitAndNormalize(data);
    const tagLines  = [...this._parseLines(dataLines)];
    const tags      = tagLines.map(i => factory.createTag(i.id, i.subId, i.data.join('\n')));

    return [...this._groupTags(tags)].map((grp, idx) => {
      this._validateGroup(grp, idx+1);
      let statement = this._buildStatement(grp);
      if (withTags) {
        statement.tags = grp; // preserve tags for detailed processing & debug
      }
      return statement;
    });
  }

  /**
  * Split text into lines, replace clutter, remove empty lines ...
  */
  _splitAndNormalize(data) {
    return data
      .split('\n')
      .map(line => {
        return line
          .replace('\r', '')
          .replace(/\s+$/, '');
      })
      .filter(line => !!line && line !== '-');
  }

  /**
  * Parse lines into tags
  */
  *_parseLines(lines) {
    const reTag = /^:([0-9]{2}|NS)([A-Z])?:/;
    let tag = {};

    for (let i of lines) {

      if (i.startsWith('-}') || i.startsWith('{')) {
        continue; // Skip message headers
      }

      let match = i.match(reTag);
      if (match) { // Tag found
        if (tag.id) { yield tag; } // Yield previous
        tag = { // Start new tag
          id   : match[1],
          subId: match[2] || '',
          data : [i.substr(match[0].length)]
        }
      } else { // Add a line to previous tag
        tag.data.push(i);
      }
    }

    if (tag.id) { yield tag; } // Yield last
  }

  /**
  * Group tags into statements
  */
  *_groupTags(tags) {
    let group;

    for (let i of tags) {
      if (i instanceof Tags.TagTransactionReferenceNumber) { // Statement starting tag
        if (group) { yield group; } // Yield previous
        group = [];                 // Start new
      }
      group.push(i);
    }

    if (group) { yield group; } // Yield last
  }

  /**
  * Validate group of tags
  */
  _validateGroup(group, idx) {
    // Check mandatory tags
    [ Tags.TagTransactionReferenceNumber, //20
      Tags.TagAccountIdentification,      //25
      Tags.TagStatementNumber,            //28
      Tags.TagOpeningBalance,             //60
      Tags.TagClosingBalance              //62
    ].forEach(Tag => {
      if (!group.find(i => i instanceof Tag)) {
        throw Error(`Mandatory tag ${Tag.ID} is missing in group ${idx}`);
      }
    })

    // Check same currency
    let currency = '';
    group
    .filter(i => i instanceof Tags.TagBalance)
    .forEach(i => {
      if (!currency) {
        currency = i.fields.currency;
      } else if (currency !== i.fields.currency) {
        throw Error(`Currency markers are differ [${currency}, ${i.fields.currency}] in group ${idx}`);
      }
    })

    // Check turnover
    const ob = group.find(i => i instanceof Tags.TagOpeningBalance);
    const cb = group.find(i => i instanceof Tags.TagClosingBalance);
    const turnover = cb.fields.amount - ob.fields.amount;

    const sumLines = group
    .filter(i => i instanceof Tags.TagStatementLine)
    .reduce((prev, cur) => { return prev + cur.fields.amount }, 0.0);

    if (!helperModels.Amount.isEqual(sumLines, turnover)) {
      throw Error(`Sum of lines (${sumLines}) != turnover (${turnover}) in group ${idx}`);
    }
  }

  /**
  * Build statements
  */
  _buildStatement(group) {
    let statement = {
      transactionReference: '',
      relatedReference: '',
      accountIdentification: '',
      number: {
        statement: '',
        sequence: '',
        section: ''
      },
      statementDate: null,
      openingBalanceDate: null,
      closingBalanceDate: null,
      currency: '',
      openingBalance: 0.0,
      closingBalance: 0.0,
      transactions: []
    }
    let transaction = null;

    for (let tag of group) {
      if (tag instanceof Tags.TagTransactionReferenceNumber) {
        statement.transactionReference = tag.fields.transactionReference;
      }
      if (tag instanceof Tags.TagRelatedReference) {
        statement.relatedReference = tag.fields.relatedReference;
      }
      if (tag instanceof Tags.TagAccountIdentification) {
        statement.accountIdentification = tag.fields.accountIdentification;
      }
      if (tag instanceof Tags.TagStatementNumber) {
        statement.number.statement = tag.fields.statementNumber;
        statement.number.sequence  = tag.fields.sequenceNumber;
        statement.number.section   = tag.fields.sectionNumber;
      }
      if (tag instanceof Tags.TagOpeningBalance) {
        statement.openingBalanceDate = tag.fields.date;
        statement.openingBalance     = tag.fields.amount;
        statement.currency           = tag.fields.currency;
      }
      if (tag instanceof Tags.TagClosingBalance) {
        statement.closingBalanceDate = tag.fields.date;
        statement.statementDate      = tag.fields.date;
        statement.closingBalance     = tag.fields.amount;
      }
      if (tag instanceof Tags.TagStatementLine) {
        if (transaction) { statement.transactions.push(transaction); } // Add prev
        transaction          = tag.fields;
        transaction.currency = statement.currency;
        transaction.details  = '';
      }
      if (tag instanceof Tags.TagTransactionDetails) {
        transaction.details  += tag.fields.transactionDetails;
      }
    }

    if (transaction) { statement.transactions.push(transaction); } // Add last
    return statement;
  }

}


module.exports = Parser;
