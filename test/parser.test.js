const assert  = require('chai').assert;
const Parser  = require('../lib/parser');
const Tags    = require('../lib/tags');
const helpers = require('../lib/helperModels');

const DUMMY_STATEMENT_LINES = [
  '{1:XXX0000000000}{2:XXXXXXXXX}{4:',
  ':20:B4E08MS9D00A0009',
  ':21:X',
  ':25:123456789',
  ':28C:123/1',
  ':60F:C140507EUR0,00',
  ':61:1405070507C500,00NTRFNONREF//AUXREF',
  ':86:LINE1',
  'LINE2',
  ':62F:C140508EUR500,00',
  '-}'
];

function expectedStatement() {
  return {
    transactionReference:  'B4E08MS9D00A0009',
    relatedReference:      'X',
    accountIdentification: '123456789',
    number: {
      statement: '123',
      sequence:  '1',
      section:   ''
    },
    statementDate:      helpers.Date.parse('14', '05', '08'),
    openingBalanceDate: helpers.Date.parse('14', '05', '07'),
    closingBalanceDate: helpers.Date.parse('14', '05', '08'),
    currency:           'EUR',
    openingBalance:     0.0,
    closingBalance:     500.0,
    closingAvailableBalanceDate: helpers.Date.parse('14', '05', '08'),
    forwardAvailableBalanceDate: helpers.Date.parse('14', '05', '08'),
    closingAvailableBalance:     500.0,
    forwardAvailableBalance:     500.0,
    transactions: [
      {
        amount:          500.00,
        isReversal:      false,
        currency:        'EUR',
        reference:       'NONREF',
        bankReference:   'AUXREF',
        transactionType: 'NTRF',
        date:            helpers.Date.parse('14', '05', '07'),
        entryDate:       helpers.Date.parse('14', '05', '07'),
        details:         'LINE1\nLINE2',
        extraDetails:    '',
        fundsCode:       '',
      }
    ]};
}

const DUMMY_GROUP_SIMPLE = [
  new Tags.TagTransactionReferenceNumber('B4E08MS9D00A0009'),
  new Tags.TagAccountIdentification('123456789'),
  new Tags.TagStatementNumber('123/1'),
  new Tags.TagOpeningBalance('C140507EUR0,00'),
  new Tags.TagStatementLine('1405070507C500,00NTRFNONREF//AUXREF'),
  new Tags.TagTransactionDetails('DETAILS'),
  new Tags.TagClosingBalance('C140508EUR500,00')
];
const DUMMY_GROUP_STRUCTURED = [
  new Tags.TagTransactionReferenceNumber('B4E08MS9D00A0009'),
  new Tags.TagAccountIdentification('123456789'),
  new Tags.TagStatementNumber('123/1'),
  new Tags.TagOpeningBalance('C140507EUR0,00'),
  new Tags.TagStatementLine('1405070507C500,00NTRFNONREF//AUXREF'),
  new Tags.TagTransactionDetails('?20Hello?30World'),
  new Tags.TagClosingBalance('C140508EUR500,00')
];
const DUMMY_GROUP_COMPLEX = [ // 2 detail lines and 2 transactions
  new Tags.TagTransactionReferenceNumber('B4E08MS9D00A0009'),
  new Tags.TagRelatedReference('X'),
  new Tags.TagAccountIdentification('123456789'),
  new Tags.TagStatementNumber('123/1'),
  new Tags.TagOpeningBalance('C140507EUR0,00'),
  new Tags.TagStatementLine('1405070507C500,00NTRFNONREF//AUXREF'),
  new Tags.TagTransactionDetails('LINE1'),
  new Tags.TagTransactionDetails('LINE2'),
  new Tags.TagStatementLine('1405070507C0,00NTRFNONREF2'),
  new Tags.TagTransactionDetails('LINE1'),
  new Tags.TagClosingBalance('C140508EUR500,00')
];

///////////////////////////////////////////////////////////////////////////////
// TESTS
///////////////////////////////////////////////////////////////////////////////

