/**
 * MT940 parser class
 * @module lib/parser
 */

const Tags         = require('./tags');
const helperModels = require('./helperModels');

/**
 * Main parser class, parses input text (e.g. read from a file) into array of statements.
 * Each statement is validated for: all strictly required tags,
 * opening/closing balance currency is the same, opening balance + turnover = closing balance.
 * One input may return one or more statements (as array). Each statement contains transactions
 * array, where each contains data of tag 61 (and tag 86 for details).
 * <p>Output statement contains:</p>
 * @property {string} transactionReference - tag 20 reference
 * @property {string} relatedReference - tag 21 reference, optional
 * @property {string} accountIdentification - tag 25 own bank account identification
 * @property {string} number.statement - tag 28 main statement number
 * @property {string} number.sequence - tag 28 statement sub number (sequence)
 * @property {string} number.section - tag 28 statement sub sub number (present on some banks)
 * @property {Date}   openingBalanceDate - tag 60 statement opening date
 * @property {Date}   closingBalanceDate - tag 62 statement closing date
 * @property {Date} closingAvailableBalanceDate - closing available balance date (field 64)
 * @property {Date} forwardAvailableBalanceDate - forward available balance date (field 65)
 * @property {Date}   statementDate - abstraction for statement date = `closingBalanceDate`
 * @property {string} currency - statement currency
 * @property {Number} openingBalance - beginning balance of the statement
 * @property {Number} closingBalance - ending balance of the statement
 * @property {Number} closingAvailableBalance - closing available balance (field 64)
 * @property {Number} forwardAvailableBalance - forward available balance (field 65)
 *
 * @property {array}  transactions - collection of transactions
 * @property {Date}   transaction.date - transaction date
 * @property {Number} transaction.amount - transaction amount (with sign, Credit+, Debit-)
 * @property {Boolean} transaction.isReversal - reversal transaction
 * @property {string} transaction.currency - transaction currency (copy of statement currency)
 * @property {string} transaction.details - content of relevant 86 tag(s), may be multiline (`\n` separated)
 * @property {string} transaction.transactionType - MT940 transaction type code (e.g. NTRF ...)
 * @property {string} transaction.reference - payment reference field
 * @property {Date}   transaction.entryDate - optional, entry date field
 * @property {string} transaction.fundsCode - optional, funds code field
 * @property {string} transaction.bankReference - optional, bank reference
 * @property {string} transaction.extraDetails - optional, extra details
 * @example
 * const mt940parser = new Parser();
 * const statements  = parser.parse(fs.readFileSync(path, 'utf8'));
 * for (let i of statements) {
 *   console.log(i.number.statement, i.statementDate);
 *   for (let t of i.transactions) {
 *     console.log(t.amount, t.currency);
 *   }
 * }
 */
class Parser {

  /**
  * Parse text data into array of statements
  * @param {string} data - text unparsed bank statement in MT940 format
  * @param {boolean} withTags - tags will be copied to output statements in `tags` attribute for further analysis
  * @return {array} Array of statements @see class documentation for details
  */
  parse(data, withTags = false) {
    const factory    = new Tags.TagFactory();
    const dataLines  = this._splitAndNormalize(data);
    const tagLines   = [...this._parseLines(dataLines)];
    const tags       = tagLines.map(i => factory.createTag(i.id, i.subId, i.data.join('\n')));
    const tagGroups  = this._groupTags(tags);
    const statements = tagGroups.map((grp, idx) => {
      this._validateGroup(grp, idx+1);
      return this._buildStatement(grp, withTags);
    });

    return statements;
  }

  /**
  * Split text into lines, replace clutter, remove empty lines ...
  * @private
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
  * Convert lines into separate tags
  * @private
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
        if (tag.id) { yield tag } // Yield previous
        tag = { // Start new tag
          id:    match[1],
          subId: match[2] || '',
          data:  [i.substr(match[0].length)]
        };
      } else { // Add a line to previous tag
        tag.data.push(i);
      }
    }

    if (tag.id) { yield tag } // Yield last
  }

  /**
  * Group tags into statements
  * @private
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
  * Validate group of tags (required tags present, currency is consistent, consistent balances vs turnover)
  * @private
  */
  _validateGroup(group, idx) {
    // Check mandatory tags
    const mandatoryTags = [
      Tags.TagTransactionReferenceNumber, //20
      Tags.TagAccountIdentification,      //25
      Tags.TagStatementNumber,            //28
      Tags.TagOpeningBalance,             //60
      Tags.TagClosingBalance              //62
    ];
    for (let Tag of mandatoryTags) {
      if (!group.find(t => t instanceof Tag)) {
        throw Error(`Mandatory tag ${Tag.ID} is missing in group ${idx}`);
      }
    }

    // Check same currency
    let currency = '';
    for (let i of group.filter(i => i instanceof Tags.TagBalance)) {
      if (!currency) {
        currency = i.fields.currency;
      } else if (currency !== i.fields.currency) {
        throw Error(`Currency markers are differ [${currency}, ${i.fields.currency}] in group ${idx}`);
      }
    }

    // Check turnover
    const ob = group.find(i => i instanceof Tags.TagOpeningBalance);
    const cb = group.find(i => i instanceof Tags.TagClosingBalance);
    const turnover = cb.fields.amount - ob.fields.amount;

    const sumLines = group
      .filter(i => i instanceof Tags.TagStatementLine)
      .reduce((prev, cur) => prev + cur.fields.amount, 0.0);

    if (!helperModels.Amount.isEqual(sumLines, turnover)) {
      throw Error(`Sum of lines (${sumLines}) != turnover (${turnover}) in group ${idx}`);
    }
  }

