const { StrUtils, Validator, Utils } = require('@aurahelper/core').CoreUtils;
const { Token } = require('@aurahelper/core').Types;
const TokenType = require('./tokenTypes');
const { PathUtils, FileReader } = require('@aurahelper/core').FileSystem;

const symbolTokens = {
    ">>>=": TokenType.OPERATOR.BITWISE.UNSIGNED_RIGHT_ASSIGN,
    ">>=": TokenType.OPERATOR.BITWISE.SIGNED_RIGTH_ASSIGN,
    "<<=": TokenType.OPERATOR.BITWISE.LEFT_ASSIGN,
    ">>>": TokenType.OPERATOR.BITWISE.UNSIGNED_RIGHT,
    "!==": TokenType.OPERATOR.LOGICAL.INEQUALITY_EXACT,
    "===": TokenType.OPERATOR.LOGICAL.EQUALITY_EXACT,
    ">>": TokenType.OPERATOR.BITWISE.SIGNED_RIGHT,
    "<<": TokenType.OPERATOR.BITWISE.SIGNED_LEFT,
    "^=": TokenType.OPERATOR.BITWISE.EXCLUSIVE_OR_ASSIGN,
    "--": TokenType.OPERATOR.ARITHMETIC.DECREMENT,
    "++": TokenType.OPERATOR.ARITHMETIC.INCREMENT,
    "!=": TokenType.OPERATOR.LOGICAL.INEQUALITY,
    "==": TokenType.OPERATOR.LOGICAL.EQUALITY,
    "||": TokenType.OPERATOR.LOGICAL.OR,
    "|=": TokenType.OPERATOR.LOGICAL.OR_ASSIGN,
    "&&": TokenType.OPERATOR.LOGICAL.AND,
    "&=": TokenType.OPERATOR.LOGICAL.AND_ASSIGN,
    ">=": TokenType.OPERATOR.LOGICAL.GREATER_THAN_EQUALS,
    "<=": TokenType.OPERATOR.LOGICAL.LESS_THAN_EQUALS,
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
    '"': TokenType.PUNCTUATION.DOUBLE_QUOTTES,
    "@": TokenType.PUNCTUATION.AT,
    "?": TokenType.PUNCTUATION.EXMARK,
}

