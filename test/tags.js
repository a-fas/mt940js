const assert = require('chai').assert;
const tags = require('../lib/tags');

describe('Tags', () => {
  describe('TagFactory', () => {
    const tf  = new tags.TagFactory();

    it('should create tag 20 (TransactionReferenceNumber)', () => {
      const ref = 'REFERENCE';
      const tag = tf.createTag('20', null, ref);
      assert.equal(ref, tag.fields.transactionReference);
    });

    it('should create tag 21 (RelatedReference)', () => {
      const ref = 'REFERENCE';
      const tag = tf.createTag('21', null, ref);
      assert.equal(ref, tag.fields.relatedReference);
    });

    it('should create tag 25 (AccountIdentification)', () => {
      const account = '123456789';
      const tag = tf.createTag('25', null, account);
      assert.equal(account, tag.fields.accountIdentification);
    });

    it('should create tag 28 (StatementNumber)', () => {
      const str = '998/1';
      const tag = tf.createTag('28', null, str);
      assert.equal('998', tag.fields.statementNumber);
      assert.equal('1', tag.fields.sequenceNumber);
    });

    it('should create tag NS (NonSwift)', () => {
      const str = 'XYZ';
      const tag = tf.createTag('NS', null, str);
      assert.equal('XYZ', tag.fields.nonSwift);
    });

    it('should create tag 60 (OpeningBalance)', () => {
      const str = 'C160507EUR123,89';
      const tag = tf.createTag('60', null, str);
      assert.equal('2016-05-07', tag.fields.date.toISOString().substr(0,10));
      assert.equal('EUR', tag.fields.currency);
      assert.equal(123.89, tag.fields.amount);
    });

    it('should create tag 62 (ClosingBalance)', () => {
      const str = 'C160507EUR123,89';
      const tag = tf.createTag('62', null, str);
      assert.equal('2016-05-07', tag.fields.date.toISOString().substr(0,10));
      assert.equal('EUR', tag.fields.currency);
      assert.equal(123.89, tag.fields.amount);
    });

    it('should create tag 61 (StatementLine)', () => {
      const str = '1605070507D123,89NTRFNONREF//B4E07XM00J000023';
      const tag = tf.createTag('61', null, str);
      assert.equal('2016-05-07', tag.fields.date.toISOString().substr(0,10));
      assert.equal('2016-05-07', tag.fields.entryDate.toISOString().substr(0,10));
      assert.equal(-123.89, tag.fields.amount);
      assert.equal('NTRF', tag.fields.transactionType);
      assert.equal('NONREF', tag.fields.reference);
      assert.equal('B4E07XM00J000023', tag.fields.bankReference);
    });

    it('should create tag 86 (TransactionDetails)', () => {
      const str = 'Some text here';
      const tag = tf.createTag('86', null, str);
      assert.equal('Some text here', tag.fields.transactionDetails);
    });

    it('should create tag with a subId', () => {
      const str = '998/1';
      const tag = tf.createTag('28', 'C', str);
      assert.equal('998', tag.fields.statementNumber);
      assert.equal('1', tag.fields.sequenceNumber);
    });

    it('should throw unknown tag', () => {
      const str = 'Some data';
      assert.throws(
        tf.createTag.bind(tf, 'XX', null, str),
        /Unknown tag/);
    });

    it('should throw wrong content', () => {
      const str = 'Some data';
      assert.throws(
        tf.createTag.bind(tf, '28', null, str),
        /Cannot parse/);
    });

    it('Abstract Tag and TagBalance', () => {
      assert.throws(
        () => {let a = new tags.Tag;},
        /Tag instances/);
      assert.throws(
        () => {let a = new tags.TagBalance('C160507EUR123,89');},
        /TagBalance instances/);
    });

  });
});
