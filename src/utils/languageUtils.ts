import { Position, Token } from "@aurahelper/core";

/**
 * Class with some util methods to support language analize
 */
export class LanguageUtils {

    /**
     * Method to get N new lines symbols (\n)
     * @param {number} number Number of new lines 
     * @returns {string} Return an string with the N specified new lines 
     */
    static getNewLines(number: number) {
        let newLines = '';
        for (let index = 0; index < number; index++) {
            newLines += '\n';
        }
        return newLines;
    }

    /**
     * Method to get N whitespaces ( )
     * @param {number} number Number of whitespaces 
     * @returns {string} Return an string with the N specified whitespaces 
     */
    static getWhitespaces(number: number) {
        let whitespace = '';
        for (let index = 0; index < number; index++) {
            whitespace += ' ';
        }
        return whitespace;
    }

    /**
     * Method to get the next token from the specified index
     * @param {Token[]} tokens Tokens to get the next one 
     * @param {number} index Index to get the next token from it. 
     * @returns {Token | undefined} Return the next token or undefined if has no token.
     */
    static getNextToken(tokens: Token[], index: number): Token | undefined {
        if (index + 1 < tokens.length) {
            return new Token(tokens[index + 1]);
        }
        return undefined;
    }

    /**
     * Method to get the two next token from the specified index
     * @param {Token[]} tokens Tokens to get the two next token 
     * @param {number} index Index to get the two next token from it. 
     * @returns {Token | undefined} Return the two next token or undefined if has no token.
     */
    static getTwoNextToken(tokens: Token[], index: number): Token | undefined {
        if (index + 2 < tokens.length) {
            return new Token(tokens[index + 2]);
        }
        return undefined;
    }

    /**
     * Method to get the last token from the specified index
     * @param {Token[]} tokens Tokens to get the last token 
     * @param {number} index Index to get the last token from it. 
     * @returns {Token | undefined} Return the last token or undefined if has no token.
     */
    static getLastToken(tokens: Token[], index: number): Token | undefined {
        if (index - 1 >= 0) {
            return new Token(tokens[index - 1]);
        }
        return undefined;
    }

    /**
     * Method to get the two last token from the specified index
     * @param {Token[]} tokens Tokens to get the two last token 
     * @param {number} index Index to get the two last token from it. 
     * @returns {Token | undefined} Return the two last token or undefined if has no token.
     */
    static getTwoLastToken(tokens: Token[], index: number): Token | undefined {
        if (index - 2 >= 0){
            return new Token(tokens[index - 2]);
        }
        return undefined;
    }

    /**
     * Method to check if the analyzed tokens is on Cursor Position on file
     * @param {Token} token Actual token
     * @param {Token} [lastToken] Last token from actual token
     * @param {Token} [nextToken] Next token from acual token
     * @param {Position} [cursorPosition] Cursor position on file
     * @returns {boolean} Returns true if analyzed tokens is on Cursor Position
     */
    static isOnPosition(token: Token, lastToken?: Token, nextToken?: Token, cursorPosition?: Position): boolean {
        if (cursorPosition) {
            if (token && token.range.start.line === cursorPosition.line) {
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