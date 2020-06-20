/**
 * MT940 parser class
 * @module lib/parser
 */

const Tags         = require('./tags');
const helperModels = require('./helperModels');
const Field86Structure = require('./field86structure');

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
 * @property {string} informationToAccountOwner - statement level additional details
 * @property {object} messageBlocks - statement message blocks, if present (EXPERIMENTAL)
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
 * @property {string} transaction.extraDetails - optional, extra details (supplementary details)
 * @property {Object} transaction.structuredDetails - optional, if detected, parsed details in form of { subtag: value }
 * @property {string} transaction.nonSwift - optional, content of NS tags which happened in the context of transaction (after tags 61 or 86), can be multiline (separated by `\n`)
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
  * Constructor, params are given as object fields { no86Structure: true }
  * @constructor
  * @param {boolean} no86Structure - don't parse 86 field structure
  */
  constructor ({ no86Structure } = {}) {
    this.params = {
      no86Structure,
    };
    this.postParseMiddlewareStack = [];
  }

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

    for (let s of statements) {
      this._applyPostParseMiddlewares(s);
    }

    return statements;
  }

  /**
   * usePostParse - use middleware(s) after parsing, before result return
   * @param {function} fn - middleware fn(statement, next)
   */
  usePostParse(fn) {
    if (typeof fn !== 'function') throw Error('middleware must be a function');
    this.postParseMiddlewareStack.push(fn);
  }

  /**
   * _applyPostParse - internal apply post parse middlewares
   * @private
   * @param {object} statement - statement to process
   */
  _applyPostParseMiddlewares(statement) {
    if (this.postParseMiddlewareStack.length === 0) return;
    const chainFn = this.postParseMiddlewareStack
      .reverse()
      .reduce((next, fn) => fn.bind(null, statement, next), () => {});
    chainFn(statement);
  }

  /**
  * Split text into lines, replace clutter, remove empty lines ...
  * @private
  */
  _splitAndNormalize(data) {
    return data
      .split(/\r?\n/)
      .filter(line => !!line && line !== '-');
  }

  /**
  * Convert lines into separate tags
  * @private
  */
  *_parseLines(lines) {
    const reTag = /^:([0-9]{2}|NS)([A-Z])?:/;
    let tag = null;

    for (let i of lines) {

      // Detect new tag start
      const match = i.match(reTag);
      if (match || i.startsWith('-}') || i.startsWith('{')) {
        if (tag) yield tag; // Yield previous
        tag = match // Start new tag
          ? {
            id:    match[1],
            subId: match[2] || '',
            data:  [i.substr(match[0].length)]
          }
          : {
            id:    'MB',
            subId: '',
            data:  [i.trim()],
          };
      } else { // Add a line to previous tag
        tag.data.push(i);
      }
    }

    if (tag) { yield tag } // Yield last
  }

  /**
  * Group tags into statements
  * @private
  */
  _groupTags(tags) {
    if (tags.length === 0) return [];
    const hasMessageBlocks = (tags[0] instanceof Tags.TagMessageBlock);
    const groups = [];
    let curGroup;

    for (let i of tags) {
      if (hasMessageBlocks && i instanceof Tags.TagMessageBlock && i.isStarting ||
        !hasMessageBlocks && i instanceof Tags.TagTransactionReferenceNumber) {
        groups.push(curGroup = []); // Statement starting tag -> start new group
      }
      curGroup.push(i);
    }
    return groups;
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

    let prevTag;
    for (let tag of group) {
      if (tag instanceof Tags.TagMessageBlock) {
        if (!statement.messageBlocks) statement.messageBlocks = {};
        for (let [key, value] of Object.entries(tag.fields)) {
          if (!value || key === 'EOB') continue;
          statement.messageBlocks[key] = { value };
        }
      }
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
        if (prevTag instanceof Tags.TagStatementLine) {
          let t = statement.transactions[statement.transactions.length - 1];
          t.details  += (t.details && '\n') + tag.fields.transactionDetails;
        } else {
          if (!statement.informationToAccountOwner) statement.informationToAccountOwner = '';
          else statement.informationToAccountOwner += '\n';
          statement.informationToAccountOwner += tag.fields.transactionDetails;
        }
      }
      if (tag instanceof Tags.TagNonSwift) {
        if (prevTag instanceof Tags.TagStatementLine || prevTag instanceof Tags.TagTransactionDetails) {
          let t = statement.transactions[statement.transactions.length - 1];
          t.nonSwift = tag.data;
        }
      }
      if (!(tag instanceof Tags.TagNonSwift)) prevTag = tag;
    }

    for (let [messageId, message] of Object.entries(statement.messageBlocks || {})) {
      // EXPERIMENTAL, subject for change !!!
      const fields = this._parseMessageBlockFields(messageId, message.value);
      if (fields) message.fields = fields;
    }
    if (!this.params.no86Structure) {
      for (let t of statement.transactions) {
        let structuredDetails = Field86Structure.parse(t.details);
        if (structuredDetails) t.structuredDetails = structuredDetails;
      }
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
  * parses message blocks
  * @private
   */
  _parseMessageBlockFields(messageId, value) { //eslint-disable-line no-unused-vars
    // TODO somethings like:
    // messageBlockFactory.createTag(messageId, value)
    // returns { field1: '', field2: '', subTags: { 108: { fieldA: '', fieldB: '' } } }
  }
}

module.exports = Parser;
