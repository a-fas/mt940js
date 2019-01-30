class Field86StructureParser {
  static buildTagRe(details) {
    const prefix  = details.charAt();

    // check first symbol is known separator
    let tagRe;
    if (!prefix) return;
    else if (prefix === '/') {                // assume /XXX/ fields
      tagRe = '\\/[0-9A-Z]{2,4}\\/';
    } else if ('>?'.includes(prefix)) {  // assume >DD fields
      tagRe = `\\${prefix}\\d{2}`;
    } else return; // known separator not found

    return {
      detect: new RegExp(`^${tagRe}`),
      split:  new RegExp(`(?=${tagRe})`),
      item:   new RegExp(`^(${tagRe})(.*)`),
      strip:  new RegExp(`\\${prefix}`, 'g'),
    };
  }

  /**
   * Detects if field 86 is structured and attempts to parse it
   */
  static parse(details) {
    details = details.replace(/\n/g, '').trim();
    const rule = Field86StructureParser.buildTagRe(details);
    if (!rule) return;

    if (!rule.detect.test(details)) return; // string must start with tag

    const matches = details.split(rule.split);
    if (matches.length > 0 && matches[0].length === 0) matches.shift(); // remove empty match at start
    if (matches.length === 0) return; // no matches found

    const parsedStruc = matches
      .map(m => m.match(rule.item)) // supposed to match groups 1 and 2
      .map(m => [ m[1].replace(rule.strip, ''), m[2] ]) // remove prefix symbols from tag
      .reduce((struc, m) => Object.assign(struc, { [m[0]]: m[1] }), {});

    return parsedStruc;
  }
}

module.exports = Field86StructureParser;
