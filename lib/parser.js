const TagFactory = require('./tags').TagFactory;

class Parser {
  constructor() {
  }

  /**
  * Parse text data into tags
  * @param {String} data
  * @return {Array} tags
  */
  parse(data) {
    const factory   = new TagFactory();
    const dataLines = this.splitAndNormalize(data);
    const tags      = [...this.parseLines(dataLines)];
    return tags.map(i => factory.createTag(i.id, i.subId, i.data.join('\n')));
  }

  /**
  * Split text into lines, replace clutter, remove empty lines ...
  */
  splitAndNormalize(data) {
    return data
      .split('\n')
      .map(line => {
        return line
          .replace('\r', '')
          .replace(/\s+$/, '');
      })
      .filter(line => !!line && line !== '-');
  }

  /**
  * Parse lines into tags
  */
  *parseLines(lines) {
    const reTag = /^:([0-9]{2}|NS)([A-Z])?:/;
    var tag = {};

    for (let i of lines[Symbol.iterator]()) {

      if (i.startsWith('-}') || i.startsWith('{')) {
        continue; // Skip message headers
      }

      let match = i.match(reTag);
      if (match) {
        if (tag.id) {
          yield tag;
        }
        tag = {
          id   : match[1],
          subId: match[2] || '',
          data : [i.substr(match[0].length)]
        }
      } else {
        tag.data.push(i);
      }
    }

    if (tag.id) {
      yield tag;
    }
  }
}


module.exports = Parser;
