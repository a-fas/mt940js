const assert = require('chai').assert;
const Field86Parser = require('../lib/field86structure');

function run(details) {
  return Field86Parser.parse(details);
}

describe('Field86Structure', () => {
  it('Detects no structure', () => {
    assert.isUndefined(run('some arbitrary text'));
    assert.isUndefined(run('>some arbitrary text'));
    assert.isUndefined(run('?some arbitrary text'));
    assert.isUndefined(run('so?20me arbitrary text'));
    assert.isUndefined(run('/some arbitrary text'));
    assert.isUndefined(run('/some/ arbitrary text')); // lower case
    assert.isUndefined(run('some /ATTR/ arbitrary text'));
    assert.isUndefined(run('')); // empty string
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

  it('Detects structure, with beginning spaces', () => {
    assert.deepEqual(run(' >20Details 123>30123232421>31'), {
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

  it('complex detect', () => {
    const tag = [
      ' /XXXX//100924006010 XXXXXXXXXXXXX XXXXXXXX XXXXXX AB (PUBL)',
      ' /ORDP/XX XXXXXX XXXXX XXXX N.A.25 XXXX XXXXX, CANARY WHARF',
      ' /REMI/UBERWEISUNG OUR REF: 03MT181024144353',
      'YOUR REF: P6363103 240 1   M CA O/XXXXGB2L',
      '/ACC/INST/XXXXGB2L         /6231400604',
      'BIC:XXXXGB2L',
    ].join('');

    const parsed = run(tag);

    assert.deepEqual(parsed, {
      'XXXX': '/100924006010 XXXXXXXXXXXXX XXXXXXXX XXXXXX AB (PUBL) ',
      'ORDP': 'XX XXXXXX XXXXX XXXX N.A.25 XXXX XXXXX, CANARY WHARF ',
      'REMI': 'UBERWEISUNG OUR REF: 03MT181024144353YOUR REF: P6363103 240 1   M CA O/XXXXGB2L',
      'ACC':  'INST/XXXXGB2L         /6231400604BIC:XXXXGB2L'
    });
  });
});
