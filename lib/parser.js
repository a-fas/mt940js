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
    const factory    = new Tags.TagFactory();
    const dataLines  = this._splitAndNormalize(data);
    const tagLines   = [...this._parseLines(dataLines)];
    const tags       = tagLines.map(i => factory.createTag(i.id, i.subId, i.data.join('\n')));
    const statements = this._groupTags(tags).map((grp, idx) => {
      this._validateGroup(grp, idx+1);
      return this._buildStatement(grp, withTags);
    });

    return statements;
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
  _groupTags(tags) {
    return tags.reduce((prev, i) => {
      if (i instanceof Tags.TagTransactionReferenceNumber) {
        prev.push([]); // Statement starting tag -> start new group
      }
      prev[prev.length-1].push(i);
      return prev;
    }, []);
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
  _buildStatement(group, withTags) {
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
        if (transaction.details) { transaction.details += '\n' };
        transaction.details  += tag.fields.transactionDetails;
      }
    }

    if (transaction) { statement.transactions.push(transaction); } // Add last
    if (withTags) { statement.tags = group; } // preserve tags

    return statement;
  }

}


module.exports = Parser;
