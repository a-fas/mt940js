# SWIFT MT940 bank statement format JS parser

[![Build Status](https://travis-ci.org/a-fas/mt940js.svg?branch=master)](https://travis-ci.org/a-fas/mt940js)
[![NPM version](https://badge.fury.io/js/mt940js.svg)](https://badge.fury.io/js/mt940js)
[![codecov](https://codecov.io/gh/a-fas/mt940js/branch/master/graph/badge.svg)](https://codecov.io/gh/a-fas/mt940js)

*[History of changes](/changelog.txt)*  

mt940js is a SWIFT mt940 bank statement format parser for javascript (ES2015). Takes in text of mt940 file, puts out array of parsed statements and transactions.
See examples below.

## Installation

```bash
npm install mt940js
```

## API and usage

Main parser class - `Parser` - parses input text (e.g. read from a file) into array of statements (a file may contain one or more). Each output statement contains a set of attributes, describing opening balance, statement number, etc and also an array of transactions.

**Example**

```javascript
const mt940js = require('mt940js');
const parser  = new mt940js.Parser();

const statements = parser.parse(fs.readFileSync('./some_path', 'utf8'));

for (let s of statements) {
 console.log(s.number.statement, s.statementDate);

 for (let t of s.transactions) {
   console.log(t.amount, t.currency);
 }
}
```

### Statement

-  `transactionReference` {string} - tag 20 reference
-  `relatedReference` {string} - tag 21 reference, *optional*
-  `accountIdentification` {string} - tag 25 own bank account identification
-  `number.statement` {string} - tag 28 main statement number
-  `number.sequence` {string} - tag 28 statement sub number (sequence), *optional*
-  `number.section` {string} - tag 28 statement sub sub number (present on some banks), *optional*
-  `openingBalanceDate` {Date} - tag 60 statement opening date
-  `closingBalanceDate` {Date} - tag 62 statement closing date
-  `closingAvailableBalanceDate` {Date} - tag 64 closing available balance date, default = closing date
-  `forwardAvailableBalanceDate` {Date} - tag 65 forward available balance date, default = closing available date
-  `statementDate` {Date} - abstraction for statement date = `closingBalanceDate`
-  `currency` {string} - statement currency (USD, EUR ...)
-  `openingBalance` {Number} - beginning balance of the statement (with sign, based on debit/credit mark)
-  `closingBalance` {Number} - ending balance of the statement (with sign, based on debit/credit mark)
-  `closingAvailableBalance` {Number} - tag 64 closing available balance, default = closing balance
-  `forwardAvailableBalance` {Number} - tag 65 forward available balance, default = closing available
-  `transactions` {array}  - collection of transactions

**Each Transaction contains data of tag 61 (and tag 86 for details)**

- `date` {Date} - transaction date
- `amount` {Number} - transaction amount (with sign, Credit+, Debit-)
- `reversal` {Boolean} - transaction is a reversal
- `currency` {string} - transaction currency (copy of statement currency)
- `details` {string} - content of relevant 86 tag(s), may be multiline (`\n` separated)
- `transactionType` {string} - MT940 transaction type code (e.g. NTRF ...)
- `reference` {string} - payment reference field
- `entryDate` {Date} - entry date field, *optional*
- `fundsCode` {string} - funds code field, *optional*
- `bankReference` {string} - bank reference, *optional*
- `extraDetails` {string} - extra details (supplementary details), *optional*
- `structuredDetails` {Object} - structured details if detected, in for of `{ subtag: value }` e.g. `{ '20': '123456' }`

Each statement is validated for: 

- all strictly required tags
- opening/closing balance currency is the same
- opening balance + turnover = closing balance

### Invocation

The `Parser` has just one method - `parse(data, withTags = false)` - which will convert raw mt940 string to an array of statements described above. The optional `withTags` parameter would preserve parsed tags to an additional `tags` attribute of a statement (for any additional further analysis).

### Support for field 86 structure

Currently the library supports the following tag formats:
- `'<sep>DD'`, where `<sep>` can be `'>'` or `'?'`
- `'/TAG/value'`, where `TAG` is 2 to 4 uppercase chars.

Example:

```
'>20some details >30more data'
or
'/ORDP/Smith Corp'
``` 

The parser attempts to detect if field 86 contains tags like these and, if yes, adds `structuredDetails` attribute to a statement line. Tag digits are not interpreted as they are not standardized among different banks.

```javascript
// let incoming file contain one line with 86 field:
// '>20some details>30more data'

const statements = ... // parsing here

for (let s of statements) {
 for (let t of s.transactions) {
   console.log(t.structuredDetails);
   // { '20': 'some details',
   //   '30': 'more data' }
 }
}
```

### Middlewares

**Currently experimental, may change**

The library support post processing middlewares which is called before returning parsed result. To append a middleware call `usePostParse` passing `fn(statement, next)`. Middlewares are called in the order of appending. Middlewares modify statement object directly. Beware that input data may contain several statements, middlewares are called over each of them one by one.

```javascript
  const parser = new Parser();
  parser.usePostParse((s, next) => {
    s.hasOverdraft = (s.closingBalance < 0);
    next();
  });
```

## Contribution
Contribution is welcomed :)

## TODO
- pre parsing middlewares

## Author
[Alexander Tsybulsky](https://github.com/a-fas)

## License
The code is licensed under Apache-2.0 License. Please see [LICENSE](/LICENSE) for details.

## Credits
Inspired by https://github.com/WoLpH/mt940

## Standard references
- https://www2.swift.com/knowledgecentre/publications/us9m_20180720/2.0
