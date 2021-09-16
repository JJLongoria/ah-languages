const { Token } = require('@ah/core').Types;
const ApexTokenType = require('../apex/tokenTypes');

class LanguageUtils {

    static getNewLines(number) {
        let newLines = '';
        for (let index = 0; index < number; index++) {
            newLines += '\n';
        }
        return newLines;
    }

    static getWhitespaces(number) {
        let whitespace = '';
        for (let index = 0; index < number; index++) {
            whitespace += ' ';
        }
        return whitespace;
    }

    static getNextToken(tokens, index) {
        if (index + 1 < tokens.length)
            return new Token(tokens[index + 1]);
    }

    static getTwoNextToken(tokens, index) {
        if (index + 2 < tokens.length)
            return new Token(tokens[index + 2]);
    }

    static getLastToken(tokens, index) {
        if (index - 1 >= 0)
            return new Token(tokens[index - 1]);
    }

    static getTwoLastToken(tokens, index) {
        if (index - 2 >= 0)
            return new Token(tokens[index - 2]);
    }

    static isOnPosition(token, lastToken, nextToken, cursorPosition) {
        if (cursorPosition) {
            if (token && token.range.start.line == cursorPosition.line) {
                if (token.range.start.character <= cursorPosition.character && cursorPosition.character <= token.range.end.character) {
                    return true;
                } else if (token.range.start.character <= cursorPosition.character && nextToken && nextToken.range.start.line === token.range.start.line && cursorPosition.character <= nextToken.range.start.character) {
                    return true;
                }
            } else if (cursorPosition && lastToken && lastToken.range.start.line < cursorPosition.line && nextToken && cursorPosition.line < nextToken.range.start.line) {
                return true;
            }
        }
        return false;
    }
}
module.exports = LanguageUtils;