const reservedKeywords = {
    "abstract": TokenType.KEYWORD.FOR_FUTURE,
    "arguments": TokenType.KEYWORD.OTHER,
    "await": TokenType.KEYWORD.OTHER,
    "boolean": TokenType.KEYWORD.FOR_FUTURE,
    "break": TokenType.KEYWORD.FLOW_CONTROL.BREAK,
    "byte": TokenType.KEYWORD.FOR_FUTURE,
    "case": TokenType.KEYWORD.FLOW_CONTROL.SWITCH_CASE,
    "catch": TokenType.KEYWORD.FLOW_CONTROL.CATCH,
    "char": TokenType.KEYWORD.FOR_FUTURE,
    "class": TokenType.KEYWORD.DECLARATION.CLASS,
    "const": TokenType.KEYWORD.DECLARATION.CONSTANT,
    "continue": TokenType.KEYWORD.FLOW_CONTROL.CONTINUE,
    "constructor": TokenType.KEYWORD.DECLARATION.CONSTRUCTOR,
    "debugger": TokenType.KEYWORD.OTHER,
    "default": TokenType.KEYWORD.OTHER,
    "double": TokenType.KEYWORD.FOR_FUTURE,
    "do": TokenType.KEYWORD.FLOW_CONTROL.DO,
    "else": TokenType.KEYWORD.FLOW_CONTROL.ELSE,
    "enum": TokenType.KEYWORD.DECLARATION.ENUM,
    "eval": TokenType.KEYWORD.OTHER,
    "export": TokenType.KEYWORD.OTHER,
    "extends": TokenType.KEYWORD.DECLARATION.EXTENDS,
    "false": TokenType.LITERAL.BOOLEAN,
    "final": TokenType.KEYWORD.MODIFIER.FINAL,
    "finally": TokenType.KEYWORD.FLOW_CONTROL.FINALLY,
    "float": TokenType.KEYWORD.FOR_FUTURE,
    "for": TokenType.KEYWORD.FLOW_CONTROL.FOR,
    "function": TokenType.KEYWORD.DECLARATION.FUNCTION,
    "goto": TokenType.KEYWORD.FOR_FUTURE,
    "if": TokenType.KEYWORD.FLOW_CONTROL.IF,
    "implements": TokenType.KEYWORD.DECLARATION.IMPLEMENTS,
    "import": TokenType.KEYWORD.OTHER,
    "Infinity": TokenType.LITERAL.INFINITY,
    "in": TokenType.KEYWORD.OTHER,
    "instanceof": TokenType.OPERATOR.LOGICAL.INSTANCE_OF,
    "int": TokenType.KEYWORD.FOR_FUTURE,
    "interface": TokenType.KEYWORD.DECLARATION.INTERFACE,
    "let": TokenType.KEYWORD.DECLARATION.VARIABLE,
    "long": TokenType.KEYWORD.FOR_FUTURE,
    "NaN": TokenType.LITERAL.NAN,
    "native": TokenType.KEYWORD.OTHER,
    "new": TokenType.KEYWORD.OBJECT.NEW,
    "null": TokenType.LITERAL.NULL,
    "of": TokenType.KEYWORD.OTHER,
    "package": TokenType.KEYWORD.OTHER,
    "private": TokenType.KEYWORD.MODIFIER.ACCESS,
    "protected": TokenType.KEYWORD.MODIFIER.ACCESS,
    "public": TokenType.KEYWORD.MODIFIER.ACCESS,
    "return": TokenType.KEYWORD.FLOW_CONTROL.RETURN,
    "short": TokenType.KEYWORD.FOR_FUTURE,
    "static": TokenType.KEYWORD.MODIFIER.STATIC,
    "super": TokenType.KEYWORD.OBJECT.SUPER,
    "switch": TokenType.KEYWORD.FLOW_CONTROL.SWITCH,
    "synchronized": TokenType.KEYWORD.FOR_FUTURE,
    "this": TokenType.KEYWORD.OBJECT.THIS,
    "throw": TokenType.KEYWORD.FLOW_CONTROL.THROW,
    "throws": TokenType.KEYWORD.FLOW_CONTROL.THROW,
    "transient": TokenType.KEYWORD.MODIFIER.TRANSIENT,
    "true": TokenType.LITERAL.BOOLEAN,
    "try": TokenType.KEYWORD.FLOW_CONTROL.TRY,
    "typeof": TokenType.KEYWORD.OBJECT.TYPEOF,
    "undefined": TokenType.LITERAL.UNDEFINED,
    "var": TokenType.KEYWORD.DECLARATION.VARIABLE,
    "void": TokenType.DATATYPE.VOID,
    "volatile": TokenType.KEYWORD.OTHER,
    "while": TokenType.KEYWORD.FLOW_CONTROL.WHILE,
    "with": TokenType.KEYWORD.OTHER,
    "yield": TokenType.KEYWORD.OTHER,
    'Array': TokenType.DATATYPE.ARRAY,
    'Date': TokenType.DATATYPE.DATE,
    'String': TokenType.DATATYPE.STRING,
    'Math': TokenType.DATATYPE.MATH,
    'Number': TokenType.DATATYPE.NUMBER,
    'Object': TokenType.DATATYPE.OBJECT,
    'prototype': TokenType.KEYWORD.OBJECT.PROTOTYPE,
};

const predefinedObjects = [
    'hasOwnProperty',
    'isFinite',
    'isNaN',
    'isPrototypeOf',
    'length',
    'name',
    'toString',
    'valueOf',
    'getClass',
    'java',
    'JavaArray',
    'javaClass',
    'JavaObject',
    'JavaPackage',
    'alert',
    'all',
    'anchor',
    'anchors',
    'area',
    'assign',
    'blur',
    'button',
    'checkbox',
    'clearInterval',
    'clearTimeout',
    'clientInformation',
    'close',
    'closed',
    'confirm',
    'crypto',
    'decodeURI',
    'decodeURIComponent',
    'defaultStatus',
    'embeds',
    'encodeURI',
    'encodeURIComponent',
    'escape',
    'event',
    'fileUpload',
    'focus',
    'form',
    'forms',
    'frame',
    'innerHeight',
    'innerWidth',
    'layer',
    'layers',
    'link',
    'location',
    'mimeTypes',
    'navigate',
    'navigator',
    'frames',
    'frameRate',
    'hidden',
    'history',
    'image',
    'images',
    'offscreenBuffering',
    'open',
    'opener',
    'option',
    'outerHeight',
    'outerWidth',
    'packages',
    'pageXOffset',
    'pageYOffset',
    'parent',
    'parseFloat',
    'parseInt',
    'password',
    'pkcs11',
    'plugin',
    'prompt',
    'propertyIsEnum',
    'radio',
    'reset',
    'screenX',
    'screenY',
    'scroll',
    'secure',
    'select',
    'self',
    'setInterval',
    'setTimeout',
    'status',
    'submit',
    'taint',
    'text',
    'textarea',
    'top',
    'unescape',
    'untaint',
    'window',
    'onblur',
    'onclick',
    'onerror',
    'onfocus',
    'onkeydown',
    'onkeypress',
    'onkeyup',
    'onmouseover',
    'onload',
    'onmouseup',
    'onmousedown',
    'onsubmit'
];

