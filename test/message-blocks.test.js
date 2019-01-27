const assert = require('chai').assert;
const tags   = require('../lib/tags');
const tf     = new tags.TagFactory();

describe('Message blocks', () => {
  describe('high level parsing', () => {
    it('should detect starting message', () => {
      const text = '{1:F01NDEASESSAXXX0833510237}{2:O9400325050701NDEANOKKBXXX12706189060507010325N}{3:108:34}{4:';
      const tag = tf.createTag('MB', null, text);
      assert.deepEqual(tag.fields, {
        '1': 'F01NDEASESSAXXX0833510237',
        '2': 'O9400325050701NDEANOKKBXXX12706189060507010325N',
        '3': '108:34',
        '4': '',
      });
    });
    it('should skip empty ending message', () => {
      const text = '-}';
      const tag = tf.createTag('MB', null, text);
      // console.log(tag.fields);
      assert.deepEqual(tag.fields, {
        'EOB': '',
      });
    });
    it('should detect ending message', () => {
      const text = '-}{5:{MAC:12345678}{CHK:123456789ABC}}';
      const tag = tf.createTag('MB', null, text);
      assert.deepEqual(tag.fields, {
        'EOB': '',
        '5': '{MAC:12345678}{CHK:123456789ABC}',
      });
    });
  });
});
