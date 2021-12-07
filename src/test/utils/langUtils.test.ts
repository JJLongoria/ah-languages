import { Position, Token } from "@aurahelper/core";
import { LanguageUtils } from "../../utils/languageUtils";

describe('Testing ./src/utils/langUtils.js', () => {
    test('Testing getNewLines()', () => {
        const newLines = LanguageUtils.getNewLines(5);
        expect(newLines).toEqual('\n\n\n\n\n');
    });

    test('Testing getWhitespaces()', () => {
        const whiteSpaces = LanguageUtils.getWhitespaces(5);
        expect(whiteSpaces).toEqual('     ');
    });

    test('Testing getNextToken()', () => {
        const tokens = [
            new Token('TokenType1', 'Text1', 1, 1),
            new Token('TokenType2', 'Text2', 1, 1),
            new Token('TokenType3', 'Text3', 1, 1),
            new Token('TokenType4', 'Text4', 1, 1),
            new Token('TokenType5', 'Text5', 1, 1),
        ];
        let nextToken = LanguageUtils.getNextToken(tokens, 0);
        expect(nextToken).toEqual(tokens[1]);
        nextToken = LanguageUtils.getNextToken(tokens, 10);
        expect(nextToken).toBeUndefined();
    });

    test('Testing getTwoNextToken()', () => {
        const tokens = [
            new Token('TokenType1', 'Text1', 1, 1),
            new Token('TokenType2', 'Text2', 1, 1),
            new Token('TokenType3', 'Text3', 1, 1),
            new Token('TokenType4', 'Text4', 1, 1),
            new Token('TokenType5', 'Text5', 1, 1),
        ];
        let twoNextToken = LanguageUtils.getTwoNextToken(tokens, 0);
        expect(twoNextToken).toEqual(tokens[2]);
        twoNextToken = LanguageUtils.getTwoNextToken(tokens, 10);
        expect(twoNextToken).toBeUndefined();
    });
    test('Testing getLastToken()', () => {
        const tokens = [
            new Token('TokenType1', 'Text1', 1, 1),
            new Token('TokenType2', 'Text2', 1, 1),
            new Token('TokenType3', 'Text3', 1, 1),
            new Token('TokenType4', 'Text4', 1, 1),
            new Token('TokenType5', 'Text5', 1, 1),
        ];
        let lastToken = LanguageUtils.getLastToken(tokens, 1);
        expect(lastToken).toEqual(tokens[0]);
        lastToken = LanguageUtils.getLastToken(tokens, 0);
        expect(lastToken).toBeUndefined();
    });
    test('Testing getTwoLastToken()', () => {
        const tokens = [
            new Token('TokenType1', 'Text1', 1, 1),
            new Token('TokenType2', 'Text2', 1, 1),
            new Token('TokenType3', 'Text3', 1, 1),
            new Token('TokenType4', 'Text4', 1, 1),
            new Token('TokenType5', 'Text5', 1, 1),
        ];
        let twoLastToken = LanguageUtils.getTwoLastToken(tokens, 2);
        expect(twoLastToken).toEqual(tokens[0]);
        twoLastToken = LanguageUtils.getTwoLastToken(tokens, 1);
        expect(twoLastToken).toBeUndefined();
    });
    test('Testing isOnPosition()', () => {
        const tokens = [
            new Token('TokenType1', 'Text1', 1, 1),
            new Token('TokenType2', 'Text2', 1, 1),
            new Token('TokenType3', 'Text3', 1, 1),
            new Token('TokenType4', 'Text4', 2, 3),
            new Token('TokenType5', 'Text5', 2, 3),
            new Token('TokenType5', 'Text5', 2, 3),
        ];
        LanguageUtils.isOnPosition(tokens[1], tokens[0], tokens[2], new Position(1, 1));
        LanguageUtils.isOnPosition(tokens[4], tokens[3], tokens[5], new Position(1, 1));
    });
});