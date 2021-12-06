const { Types } = require('@aurahelper/core');
const LangUtils = require('../../../src/utils/languageUtils');
const Token = Types.Token;

describe('Testing ./src/utils/langUtils.js', () => {
    test('Testing getNewLines()', () => {
        const newLines = LangUtils.getNewLines(5);
        expect(newLines).toEqual('\n\n\n\n\n');
    });

    test('Testing getWhitespaces()', () => {
        const whiteSpaces = LangUtils.getWhitespaces(5);
        expect(whiteSpaces).toEqual('     ');
    });

    test('Testing getNextToken()', () => {
        const tokens = [
            new Token('TokenType1', 'Text1', 'textToLower1', 1, 1),
            new Token('TokenType2', 'Text2', 'textToLower2', 1, 1),
            new Token('TokenType3', 'Text3', 'textToLower3', 1, 1),
            new Token('TokenType4', 'Text4', 'textToLower4', 1, 1),
            new Token('TokenType5', 'Text5', 'textToLower5', 1, 1),
        ];
        const nextToken = LangUtils.getNextToken(tokens, 0);
        expect(nextToken).toEqual(tokens[1]);
    });

    test('Testing getTwoNextToken()', () => {
        const tokens = [
            new Token('TokenType1', 'Text1', 'textToLower1', 1, 1),
            new Token('TokenType2', 'Text2', 'textToLower2', 1, 1),
            new Token('TokenType3', 'Text3', 'textToLower3', 1, 1),
            new Token('TokenType4', 'Text4', 'textToLower4', 1, 1),
            new Token('TokenType5', 'Text5', 'textToLower5', 1, 1),
        ];
        const twoNextToken = LangUtils.getTwoNextToken(tokens, 0);
        expect(twoNextToken).toEqual(tokens[2]);
    });

    test('Testing getLastToken()', () => {
        const tokens = [
            new Token('TokenType1', 'Text1', 'textToLower1', 1, 1),
            new Token('TokenType2', 'Text2', 'textToLower2', 1, 1),
            new Token('TokenType3', 'Text3', 'textToLower3', 1, 1),
            new Token('TokenType4', 'Text4', 'textToLower4', 1, 1),
            new Token('TokenType5', 'Text5', 'textToLower5', 1, 1),
        ];
        const lastToken = LangUtils.getLastToken(tokens, 1);
        expect(lastToken).toEqual(tokens[0]);
    });

    test('Testing getTwoLastToken()', () => {
        const tokens = [
            new Token('TokenType1', 'Text1', 'textToLower1', 1, 1),
            new Token('TokenType2', 'Text2', 'textToLower2', 1, 1),
            new Token('TokenType3', 'Text3', 'textToLower3', 1, 1),
            new Token('TokenType4', 'Text4', 'textToLower4', 1, 1),
            new Token('TokenType5', 'Text5', 'textToLower5', 1, 1),
        ];
        const twoLastToken = LangUtils.getTwoLastToken(tokens, 2);
        expect(twoLastToken).toEqual(tokens[0]);
    });
});