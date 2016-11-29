const fs     = require('fs');
const MT940Parser = require('./lib/parser');


const data = fs.readFileSync('./tests/test1.txt', { encoding: 'utf8' });


const parser = new MT940Parser();
const tags = parser.parse(data);

for (let i of tags) {
  console.log(i.id, i.data, i.fields);
}

//*******************************************************
// Playground
//*******************************************************


// const TagFactory  = require('./lib/tags').TagFactory;
// const tf  = new TagFactory();
// const tag = tf.createTag(20, '', 'OLOLO');
//
// console.log(tag);
// console.log(tag.fields);


// tag
