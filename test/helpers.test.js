const assert = require('chai').assert;
const helpers = require('../lib/helperModels');

describe('Helpers', () => {
  describe('Bank date parser', () => {
    it('should work at all (with full date)', () => {
      assert.equal('2016-12-01', helpers.Date.parse(2016,12,1).toISOString().substr(0, 10));
      assert.equal('1996-12-01', helpers.Date.parse(1996,12,1).toISOString().substr(0, 10));
    });

    it('should work with YY (2-digit) year', () => {
      assert.equal('2016-12-01', helpers.Date.parse(16,12,1).toISOString().substr(0, 10));
    });
  });

  describe('Bank amount', () => {
    describe('Parse', () => {
      it('should parse debit amount -> negative', () => {
        assert.equal(helpers.Amount.parse('D', '123.34'), -123.34);
      });

      it('should parse credit amount -> positive', () => {
        assert.equal(helpers.Amount.parse('C', '123.34'), 123.34);
      });

      it('should parse amount with ,', () => {
        assert.equal(helpers.Amount.parse('C', '123,34'), 123.34);
      });

      it('should round to 2 fractional digits', () => {
        assert.equal(helpers.Amount.parse('C', '123,345'), 123.35);
      });

      it('should fail if wrong indicator passed', () => {
        assert.throws(helpers.Amount.parse.bind(null, 'X', '123,34'), /Wrong debit/);
      });

      it('should fail if wrong amount passed', () => {
        assert.throws(helpers.Amount.parse.bind(null, 'D', 'XXXXXX'), /Amount cannot be parsed/);
      });

      it('should fail for negative amount string', () => {
        assert.throws(helpers.Amount.parse.bind(null, 'D', '-123.78'), /Positive amount/);
      });
    });

    describe('isEqual', () => {
      it('Basic checks', () => {
        assert.isTrue(helpers.Amount.isEqual(123.23, 123.2301));
        assert.isFalse(helpers.Amount.isEqual(123.23, 123.235));
      });
    });
  });


});
