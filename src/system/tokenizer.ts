import { Token, TokenTypes } from "@aurahelper/core";

const symbolTokens: { [key: string]: string } = {
    ">>>=": TokenTypes.OPERATOR.BITWISE.UNSIGNED_RIGHT_ASSIGN,
    '<!--': TokenTypes.COMMENT.XML_START,
    ">>=": TokenTypes.OPERATOR.BITWISE.SIGNED_RIGTH_ASSIGN,
    "<<=": TokenTypes.OPERATOR.BITWISE.LEFT_ASSIGN,
    ">>>": TokenTypes.OPERATOR.BITWISE.UNSIGNED_RIGHT,
    "!==": TokenTypes.OPERATOR.LOGICAL.INEQUALITY_EXACT,
    "===": TokenTypes.OPERATOR.LOGICAL.EQUALITY_EXACT,
    '-->': TokenTypes.COMMENT.XML_END,
    ">>": TokenTypes.OPERATOR.BITWISE.SIGNED_RIGHT,
    "<<": TokenTypes.OPERATOR.BITWISE.SIGNED_LEFT,
    "^=": TokenTypes.OPERATOR.BITWISE.EXCLUSIVE_OR_ASSIGN,
    "--": TokenTypes.OPERATOR.ARITHMETIC.DECREMENT,
    "++": TokenTypes.OPERATOR.ARITHMETIC.INCREMENT,
    "!=": TokenTypes.OPERATOR.LOGICAL.INEQUALITY,
    "<>": TokenTypes.OPERATOR.LOGICAL.INEQUALITY,
    "==": TokenTypes.OPERATOR.LOGICAL.EQUALITY,
    "||": TokenTypes.OPERATOR.LOGICAL.OR,
    "|=": TokenTypes.OPERATOR.LOGICAL.OR_ASSIGN,
    "&&": TokenTypes.OPERATOR.LOGICAL.AND,
    "&=": TokenTypes.OPERATOR.LOGICAL.AND_ASSIGN,
    ">=": TokenTypes.OPERATOR.LOGICAL.GREATER_THAN_EQUALS,
    "<=": TokenTypes.OPERATOR.LOGICAL.LESS_THAN_EQUALS,
    "=>": TokenTypes.OPERATOR.ASSIGN.MAP_KEY_VALUE,
    "+=": TokenTypes.OPERATOR.ARITHMETIC.ADD_ASSIGN,
    "-=": TokenTypes.OPERATOR.ARITHMETIC.SUBSTRACT_ASSIGN,
    "*=": TokenTypes.OPERATOR.ARITHMETIC.MULTIPLY_ASSIGN,
    "/=": TokenTypes.OPERATOR.ARITHMETIC.DIVIDE_ASSIGN,
    "^": TokenTypes.OPERATOR.BITWISE.EXCLUSIVE_OR,
    "|": TokenTypes.OPERATOR.BITWISE.OR,
    "&": TokenTypes.OPERATOR.BITWISE.AND,
    "+": TokenTypes.OPERATOR.ARITHMETIC.ADD,
    "-": TokenTypes.OPERATOR.ARITHMETIC.SUBSTRACT,
    "*": TokenTypes.OPERATOR.ARITHMETIC.MULTIPLY,
    "/": TokenTypes.OPERATOR.ARITHMETIC.DIVIDE,
    "!": TokenTypes.OPERATOR.LOGICAL.NOT,
    "<": TokenTypes.OPERATOR.LOGICAL.LESS_THAN,
    ">": TokenTypes.OPERATOR.LOGICAL.GREATER_THAN,
    "=": TokenTypes.OPERATOR.ASSIGN.ASSIGN,
    "/**": TokenTypes.COMMENT.BLOCK_START,
    "/*": TokenTypes.COMMENT.BLOCK_START,
    "*/": TokenTypes.COMMENT.BLOCK_END,
    "//": TokenTypes.COMMENT.LINE,
    "///": TokenTypes.COMMENT.LINE_DOC,
    "(": TokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN,
    ")": TokenTypes.OPERATOR.PRIORITY.PARENTHESIS_CLOSE,
    "{": TokenTypes.BRACKET.CURLY_OPEN,
    "}": TokenTypes.BRACKET.CURLY_CLOSE,
    "[": TokenTypes.BRACKET.SQUARE_OPEN,
    "]": TokenTypes.BRACKET.SQUARE_CLOSE,
    ",": TokenTypes.PUNCTUATION.COMMA,
    ";": TokenTypes.PUNCTUATION.SEMICOLON,
    ":": TokenTypes.PUNCTUATION.COLON,
    ".": TokenTypes.PUNCTUATION.OBJECT_ACCESSOR,
    "?.": TokenTypes.PUNCTUATION.SAFE_OBJECT_ACCESSOR,
    "\\": TokenTypes.PUNCTUATION.BACKSLASH,
    "'": TokenTypes.PUNCTUATION.QUOTTES,
    "\"": TokenTypes.PUNCTUATION.DOUBLE_QUOTTES,
    "@": TokenTypes.PUNCTUATION.AT,
    "?": TokenTypes.PUNCTUATION.EXMARK,
};

