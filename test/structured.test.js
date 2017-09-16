const assert  = require('chai').assert;
const Parser  = require('../lib/parser');
const parser  = new Parser();

function run(details) {
  const transaction = {
    details: details
  };
  const structure = parser._detectDetailStructure(transaction);
  // console.log(structure);
  return structure;
}

describe('Parser::_detectDetailStructure', () => {
  it('Detects no structure', () => {
    assert.isUndefined(run('some arbitrary text'));
    assert.isUndefined(run('>some arbitrary text'));
    assert.isUndefined(run('?some arbitrary text'));
    assert.isUndefined(run('so?20me arbitrary text'));
    assert.isUndefined(run('/some arbitrary text'));
    assert.isUndefined(run('/some/ arbitrary text')); // lower case
    assert.isUndefined(run('some /ATTR/ arbitrary text'));
  });

  it('Detects > structure', () => {
    assert.deepEqual(run('>20Details 123>30123232421>31'), {
      '20': 'Details 123',
      '30': '123232421',
      '31': ''
    });
    assert.deepEqual(run('>20Details 123\n>30123232421>31'), {
      '20': 'Details 123',
      '30': '123232421',
      '31': ''
    });
  });

  it('Detects ? structure', () => {
    assert.deepEqual(run('?20Details 123?30123232421?31'), {
      '20': 'Details 123',
      '30': '123232421',
      '31': ''
    });
    assert.deepEqual(run('?20Details? 123?30123232421?31'), {
      '20': 'Details? 123',
      '30': '123232421',
      '31': ''
    });
  });

  it('Detects /XXX/ structure', () => {
    assert.deepEqual(run('/ATR/Details 123/ATR2/123232421/ATR3/'), {
      'ATR':  'Details 123',
      'ATR2': '123232421',
      'ATR3': ''
    });
  });

});
