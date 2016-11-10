const fs     = require('fs');
const MT940Parser = require('./lib/parser');


const data = fs.readFileSync('./tests/test1.txt', { encoding: 'utf8' });

const parser = new MT940Parser();
const tags = parser.parse(data);

for (let i of tags) {
  console.log(i);
}


// const MT940TagFactory = require('./lib/tags');
// const factory = new MT940TagFactory.TagFactory();
