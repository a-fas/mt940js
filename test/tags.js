const assert = require('chai').assert;
const tags = require('../lib/tags');

describe('Tags', () => {
  describe('TagFactory', () => {
    it('should create tags', () => {
      const ref = 'REFERENCE';
      const tf  = new tags.TagFactory();
      const tag = tf.createTag(20, null, ref);
      assert.equal(ref, tag.fields.transactionReference);
    });

  });
});