  /**
  * Build statement objects
  * @private
  */
  _buildStatement(group, withTags) {
    let statement = {
      transactionReference:  '',
      relatedReference:      '',
      accountIdentification: '',
      number: {
        statement: '',
        sequence:  '',
        section:   ''
      },
      statementDate:      null,
      openingBalanceDate: null,
      closingBalanceDate: null,
      currency:           '',
      openingBalance:     0.0,
      closingBalance:     0.0,
      transactions:       [],
      closingAvailableBalanceDate: null,
      forwardAvailableBalanceDate: null,
      closingAvailableBalance:     0.0,
      forwardAvailableBalance:     0.0,
    };

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
      if (tag instanceof Tags.TagClosingAvailableBalance) {
        statement.closingAvailableBalanceDate = tag.fields.date;
        statement.closingAvailableBalance     = tag.fields.amount;
      }
      if (tag instanceof Tags.TagForwardAvailableBalance) {
        statement.forwardAvailableBalanceDate = tag.fields.date;
        statement.forwardAvailableBalance     = tag.fields.amount;
      }
      if (tag instanceof Tags.TagStatementLine) {
        statement.transactions.push(Object.assign({},
          tag.fields,
          {
            currency: statement.currency,
            details: ''
          }
        ));
      }
      if (tag instanceof Tags.TagTransactionDetails) {
        let t = statement.transactions[statement.transactions.length - 1];
        t.details  += (t.details && '\n') + tag.fields.transactionDetails;
      }
    }

    for (let t of statement.transactions) {
      let structuredDetails = this._detectDetailStructure(t);
      if (structuredDetails) t.structuredDetails = structuredDetails;
    }
    if (withTags) { statement.tags = group } // preserve tags
    if (!statement.closingAvailableBalanceDate) {
      statement.closingAvailableBalanceDate = new Date(statement.closingBalanceDate);
      statement.closingAvailableBalance     = statement.closingBalance;
    }
    if (!statement.forwardAvailableBalanceDate) {
      statement.forwardAvailableBalanceDate = new Date(statement.closingAvailableBalanceDate);
      statement.forwardAvailableBalance     = statement.closingAvailableBalance;
    }

    return statement;
  }

  /**
  * Detects if field 86 is structured and attempts to parse it
  * @private
  */
  _detectDetailStructure(transaction) {
    const details = transaction.details.replace(/\n/g, '');
    const prefix  = details.charAt();

    // check first symbol is known separator
    let tagRe;
    if (prefix === '/') {                // assume /XXX/ fields
      tagRe = '\\/[0-9A-Z]{2,4}\\/';
    } else if ('>?'.includes(prefix)) {  // assume >DD fields
      tagRe = `\\${prefix}\\d{2}`;
    } else return; // known separator not found

    const rule = {
      detect: new RegExp(`^${tagRe}`),
      split:  new RegExp(`(?=${tagRe})`),
      item:   new RegExp(`^(${tagRe})(.*)`),
    };
    const stripPrefixRe = new RegExp(`\\${prefix}`, 'g');

    if (!rule.detect.test(details)) return; // string must start with tag

    const matches = details.split(rule.split);
    if (matches.length > 0 && matches[0].length === 0) matches.shift(); // remove empty match at start
    if (matches.length === 0) return; // no matches found
    console.log(matches);

    const parsedStruc = matches
      .map(m => m.match(rule.item)) // supposed to match groups 1 and 2
      .map(m => [ m[1].replace(stripPrefixRe, ''), m[2] ]) // remove prefix symbols from tag
      .reduce((struc, m) => Object.assign(struc, { [m[0]]: m[1] }), {});

    return parsedStruc;
  }
}

module.exports = Parser;
