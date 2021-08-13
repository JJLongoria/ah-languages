const { Token } = require('@ah/core').Types;

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
/*
    static getPositionData(position, token, nextToken) {
        let positionData;
        if (token.startIndex <= position.character && position.character <= token.endIndex) {
            if (positionData === undefined)
                positionData = {
                    startPart: undefined,
                    endPart: undefined,
                    isOnClass: undefined,
                    isOnMethod: undefined,
                    isOnMethodParams: undefined,
                    isOnEnum: undefined,
                    methodSignature: undefined
                };
            let startIndex = position.character - token.startIndex;
            positionData.startPart = token.content.substring(0, startIndex + 1);
            positionData.endPart = token.content.substring(startIndex + 1, token.content.length - 1);
        } else if (token.endIndex <= position.character && position.character <= nextToken.startIndex) {
            if (positionData === undefined)
                positionData = {
                    startPart: undefined,
                    endPart: undefined,
                    isOnClass: undefined,
                    isOnMethod: undefined,
                    isOnMethodParams: undefined,
                    isOnEnum: undefined,
                    methodSignature: undefined
                };
            positionData.startPart = token.content;
        } else {
            if (positionData === undefined)
                positionData = {
                    startPart: undefined,
                    endPart: undefined,
                    isOnClass: undefined,
                    isOnMethod: undefined,
                    isOnMethodParams: undefined,
                    isOnEnum: undefined,
                    methodSignature: undefined
                };
        }
        return positionData;
    }

    static isOnPosition(position, lastToken, token, nextToken) {
        if (position && token && token.line == position.line) {
            if (token.startIndex <= position.character && nextToken && position.character <= nextToken.startIndex)
                return true;
        } else if (position && lastToken && lastToken.line < position.line && nextToken && position.line < nextToken.line) {
            return true;
        }
        return false;
    }*/
}
module.exports = LanguageUtils;