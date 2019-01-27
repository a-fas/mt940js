const assert = require('chai').assert;
const tags   = require('../lib/tags');
// const tf     = new tags.TagFactory();

describe('Message blocks', () => {
  describe('high level parsing', () => {
    it('should detect starting message', () => {
      const line = '{1:F01NDEASESSAXXX0833510237}{2:O9400325050701NDEANOKKBXXX12706189060507010325N}{3:108:34}{4:';
      const tag = new tags.TagMessageBlock(line);
      // console.log(tag.fields);
      assert.deepEqual(tag.fields, {
        '1': 'F01NDEASESSAXXX0833510237',
        '2': 'O9400325050701NDEANOKKBXXX12706189060507010325N',
        '3': '108:34',
        '4': '',
      });
    });
    it('should skip empty ending message', () => {
      const line = '-}';
      const tag = new tags.TagMessageBlock(line);
      // console.log(tag.fields);
      assert.deepEqual(tag.fields, {
        'EOB': '',
      });
    });
    it('should detect ending message', () => {
      const line = '-}{5:{MAC:12345678}{CHK:123456789ABC}}';
      const tag = new tags.TagMessageBlock(line);
      assert.deepEqual(tag.fields, {
        'EOB': '',
        '5': '{MAC:12345678}{CHK:123456789ABC}',
      });
    });
  });
});
