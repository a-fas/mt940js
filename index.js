/**
 * MT940 parser
 * @module ./index
 */

const Parser  = require('./lib/parser');
const Helpers = require('./lib/helperModels');

module.exports = {
  /** MT940 Parser - main class
   * @see {@link Parser}
   */
  Parser,

  /** Optional helper classes
   * @see {@link lib/helperModels}
   */
  Helpers,
};
