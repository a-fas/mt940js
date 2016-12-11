/**
 * MT940 parser
 * @module ./index
 */

const _Parser       = require('./lib/parser');
const _HelperModels = require('./lib/helperModels');

module.exports = {
  /** MT940 Parser - main class
   * @see {@link Parser}
   */
  Parser: _Parser,

  /** Optional helper classes
   * @see {@link lib/helperModels}
   */
  Helpers: _HelperModels
};
