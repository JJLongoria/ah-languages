const TokenType = require('./tokenTypes');
const { Token } = require('@aurahelper/core').Types;


const symbolTokens = {
    ">>>=": TokenType.OPERATOR.BITWISE.UNSIGNED_RIGHT_ASSIGN,
    '<!--': TokenType.COMMENT.XML_START,
    ">>=": TokenType.OPERATOR.BITWISE.SIGNED_RIGTH_ASSIGN,
    "<<=": TokenType.OPERATOR.BITWISE.LEFT_ASSIGN,
    ">>>": TokenType.OPERATOR.BITWISE.UNSIGNED_RIGHT,
    "!==": TokenType.OPERATOR.LOGICAL.INEQUALITY_EXACT,
    "===": TokenType.OPERATOR.LOGICAL.EQUALITY_EXACT,
    '-->': TokenType.COMMENT.XML_END,
    ">>": TokenType.OPERATOR.BITWISE.SIGNED_RIGHT,
    "<<": TokenType.OPERATOR.BITWISE.SIGNED_LEFT,
    "^=": TokenType.OPERATOR.BITWISE.EXCLUSIVE_OR_ASSIGN,
    "--": TokenType.OPERATOR.ARITHMETIC.DECREMENT,
    "++": TokenType.OPERATOR.ARITHMETIC.INCREMENT,
    "!=": TokenType.OPERATOR.LOGICAL.INEQUALITY,
    "<>": TokenType.OPERATOR.LOGICAL.INEQUALITY,
    "==": TokenType.OPERATOR.LOGICAL.EQUALITY,
    "||": TokenType.OPERATOR.LOGICAL.OR,
    "|=": TokenType.OPERATOR.LOGICAL.OR_ASSIGN,
    "&&": TokenType.OPERATOR.LOGICAL.AND,
    "&=": TokenType.OPERATOR.LOGICAL.AND_ASSIGN,
    ">=": TokenType.OPERATOR.LOGICAL.GREATER_THAN_EQUALS,
    "<=": TokenType.OPERATOR.LOGICAL.LESS_THAN_EQUALS,
    "=>": TokenType.OPERATOR.ASSIGN.MAP_KEY_VALUE,
    "+=": TokenType.OPERATOR.ARITHMETIC.ADD_ASSIGN,
    "-=": TokenType.OPERATOR.ARITHMETIC.SUBSTRACT_ASSIGN,
    "*=": TokenType.OPERATOR.ARITHMETIC.MULTIPLY_ASSIGN,
    "/=": TokenType.OPERATOR.ARITHMETIC.DIVIDE_ASSIGN,
    "^": TokenType.OPERATOR.BITWISE.EXCLUSIVE_OR,
    "|": TokenType.OPERATOR.BITWISE.OR,
    "&": TokenType.OPERATOR.BITWISE.AND,
    "+": TokenType.OPERATOR.ARITHMETIC.ADD,
    "-": TokenType.OPERATOR.ARITHMETIC.SUBSTRACT,
    "*": TokenType.OPERATOR.ARITHMETIC.MULTIPLY,
    "/": TokenType.OPERATOR.ARITHMETIC.DIVIDE,
    "!": TokenType.OPERATOR.LOGICAL.NOT,
    "<": TokenType.OPERATOR.LOGICAL.LESS_THAN,
    ">": TokenType.OPERATOR.LOGICAL.GREATER_THAN,
    "=": TokenType.OPERATOR.ASSIGN.ASSIGN,
    "/**": TokenType.COMMENT.BLOCK_START,
    "/*": TokenType.COMMENT.BLOCK_START,
    "*/": TokenType.COMMENT.BLOCK_END,
    "//": TokenType.COMMENT.LINE,
    "///": TokenType.COMMENT.LINE_DOC,
    "(": TokenType.OPERATOR.PRIORITY.PARENTHESIS_OPEN,
    ")": TokenType.OPERATOR.PRIORITY.PARENTHESIS_CLOSE,
    "{": TokenType.BRACKET.CURLY_OPEN,
    "}": TokenType.BRACKET.CURLY_CLOSE,
    "[": TokenType.BRACKET.SQUARE_OPEN,
    "]": TokenType.BRACKET.SQUARE_CLOSE,
    ",": TokenType.PUNCTUATION.COMMA,
    ";": TokenType.PUNCTUATION.SEMICOLON,
    ":": TokenType.PUNCTUATION.COLON,
    ".": TokenType.PUNCTUATION.OBJECT_ACCESSOR,
    "?.": TokenType.PUNCTUATION.SAFE_OBJECT_ACCESSOR,
    "\\": TokenType.PUNCTUATION.BACKSLASH,
    "'": TokenType.PUNCTUATION.QUOTTES,
    "\"": TokenType.PUNCTUATION.DOUBLE_QUOTTES,
    "@": TokenType.PUNCTUATION.AT,
    "?": TokenType.PUNCTUATION.EXMARK,
}

class Tokenizer {

