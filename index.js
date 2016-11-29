const fs     = require('fs');
const MT940Parser = require('./lib/parser');


const data = fs.readFileSync('./tests/test1.txt', { encoding: 'utf8' });


const parser = new MT940Parser();


const statements = parser.parse(data, true);

statements.forEach(st => {
  console.log('');
  console.log(st);
});
