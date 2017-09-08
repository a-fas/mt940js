const assert  = require('chai').assert;
const Parser  = require('../lib/parser');
const Tags    = require('../lib/tags');
const helpers = require('../lib/helperModels');
const parser  = new Parser();

function dummyStatementLines() {
  return [
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
}

function expectedStatement() {
  return {
    transactionReference: 'B4E08MS9D00A0009',
    relatedReference: 'X',
    accountIdentification: '123456789',
    number: {
      statement: '123',
      sequence: '1',
      section: ''
    },
    statementDate: helpers.Date.parse('14', '05', '08'),
    openingBalanceDate: helpers.Date.parse('14', '05', '07'),
    closingBalanceDate: helpers.Date.parse('14', '05', '08'),
    currency: 'EUR',
    openingBalance: 0.0,
    closingBalance: 500.0,
    transactions: [
      {
        amount: 500.00,
        currency: 'EUR',
        reference: 'NONREF',
        bankReference: 'AUXREF',
        transactionType: 'NTRF',
        date: helpers.Date.parse('14', '05', '07'),
        entryDate: helpers.Date.parse('14', '05', '07'),
        details: 'LINE1\nLINE2',
        extraDetails: '',
        fundsCode: '',
      }
    ]};
}

function dummyGroups() {
  return [
    [ // Normal 1
      new Tags.TagTransactionReferenceNumber('B4E08MS9D00A0009'),
      new Tags.TagAccountIdentification('123456789'),
      new Tags.TagStatementNumber('123/1'),
      new Tags.TagOpeningBalance('C140507EUR0,00'),
      new Tags.TagStatementLine('1405070507C500,00NTRFNONREF//AUXREF'),
      new Tags.TagTransactionDetails('DETAILS'),
      new Tags.TagClosingBalance('C140508EUR500,00')
    ],
    [ // Normal 2, 2 detail lines and 2 transactions
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
    ],
    [ // missing tags
      new Tags.TagTransactionReferenceNumber('B4E08MS9D00A0009'),
    ],
    [ // missing tags
      new Tags.TagClosingBalance('C140508EUR500,00')
    ],
    [ // missing tags
      new Tags.TagTransactionReferenceNumber('B4E08MS9D00A0009'),
      new Tags.TagOpeningBalance('C140507EUR0,00'),
      new Tags.TagClosingBalance('C140508EUR500,00')
    ],
    [ // inconsistent currency
      new Tags.TagTransactionReferenceNumber('B4E08MS9D00A0009'),
      new Tags.TagAccountIdentification('123456789'),
      new Tags.TagStatementNumber('123/1'),
      new Tags.TagOpeningBalance('C140507EUR0,00'),
      new Tags.TagStatementLine('1405070507C500,00NTRFNONREF//AUXREF'),
      new Tags.TagTransactionDetails('DETAILS'),
      new Tags.TagClosingBalance('C140508USD500,00')
    ],
    [ // inconsistent balances
      new Tags.TagTransactionReferenceNumber('B4E08MS9D00A0009'),
      new Tags.TagAccountIdentification('123456789'),
      new Tags.TagStatementNumber('123/1'),
      new Tags.TagOpeningBalance('C140507EUR0,00'),
      new Tags.TagStatementLine('1405070507C400,00NTRFNONREF//AUXREF'),
      new Tags.TagTransactionDetails('DETAILS'),
      new Tags.TagClosingBalance('C140508EUR500,00')
    ],
  ];
}

///////////////////////////////////////////////////////////////////////////////
// TESTS
///////////////////////////////////////////////////////////////////////////////

describe('Parser', () => {
  describe('Parser methods', () => {

    it('_splitAndNormalize', () => {
      const result = parser._splitAndNormalize('abc   \r\n   \r\n-');
      assert.deepEqual(result, ['abc']);
    });

    it('_parseLines', () => {
      const result = [...parser._parseLines(dummyStatementLines())];
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
      const groups = dummyGroups().slice(0,2);
      const result = parser._groupTags(groups[0].concat(groups[1]));
      assert.deepEqual(result, groups);
    });

    it('_buildStatement', () => {
      const group  = dummyGroups()[1]; // With extra detail line
      const result = parser._buildStatement(group);

      let exp  = expectedStatement();
      // patch
      exp.transactions.push({
        amount: 0.00,
        currency: 'EUR',
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
    });

    it('_validateGroup', () => {
      const groups = dummyGroups();
      assert.throws(parser._validateGroup.bind(parser, groups[2]), /Mandatory tag/);
      assert.throws(parser._validateGroup.bind(parser, groups[3]), /Mandatory tag/);
      assert.throws(parser._validateGroup.bind(parser, groups[4]), /Mandatory tag/);
      assert.throws(parser._validateGroup.bind(parser, groups[5]), /Currency markers/);
      assert.throws(parser._validateGroup.bind(parser, groups[6]), /Sum of lines/);
    });

  });

  describe('Integration test', () => {

    it('should pass', () => {
      const result = parser.parse(dummyStatementLines().join('\n'));
      assert.equal(result.length, 1);
      assert.deepEqual(result[0], expectedStatement());
    });

  });
});