    static tokenize(str) {
        const NUM_FORMAT = /[0-9]/;
        const ID_FORMAT = /([a-zA-Z0-9À-ÿ]|_|–)/;
        const tokens = [];
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
                token = new Token(symbolTokens[fourChars], fourChars, lineNumber, column);
                charIndex += 3;
                column += 4;
            } else if (threeChars.length === 3 && symbolTokens[threeChars] && aBracketsIndex.length === 0) {
                token = new Token(symbolTokens[threeChars], threeChars, lineNumber, column);
                charIndex += 2;
                column += 3;
            } else if (twoChars.length === 2 && symbolTokens[twoChars]) {
                if (isLogicalOperator(symbolTokens[twoChars])) {
                    aBracketsIndex = [];
                }
                if (aBracketsIndex.length === 0) {
                    token = new Token(symbolTokens[twoChars], twoChars, lineNumber, column);
                    charIndex += 1;
                    column += 2;
                } else if (symbolTokens[char]) {
                    token = new Token(symbolTokens[char], char, lineNumber, column);
                }
            } else if (symbolTokens[char]) {
                token = new Token(symbolTokens[char], char, lineNumber, column);
                column++;
            } else if (NUM_FORMAT.test(char)) {
                var numContent = '';
                while (NUM_FORMAT.test(char) || char === '.' || char === ':' || char === '+' || char === '-' || char.toLowerCase() === 't' || char.toLowerCase() === 'z') {
                    numContent += char;
                    char = str.charAt(++charIndex);
                }
                if (numContent.indexOf(':') !== -1 && numContent.indexOf('-') !== -1)
                    token = new Token(TokenType.LITERAL.DATETIME, numContent, lineNumber, column);
                else if (numContent.indexOf('-') !== -1)
                    token = new Token(TokenType.LITERAL.DATE, numContent, lineNumber, column);
                else if (numContent.indexOf(':') !== -1)
                    token = new Token(TokenType.LITERAL.TIME, numContent, lineNumber, column);
                else if (numContent.indexOf('.') !== -1) {
                    token = new Token(TokenType.LITERAL.DOUBLE, numContent, lineNumber, column);
                }
                else {
                    token = new Token(TokenType.LITERAL.INTEGER, numContent, lineNumber, column);
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
                token = new Token(TokenType.IDENTIFIER, idContent, lineNumber, column);
                column += idContent.length;
            } else if (char === "\n") {
                if (onCommentLine)
                    onCommentLine = false;
                lineNumber++;
                column = 0;
            } else if (char !== "\t" && char !== " " && char.trim().length != 0) {
                token = new Token(TokenType.UNKNOWN, char, lineNumber, column);
                column++;
            } else if (char === "\t") {
                column += 4;
            } else {
                column++;
            }
            if (token) {
                if (!onText && !onCommentBlock && !onCommentLine && token.type === TokenType.PUNCTUATION.QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    token.type = TokenType.PUNCTUATION.QUOTTES_START;
                    onText = true;
                    token.parentToken = tokens.length - 1;
                    quottesIndex.push(tokens.length);
                } else if (onText && token.type === TokenType.PUNCTUATION.QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    token.type = TokenType.PUNCTUATION.QUOTTES_END;
                    onText = false;
                    if (quottesIndex.length > 0) {
                        const index = quottesIndex.pop();
                        token.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                    }
                } else if (!onText && !onCommentBlock && !onCommentLine && (token.type === TokenType.COMMENT.BLOCK_START || token.type === TokenType.COMMENT.XML_START)) {
                    onCommentBlock = true;
                    token.parentToken = tokens.length - 1;
                    commentBlockIndex.push(tokens.length);
                } else if (onCommentBlock && (token.type === TokenType.COMMENT.BLOCK_END || token.type === TokenType.COMMENT.XML_END)) {
                    onCommentBlock = false;
                    if (commentBlockIndex.length > 0) {
                        const index = commentBlockIndex.pop();
                        token.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                    }
                } else if (!onText && !onCommentBlock && !onCommentLine && (token.type === TokenType.COMMENT.LINE || token.type === TokenType.COMMENT.LINE_DOC)) {
                    onCommentLine = true;
                } else if (onText) {
                    token.type = TokenType.LITERAL.STRING;
                } else if (onCommentBlock || onCommentLine) {
                    token.type = TokenType.COMMENT.CONTENT;
                } else if (token.type === TokenType.OPERATOR.LOGICAL.LESS_THAN) {
                    aBracketsIndex.push(tokens.length);
                } else if (token.type === TokenType.OPERATOR.LOGICAL.GREATER_THAN) {
                    if (aBracketsIndex.length > 0) {
                        let index = aBracketsIndex.pop();
                        token.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                    }
                } else if (token.type === TokenType.BRACKET.CURLY_OPEN && lastToken) {
                    bracketIndex.push(tokens.length);
                } else if (token.type === TokenType.BRACKET.CURLY_CLOSE) {
                    if (bracketIndex.length > 0) {
                        let index = bracketIndex.pop();
                        token.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                    }
                } else if (token.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_OPEN) {
                    parentIndex.push(tokens.length);
                } else if (token.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_CLOSE) {
                    if (parentIndex.length > 0) {
                        let index = parentIndex.pop();
                        if (tokens[index]) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (token.type === TokenType.BRACKET.SQUARE_OPEN) {
                    sqBracketIndex.push(tokens.length);
                } else if (token.type === TokenType.BRACKET.SQUARE_CLOSE) {
                    if (sqBracketIndex.length > 0) {
                        let index = sqBracketIndex.pop();
                        if (tokens[index]) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (token.type === TokenType.BRACKET.SQUARE_OPEN) {
                    sqBracketIndex.push(tokens.length);
                } else if (token.type === TokenType.BRACKET.SQUARE_CLOSE) {
                    if (sqBracketIndex.length > 0) {
                        let index = sqBracketIndex.pop();
                        if (tokens[index]) {
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
module.exports = Tokenizer;

function isLogicalOperator(symbol) {
    return symbol === TokenType.OPERATOR.LOGICAL.INEQUALITY || symbol === TokenType.OPERATOR.LOGICAL.EQUALITY || symbol === TokenType.OPERATOR.LOGICAL.OR || symbol === TokenType.OPERATOR.LOGICAL.OR_ASSIGN || symbol === TokenType.OPERATOR.LOGICAL.AND || symbol === TokenType.OPERATOR.LOGICAL.AND_ASSIGN;
}