export class Tokenizer {

    /**
     * Method to tokenize any String into basic tokens
     * @param {string} str String to tokenize 
     * @param {number} [virtualLine] To tokenize a single line into a entire document, you can pass the line number to get all data correctly, including lines and colums
     * @returns {Token[]} Return the token list from str
     */
    static tokenize(str: string, virtualLine?: number): Token[] {
        const NUM_FORMAT = /[0-9]/;
        const ID_FORMAT = /([a-zA-Z0-9À-ÿ]|_|–)/;
        const tokens: Token[] = [];
        let lineNumber = 0;
        let column = 0;
        let onCommentBlock = false;
        let onCommentLine = false;
        let onText = false;
        let aBracketsIndex = [];
        const parentIndex = [];
        const bracketIndex = [];
        const sqBracketIndex = [];
        const quottesIndex = [];
        const commentBlockIndex = [];
        let lastToken = (tokens.length > 0) ? tokens[tokens.length - 1] : undefined;
        for (let charIndex = 0, len = str.length; charIndex < len; charIndex++) {
            const fourChars = str.substring(charIndex, charIndex + 4);
            const threeChars = str.substring(charIndex, charIndex + 3);
            const twoChars = str.substring(charIndex, charIndex + 2);
            let char = str.charAt(charIndex);
            let token;
            if (fourChars.length === 4 && symbolTokens[fourChars] && aBracketsIndex.length === 0) {
                token = new Token(symbolTokens[fourChars], fourChars, (virtualLine !== undefined && virtualLine >= 0) ? virtualLine : lineNumber, column);
                charIndex += 3;
                column += 4;
            } else if (threeChars.length === 3 && symbolTokens[threeChars] && aBracketsIndex.length === 0) {
                token = new Token(symbolTokens[threeChars], threeChars, (virtualLine !== undefined && virtualLine >= 0) ? virtualLine : lineNumber, column);
                charIndex += 2;
                column += 3;
            } else if (twoChars.length === 2 && symbolTokens[twoChars]) {
                if (isLogicalOperator(symbolTokens[twoChars])) {
                    aBracketsIndex = [];
                }
                if (aBracketsIndex.length === 0) {
                    token = new Token(symbolTokens[twoChars], twoChars, (virtualLine !== undefined && virtualLine >= 0) ? virtualLine : lineNumber, column);
                    charIndex += 1;
                    column += 2;
                } else if (symbolTokens[char]) {
                    token = new Token(symbolTokens[char], char, (virtualLine !== undefined && virtualLine >= 0) ? virtualLine : lineNumber, column);
                    column++;
                }
            } else if (symbolTokens[char]) {
                token = new Token(symbolTokens[char], char, (virtualLine !== undefined && virtualLine >= 0) ? virtualLine : lineNumber, column);
                if (mustResetABracketIndex(token)) {
                    aBracketsIndex = [];
                }
                column++;
            } else if (NUM_FORMAT.test(char)) {
                var numContent = '';
                while (NUM_FORMAT.test(char) || char === '.' || char === ':' || char === '+' || char === '-' || char.toLowerCase() === 't' || char.toLowerCase() === 'z') {
                    numContent += char;
                    char = str.charAt(++charIndex);
                }
                if (numContent.indexOf(':') !== -1 && numContent.indexOf('-') !== -1) {
                    token = new Token(TokenTypes.LITERAL.DATETIME, numContent, (virtualLine !== undefined && virtualLine >= 0) ? virtualLine : lineNumber, column);
                } else if (numContent.indexOf('-') !== -1) {
                    token = new Token(TokenTypes.LITERAL.DATE, numContent, (virtualLine !== undefined && virtualLine >= 0) ? virtualLine : lineNumber, column);
                } else if (numContent.indexOf(':') !== -1) {
                    token = new Token(TokenTypes.LITERAL.TIME, numContent, (virtualLine !== undefined && virtualLine >= 0) ? virtualLine : lineNumber, column);
                } else if (numContent.indexOf('.') !== -1) {
                    token = new Token(TokenTypes.LITERAL.DOUBLE, numContent, (virtualLine !== undefined && virtualLine >= 0) ? virtualLine : lineNumber, column);
                } else {
                    token = new Token(TokenTypes.LITERAL.INTEGER, numContent, (virtualLine !== undefined && virtualLine >= 0) ? virtualLine : lineNumber, column);
                }
                charIndex--;
                column += numContent.length;
            } else if (ID_FORMAT.test(char)) {
                var idContent = '';
                while (ID_FORMAT.test(char)) {
                    idContent += char;
                    char = str.charAt(++charIndex);
                }
                charIndex--;
                token = new Token(TokenTypes.IDENTIFIER, idContent, (virtualLine !== undefined && virtualLine >= 0) ? virtualLine : lineNumber, column);
                column += idContent.length;
            } else if (char === "\n") {
                if (onCommentLine) {
                    onCommentLine = false;
                }
                lineNumber++;
                column = 0;
            } else if (char !== "\t" && char !== " " && char.trim().length !== 0) {
                token = new Token(TokenTypes.UNKNOWN, char, (virtualLine !== undefined && virtualLine >= 0) ? virtualLine : lineNumber, column);
                column++;
            } else if (char === "\t") {
                column += 4;
            } else {
                column++;
            }
            if (token) {
                if (!onText && !onCommentBlock && !onCommentLine && token.type === TokenTypes.PUNCTUATION.QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    token.type = TokenTypes.PUNCTUATION.QUOTTES_START;
                    onText = true;
                    token.parentToken = tokens.length - 1;
                    quottesIndex.push(tokens.length);
                } else if (onText && token.type === TokenTypes.PUNCTUATION.QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    token.type = TokenTypes.PUNCTUATION.QUOTTES_END;
                    onText = false;
                    if (quottesIndex.length > 0) {
                        const index = quottesIndex.pop();
                        if (index !== undefined) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (!onText && !onCommentBlock && !onCommentLine && (token.type === TokenTypes.COMMENT.BLOCK_START || token.type === TokenTypes.COMMENT.XML_START)) {
                    onCommentBlock = true;
                    token.parentToken = tokens.length - 1;
                    commentBlockIndex.push(tokens.length);
                } else if (onCommentBlock && (token.type === TokenTypes.COMMENT.BLOCK_END || token.type === TokenTypes.COMMENT.XML_END)) {
                    onCommentBlock = false;
                    if (commentBlockIndex.length > 0) {
                        const index = commentBlockIndex.pop();
                        if (index !== undefined) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (!onText && !onCommentBlock && !onCommentLine && (token.type === TokenTypes.COMMENT.LINE || token.type === TokenTypes.COMMENT.LINE_DOC)) {
                    onCommentLine = true;
                } else if (onText) {
                    token.type = TokenTypes.LITERAL.STRING;
                } else if (onCommentBlock || onCommentLine) {
                    token.type = TokenTypes.COMMENT.CONTENT;
                } else if (token.type === TokenTypes.OPERATOR.LOGICAL.LESS_THAN) {
                    aBracketsIndex.push(tokens.length);
                } else if (token.type === TokenTypes.OPERATOR.LOGICAL.GREATER_THAN) {
                    if (aBracketsIndex.length > 0) {
                        const index = aBracketsIndex.pop();
                        if (index !== undefined) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (token.type === TokenTypes.BRACKET.CURLY_OPEN && lastToken) {
                    bracketIndex.push(tokens.length);
                } else if (token.type === TokenTypes.BRACKET.CURLY_CLOSE) {
                    if (bracketIndex.length > 0) {
                        const index = bracketIndex.pop();
                        if (index !== undefined) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (token.type === TokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN) {
                    parentIndex.push(tokens.length);
                } else if (token.type === TokenTypes.OPERATOR.PRIORITY.PARENTHESIS_CLOSE) {
                    if (parentIndex.length > 0) {
                        const index = parentIndex.pop();
                        if (index !== undefined && tokens[index]) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (token.type === TokenTypes.BRACKET.SQUARE_OPEN) {
                    sqBracketIndex.push(tokens.length);
                } else if (token.type === TokenTypes.BRACKET.SQUARE_CLOSE) {
                    if (sqBracketIndex.length > 0) {
                        const index = sqBracketIndex.pop();
                        if (index !== undefined && tokens[index]) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (token.type === TokenTypes.BRACKET.SQUARE_OPEN) {
                    sqBracketIndex.push(tokens.length);
                } else if (token.type === TokenTypes.BRACKET.SQUARE_CLOSE) {
                    if (sqBracketIndex.length > 0) {
                        const index = sqBracketIndex.pop();
                        if (index !== undefined && tokens[index]) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                }
                tokens.push(token);
            }
        }
        return tokens;
    }
}

function isLogicalOperator(symbol: string): boolean {
    return symbol === TokenTypes.OPERATOR.LOGICAL.INEQUALITY || symbol === TokenTypes.OPERATOR.LOGICAL.EQUALITY || symbol === TokenTypes.OPERATOR.LOGICAL.OR || symbol === TokenTypes.OPERATOR.LOGICAL.OR_ASSIGN || symbol === TokenTypes.OPERATOR.LOGICAL.AND || symbol === TokenTypes.OPERATOR.LOGICAL.AND_ASSIGN;
}


function mustResetABracketIndex(token: Token): boolean {
    switch (token.type) {
        case TokenTypes.PUNCTUATION.SEMICOLON:
        case TokenTypes.BRACKET.CURLY_OPEN:
        case TokenTypes.BRACKET.CURLY_CLOSE:
            return true;
    }
    return false;
}