class JSTokenizer {

    static tokenize(filePathOrContent, tabSize) {
        if (!tabSize)
            tabSize = 4;
        let content;
        if (Utils.isString(filePathOrContent)) {
            try {
                content = FileReader.readFileSync(Validator.validateFilePath(filePathOrContent));
            } catch (error) {
                content = filePathOrContent;
            }
        } else {
            throw new Error('You must to select a file path,or file content');
        }
        const NUM_FORMAT = /[0-9]/;
        const ID_FORMAT = /([a-zA-Z0-9À-ÿ]|_|–)/;
        content = StrUtils.replace(content, '\r\n', '\n');
        const tokens = [];
        let lineNumber = 0;
        let column = 0;
        let onCommentBlock = false;
        let onCommentLine = false;
        let onText = false;
        const parentIndex = [];
        const bracketIndex = [];
        let auxBracketIndex = [];
        const classDeclarationIndex = [];
        const enumDeclarationIndex = [];
        const sqBracketIndex = [];
        const quottesIndex = [];
        const commentBlockIndex = [];
        for (let charIndex = 0, len = content.length; charIndex < len; charIndex++) {
            const fourChars = content.substring(charIndex, charIndex + 4);
            const threeChars = content.substring(charIndex, charIndex + 3);
            const twoChars = content.substring(charIndex, charIndex + 2);
            let char = content.charAt(charIndex);
            let token;
            let lastToken = (tokens.length > 0) ? tokens[tokens.length - 1] : undefined;
            if (fourChars.length === 4 && symbolTokens[fourChars]) {
                token = new Token(symbolTokens[fourChars], fourChars, lineNumber, column);
                charIndex += 3;
                column += 4;
            } else if (threeChars.length === 3 && symbolTokens[threeChars]) {
                token = new Token(symbolTokens[threeChars], threeChars, lineNumber, column);
                charIndex += 2;
                column += 3;
            } else if (twoChars.length === 2 && symbolTokens[twoChars]) {
                token = new Token(symbolTokens[twoChars], twoChars, lineNumber, column);
                charIndex += 1;
                column += 2;
            } else if (symbolTokens[char]) {
                token = new Token(symbolTokens[char], char, lineNumber, column);
                column++;
            } else if (NUM_FORMAT.test(char)) {
                var numContent = '';
                while (NUM_FORMAT.test(char) || char === '.' || char === ':' || char === '+' || char === '-' || char.toLowerCase() === 't' || char.toLowerCase() === 'z') {
                    numContent += char;
                    char = content.charAt(++charIndex);
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
                    char = content.charAt(++charIndex);
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
                column += tabSize;
            } else {
                column++;
            }
            if (token !== undefined) {
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
                        token.parentToken = tokens[index].parentToken;
                    }
                } else if (!onText && !onCommentBlock && !onCommentLine && token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    token.type = TokenType.PUNCTUATION.DOUBLE_QUOTTES_START;
                    onText = true;
                    token.parentToken = tokens.length - 1;
                    quottesIndex.push(tokens.length);
                } else if (onText && token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    token.type = TokenType.PUNCTUATION.DOUBLE_QUOTTES_END;
                    onText = false;
                    if (quottesIndex.length > 0) {
                        const index = quottesIndex.pop();
                        token.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                        token.parentToken = tokens[index].parentToken;
                    }
                } else if (!onText && !onCommentBlock && !onCommentLine && token.type === TokenType.COMMENT.BLOCK_START) {
                    onCommentBlock = true;
                    token.parentToken = tokens.length - 1;
                    commentBlockIndex.push(tokens.length);
                } else if (onCommentBlock && token.type === TokenType.COMMENT.BLOCK_END) {
                    onCommentBlock = false;
                    if (commentBlockIndex.length > 0) {
                        const index = commentBlockIndex.pop();
                        token.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                        token.parentToken = tokens[index].parentToken;
                    }
                } else if (!onText && !onCommentBlock && !onCommentLine && (token.type === TokenType.COMMENT.LINE || token.type === TokenType.COMMENT.LINE_DOC)) {
                    token.parentToken = tokens.length - 1;
                    onCommentLine = true;
                } else if (onText) {
                    token.type = TokenType.LITERAL.STRING;
                    if (quottesIndex.length > 0) {
                        token.parentToken = quottesIndex[quottesIndex.length - 1];
                    }
                } else if (onCommentBlock || onCommentLine) {
                    token.type = TokenType.COMMENT.CONTENT;
                    if (commentBlockIndex.length > 0) {
                        token.parentToken = commentBlockIndex[commentBlockIndex.length - 1];
                    }
                } else if (token.type === TokenType.BRACKET.CURLY_OPEN && lastToken) {
                    if (lastToken.parentToken !== undefined)
                        token.parentToken = lastToken.parentToken;
                    else
                        token.parentToken = tokens.length - 1;
                    if (lastToken.type === TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.ELSE || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.TRY || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.FINALLY || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.DO) {
                        if (lastToken.type === TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE && lastToken.parentToken !== undefined)
                            token.parentToken = lastToken.parentToken;
                        else
                            token.parentToken = tokens.length - 1
                    }
                    if (classDeclarationIndex.length > 0)
                        token.parentToken = classDeclarationIndex.pop();
                    bracketIndex.push(tokens.length);
                } else if (token.type === TokenType.BRACKET.CURLY_CLOSE) {
                    if (bracketIndex.length > 0) {
                        let index = bracketIndex.pop();
                        if (tokens[index].parentToken)
                            token.parentToken = tokens[index].parentToken;
                        else
                            token.parentToken = index;
                        token.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                    }
                    if (enumDeclarationIndex.length > 0)
                        enumDeclarationIndex.pop();
                } else if (token.type === TokenType.BRACKET.SQUARE_OPEN) {
                    sqBracketIndex.push(tokens.length);
                } else if (token.type === TokenType.BRACKET.SQUARE_CLOSE) {
                    if (sqBracketIndex.length > 0) {
                        let index = sqBracketIndex.pop();
                        token.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                    }
                } else if (token.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_OPEN) {
                    if (lastToken && lastToken.type === TokenType.DECLARATION.ENTITY.VARIABLE) {
                        tokens[tokens.length - 1].type = TokenType.DECLARATION.ENTITY.FUNCTION;
                        token.type = TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                    } else if (lastToken && lastToken.type === TokenType.ENTITY.VARIABLE) {
                        tokens[tokens.length - 1].type = TokenType.ENTITY.FUNCTION;
                        token.type = TokenType.BRACKET.PARENTHESIS_PARAM_OPEN;
                    } else if (lastToken && lastToken.type === TokenType.DECLARATION.ENTITY.FUNCTION) {
                        token.type = TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                    } else if (lastToken && lastToken.type === TokenType.KEYWORD.DECLARATION.FUNCTION) {
                        token.type = TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                    } else if (lastToken && (lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.IF || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.ELSE_IF || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.CATCH || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.WHILE || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.FOR)) {
                        token.type = TokenType.BRACKET.PARENTHESIS_GUARD_OPEN;
                    }
                    token.parentToken = tokens.length - 1;
                    parentIndex.push(tokens.length);
                } else if (token.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_CLOSE) {
                    if (parentIndex.length > 0) {
                        let index = parentIndex.pop();
                        if (tokens[index]) {
                            if (tokens[index].type === TokenType.BRACKET.PARENTHESIS_PARAM_OPEN) {
                                token.type = TokenType.BRACKET.PARENTHESIS_PARAM_CLOSE;
                            } else if (tokens[index].type === TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN) {
                                token.type = TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE;
                            } else if (tokens[index].type === TokenType.BRACKET.PARENTHESIS_GUARD_OPEN) {
                                token.type = TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE;
                            }
                            token.parentToken = tokens[index].parentToken;
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (token.type === TokenType.IDENTIFIER) {
                    if (reservedKeywords[token.text]) {
                        token.type = reservedKeywords[token.text];
                        classDeclarationIndex.push(tokens.length);
                    } else if (lastToken && lastToken.type === TokenType.KEYWORD.DECLARATION.CLASS) {
                        token.type = TokenType.DECLARATION.ENTITY.CLASS;
                        classDeclarationIndex.push(tokens.length);
                    } else if (lastToken && lastToken.type === TokenType.KEYWORD.DECLARATION.ENUM) {
                        token.type = TokenType.DECLARATION.ENTITY.ENUM;
                        classDeclarationIndex.push(tokens.length);
                        enumDeclarationIndex.push(tokens.length);
                    } else if (lastToken && lastToken.type === TokenType.KEYWORD.DECLARATION.INTERFACE) {
                        token.type = TokenType.DECLARATION.ENTITY.INTERFACE;
                        classDeclarationIndex.push(tokens.length);
                    } else if (lastToken && lastToken.type === TokenType.KEYWORD.DECLARATION.VARIABLE) {
                        token.type = TokenType.DECLARATION.ENTITY.VARIABLE;
                    } else if (lastToken && lastToken.type === TokenType.KEYWORD.DECLARATION.CONSTANT) {
                        token.type = TokenType.DECLARATION.ENTITY.CONSTANT;
                    } else if (lastToken && lastToken.type === TokenType.KEYWORD.DECLARATION.FUNCTION) {
                        token.type = TokenType.DECLARATION.ENTITY.FUNCTION;
                    } else {
                        token.type = TokenType.ENTITY.VARIABLE;
                    }
                }
                if (lastToken && (lastToken.type === TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE || lastToken.type === TokenType.KEYWORD.FLOW_CONTROL.ELSE)) {
                    if (token.type !== TokenType.BRACKET.CURLY_OPEN && token.type !== TokenType.PUNCTUATION.SEMICOLON) {
                        let newToken = new Token(TokenType.BRACKET.CURLY_OPEN, '{', lastToken.range.start.line, lastToken.range.start.character + 1);
                        newToken.isAux = true;
                        newToken.parentToken = (lastToken.parentToken) ? lastToken.parentToken : tokens.length - 1;
                        auxBracketIndex.push(tokens.length);
                        tokens.push(newToken);
                    }
                } else if (token.type === TokenType.BRACKET.CURLY_CLOSE && !token.isAux && auxBracketIndex.length > 0) {
                    for (const index of auxBracketIndex) {
                        let tokenAux = tokens[index];
                        let newToken = new Token(TokenType.BRACKET.CURLY_CLOSE, '}', 0, 0);
                        newToken.parentToken = (tokenAux.parentToken) ? tokenAux.parentToken : token.parentToken;
                        newToken.isAux = true;
                        newToken.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                        tokens.push(newToken);
                    }
                    auxBracketIndex = [];
                }
                tokens.push(token);
                if ((token.type === TokenType.PUNCTUATION.SEMICOLON) && auxBracketIndex.length > 0) {
                    let index = auxBracketIndex.pop();
                    let tokenAux = tokens[index];
                    let newToken = new Token(TokenType.BRACKET.CURLY_CLOSE, '}', token.range.start.line + 1, token.range.start.character - 4);
                    newToken.isAux = true;
                    newToken.parentToken = tokenAux.parentToken;
                    newToken.pairToken = index;
                    tokens[index].pairToken = tokens.length;
                    tokens.push(newToken);
                    let tokentmp = tokens[index - 1];
                    if (tokentmp.type === TokenType.KEYWORD.FLOW_CONTROL.ELSE && auxBracketIndex.length > 0) {
                        index = auxBracketIndex.pop();
                        tokenAux = tokens[index];
                        newToken = new Token(TokenType.BRACKET.CURLY_CLOSE, '}', 0, 0);
                        newToken.isAux = true;
                        newToken.parentToken = tokenAux.parentToken;
                        newToken.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                        tokens.push(newToken);
                    }
                }
            }
        }
        return tokens;
    }
}
module.exports = JSTokenizer;