describe('Parser', () => {
  describe('Parser methods', () => {

    it('_splitAndNormalize', () => {
      const parser = new Parser();
      const result = parser._splitAndNormalize('abc   \r\n   \r\n-');
      assert.deepEqual(result, ['abc']);
    });

    it('_parseLines', () => {
      const parser = new Parser();
      const result = [...parser._parseLines(DUMMY_STATEMENT_LINES)];
      assert.equal(8, result.length);
      assert.deepEqual(result[0], {id: '20', subId: '',  data: ['B4E08MS9D00A0009']});
      assert.deepEqual(result[1], {id: '21', subId: '',  data: ['X']});
      assert.deepEqual(result[2], {id: '25', subId: '',  data: ['123456789']});
      assert.deepEqual(result[3], {id: '28', subId: 'C', data: ['123/1']});
      assert.deepEqual(result[4], {id: '60', subId: 'F', data: ['C140507EUR0,00']});
      assert.deepEqual(result[5], {id: '61', subId: '',  data: ['1405070507C500,00NTRFNONREF//AUXREF']});
      assert.deepEqual(result[6], {id: '86', subId: '',  data: ['LINE1', 'LINE2']});
      assert.deepEqual(result[7], {id: '62', subId: 'F', data: ['C140508EUR500,00']});
    });

    it('_groupTags', () => {
      const parser = new Parser();
      const groups = [DUMMY_GROUP_SIMPLE, DUMMY_GROUP_COMPLEX];
      const result = parser._groupTags([...DUMMY_GROUP_SIMPLE, ...DUMMY_GROUP_COMPLEX]);
      assert.deepEqual(result, groups);
    });

    it('_buildStatement', () => {
      const parser = new Parser();
      const group  = DUMMY_GROUP_COMPLEX;
      let result   = parser._buildStatement(group);

      let exp  = expectedStatement();
      exp.transactions.push({ // patch
        amount: 0.00,
        currency: 'EUR',
        isReversal: false,
        reference: 'NONREF2',
        bankReference: '',
        transactionType: 'NTRF',
        date: helpers.Date.parse('14', '05', '07'),
        entryDate: helpers.Date.parse('14', '05', '07'),
        details: 'LINE1',
        extraDetails: '',
        fundsCode: '',
      });
      assert.deepEqual(result, exp);
      assert.isUndefined(result.tags);
      assert.isUndefined(result.structuredDetails);

      // with Tags
      result = parser._buildStatement(group, true);
      assert.deepEqual(result.tags, group);
    });

    it('_buildStatement structured', () => {
      const parser = new Parser();
      const result = parser._buildStatement(DUMMY_GROUP_STRUCTURED);
      assert.deepEqual(result.transactions[0].structuredDetails, {
        '20': 'Hello',
        '30': 'World',
      });
    });

    it('_validateGroup throws', () => {
      const parser = new Parser();
      assert.throws(parser._validateGroup.bind(parser, [ // missing tags
        new Tags.TagTransactionReferenceNumber('B4E08MS9D00A0009'),
      ]), /Mandatory tag/);
      assert.throws(parser._validateGroup.bind(parser, [ // missing tags
        new Tags.TagClosingBalance('C140508EUR500,00')
      ]), /Mandatory tag/);
      assert.throws(parser._validateGroup.bind(parser, [ // missing tags
        new Tags.TagTransactionReferenceNumber('B4E08MS9D00A0009'),
        new Tags.TagOpeningBalance('C140507EUR0,00'),
        new Tags.TagClosingBalance('C140508EUR500,00')
      ]), /Mandatory tag/);
      assert.throws(parser._validateGroup.bind(parser, [ // inconsistent currency
        new Tags.TagTransactionReferenceNumber('B4E08MS9D00A0009'),
        new Tags.TagAccountIdentification('123456789'),
        new Tags.TagStatementNumber('123/1'),
        new Tags.TagOpeningBalance('C140507EUR0,00'),
        new Tags.TagStatementLine('1405070507C500,00NTRFNONREF//AUXREF'),
        new Tags.TagTransactionDetails('DETAILS'),
        new Tags.TagClosingBalance('C140508USD500,00')
      ]), /Currency markers/);
      assert.throws(parser._validateGroup.bind(parser, [ // inconsistent balances
        new Tags.TagTransactionReferenceNumber('B4E08MS9D00A0009'),
        new Tags.TagAccountIdentification('123456789'),
        new Tags.TagStatementNumber('123/1'),
        new Tags.TagOpeningBalance('C140507EUR0,00'),
        new Tags.TagStatementLine('1405070507C400,00NTRFNONREF//AUXREF'),
        new Tags.TagTransactionDetails('DETAILS'),
        new Tags.TagClosingBalance('C140508EUR500,00')
      ]), /Sum of lines/);
    });
  });

  /* MIDDLEWARES */
  describe('Middlewares', () => {
    it('post parse wrong fn throws', () => {
      const parser = new Parser();
      assert.throws(() => parser.usePostParse(1), /middleware must be a function/);
    });
    it('post parse middleware', () => {
      const parser = new Parser();
      parser.usePostParse((s, next) => {
        s.dummyMarker = true;
        next();
      });
      parser.usePostParse((s, next) => {
        if (s.dummyMarker) s.dummyMarker2 = true;
        next();
      });

      const result = parser.parse(DUMMY_STATEMENT_LINES.join('\n'));
      assert.isDefined(result);
      assert.isTrue(result[0].dummyMarker);
      assert.isTrue(result[0].dummyMarker2);
    });
  });

  /* INTEGRATION TEST */
  describe('Integration test', () => {
    it('typical statement', () => {
      const parser = new Parser();
      const result = parser.parse(DUMMY_STATEMENT_LINES.join('\n'));
      assert.equal(result.length, 1);
      assert.deepEqual(result[0], expectedStatement());
    });
    it('statement with fields 64, 65', () => {
      const parser = new Parser();
      const exp    = expectedStatement();

      // patch data
      exp.closingAvailableBalanceDate = helpers.Date.parse('14', '05', '09');
      exp.forwardAvailableBalanceDate = helpers.Date.parse('14', '05', '10');
      exp.closingAvailableBalance     = 600.0;
      exp.forwardAvailableBalance     = 700.0;
      const data = [
        ...DUMMY_STATEMENT_LINES.slice(0,-1),
        ':64:C140509EUR600,00',
        ':65:C140510EUR700,00',
        ...DUMMY_STATEMENT_LINES.slice(-1)
      ].join('\n');

      const result = parser.parse(data);
      assert.equal(result.length, 1);
      assert.deepEqual(result[0], exp);
    });
  });
});
