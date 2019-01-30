const fs          = require('fs');
const MT940Parser = require('./lib/parser');

function banner() {
  console.log('Usage: node cli.js <filename>');
  console.log('--');
  console.log('  filename - mt940 text file in UTF8 encoding');
}

const argv = process.argv.slice(2);
let files  = [];

if (!argv.length) {
  banner();
  process.exit(1);
}

argv.forEach(arg => {
  switch (arg) {
  case '--help':
  case '-h':
    banner();
    process.exit(1);
    break;
  default:
    try {
      fs.accessSync(arg);
      files.push(arg);
    } catch (e) {
      console.error(`Cannot access file: ${arg}`);
      process.exit(1);
    }
  }
});

files.forEach(file => {
  const parser     = new MT940Parser();
  const data       = fs.readFileSync(file, { encoding: 'utf8' });
  const statements = parser.parse(data);

  statements.forEach(stmt => {
    console.log('--');
    console.log(JSON.stringify(stmt, null, '  '));
  });
});
