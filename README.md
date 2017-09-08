# SWIFT MT940 bank statement format JS parser #

*[History of changes](/changelog.txt)*  

mt940js is a SWIFT mt940 bank statement format parser for javascript (ES2015).
Takes in text of mt940 file, puts out array of parsed statements and transactions.
See examples below.

## Installation ##

```bash
npm install mt940js
```

## API and usage ##


Main parser class - `Parser` - parses input text (e.g. read from a file) into array of statements (a file may contain one or more). Each output statement contains a set of attributes, describing opening balance, statement number, etc and also an array of transactions.

**Statement**
-  `transactionReference` {string} - tag 20 reference
-  `relatedReference` {string} - tag 21 reference, *optional*
-  `accountIdentification` {string} - tag 25 own bank account identification
-  `number.statement` {string} - tag 28 main statement number
-  `number.sequence` {string} - tag 28 statement sub number (sequence), *optional*
-  `number.section` {string} - tag 28 statement sub sub number (present on some banks), *optional*
-  `openingBalanceDate` {Date} - tag 60 statement opening date
-  `closingBalanceDate` {Date} - tag 62 statement closing date
-  `statementDate` {Date} - abstraction for statement date = `closingBalanceDate`
-  `currency` {string} - statement currency (USD, EUR ...)
-  `openingBalance` {Number} - beginning balance of the statement (with sign, based on debit/credit mark)
-  `closingBalance` {Number} - ending balance of the statement (with sign, based on debit/credit mark)
-  `transactions` {array}  - collection of transactions

**Each Transaction contains data of tag 61 (and tag 86 for details)**

- `date` {Date} - transaction date
- `amount` {Number} - transaction amount (with sign, Credit+, Debit-)
- `currency` {string} - transaction currency (copy of statement currency)
- `details` {string} - content of relevant 86 tag(s), may be multiline (`\n` separated)
- `transactionType` {string} - MT940 transaction type code (e.g. NTRF ...)
- `reference` {string} - payment reference field
- `entryDate` {Date} - entry date field, *optional*
- `fundsCode` {string} - funds code field, *optional*
- `bankReference` {string} - bank reference, *optional*
- `extraDetails` {string} - extra details, *optional*

Each statement is validated for: all strictly required tags, opening/closing balance currency is the same, opening balance + turnover = closing balance.

**Invocation**

Actually the `Parser` has just one method - `parse(data, withTags = false)` - which will convernt raw mt940 text to an array of statements described above. The optional `withTags` param would preserve parsed tags to an additional `tags` attribute of a statement (for any additional further analyasis).

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

**Support for field 86 structure**

Currently the library supports `'<sep>DD'` structure tag format. E.g. `'>20some details >30more data'`. `<sep>` can be `'>'` or `'?'`.
The parser attempts to detect if field 86 contains tags like this and, if yes, adds `structuredDetails` attribute to a statement line. Tag digits are not interpreted as they are not standartized among different banks.

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

## Contribution ##
Contribution is welcomed :)

## Plans ##
- pre/post parsing callbacks
- better support for structured 86 field (e.g /XXX/ tags)

## Author ##
[Alexander Tsybulsky](https://github.com/a-fas)

## License ##
The code is licensed under Apache-2.0 License. Please see [LICENSE](/LICENSE) for details.

## Credits ##
Inspired by https://github.com/WoLpH/mt940
