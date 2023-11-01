# Change Log
All notable changes to this project will be documented in this file.

## [2.1.0 - 2023-10-30]
### Changed
- Changed fast-xml-parser dependency from v3 to v4 to fix some vulnerabilities and improve performance

### Added
- Added and analyze new apex tokens
- Added two new options to Apex Formatter
  - addWhitespaceBeforeOpenParenthesisOperator
  - addWhitespaceAfterCloseParenthesisOperator
  - SObjectFieldsPerLine
  - maxConditionsPerLine
  - conditionLogicOperatorOnNewLine
- Added support to tab size on apex formatter

### Fixed
- Fixed formating error with annotations like @SuppressWarnings

## [2.0.6 - 2023-10-22]
### Fixed
- Fixed some vulnerabilities

## [2.0.5 - 2022-06-12]
### Fixed
- Fixed an unexpected behaviour with "on" keyword when format triggers

## [2.0.2 - 2022-01-09]
### Added
- Fixed an unexpected behaviour with newLinesBetweenCodeBlockMembers format option

## [2.0.1 - 2021-12-19]
### Added
- Fixed minor error on Apex formatter with inner queries as projection

## [2.0.0 - 2021-12-13]
### Added
- Changed to Typescript
- Added support to API 53.0

### Fixed
- Fix Apex formatter error when has .class... into the code
- Fix all minor errors

## [1.0.0 - 2021-09-18]
### Added
- Added Apex module with tokenizer, Formatter, Parser classes and TokenTypes object
- Added Aura module with tokenizer, Parser and TokenTypes object
- Added Javascript module with tokenizer, Parser and TokenTypes object
- Added XML module with Parser and Utils classes
- Added System module with System class and to all system classes and aura components
- Added Language Utils module with util class and methods to all tokenizers and parsers