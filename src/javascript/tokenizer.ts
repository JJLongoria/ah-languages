import { JSTokenTypes, CoreUtils, FileReader, Token } from "@aurahelper/core";

const StrUtils = CoreUtils.StrUtils;
const Utils = CoreUtils.Utils;
const Validator = CoreUtils.Validator;

const symbolTokens: { [key: string]: string } = {
    ">>>=": JSTokenTypes.OPERATOR.BITWISE.UNSIGNED_RIGHT_ASSIGN,
    ">>=": JSTokenTypes.OPERATOR.BITWISE.SIGNED_RIGTH_ASSIGN,
    "<<=": JSTokenTypes.OPERATOR.BITWISE.LEFT_ASSIGN,
    ">>>": JSTokenTypes.OPERATOR.BITWISE.UNSIGNED_RIGHT,
    "!==": JSTokenTypes.OPERATOR.LOGICAL.INEQUALITY_EXACT,
    "===": JSTokenTypes.OPERATOR.LOGICAL.EQUALITY_EXACT,
    ">>": JSTokenTypes.OPERATOR.BITWISE.SIGNED_RIGHT,
    "<<": JSTokenTypes.OPERATOR.BITWISE.SIGNED_LEFT,
    "^=": JSTokenTypes.OPERATOR.BITWISE.EXCLUSIVE_OR_ASSIGN,
    "--": JSTokenTypes.OPERATOR.ARITHMETIC.DECREMENT,
    "++": JSTokenTypes.OPERATOR.ARITHMETIC.INCREMENT,
    "!=": JSTokenTypes.OPERATOR.LOGICAL.INEQUALITY,
    "==": JSTokenTypes.OPERATOR.LOGICAL.EQUALITY,
    "||": JSTokenTypes.OPERATOR.LOGICAL.OR,
    "|=": JSTokenTypes.OPERATOR.LOGICAL.OR_ASSIGN,
    "&&": JSTokenTypes.OPERATOR.LOGICAL.AND,
    "&=": JSTokenTypes.OPERATOR.LOGICAL.AND_ASSIGN,
    ">=": JSTokenTypes.OPERATOR.LOGICAL.GREATER_THAN_EQUALS,
    "<=": JSTokenTypes.OPERATOR.LOGICAL.LESS_THAN_EQUALS,
    "+=": JSTokenTypes.OPERATOR.ARITHMETIC.ADD_ASSIGN,
    "-=": JSTokenTypes.OPERATOR.ARITHMETIC.SUBSTRACT_ASSIGN,
    "*=": JSTokenTypes.OPERATOR.ARITHMETIC.MULTIPLY_ASSIGN,
    "/=": JSTokenTypes.OPERATOR.ARITHMETIC.DIVIDE_ASSIGN,
    "^": JSTokenTypes.OPERATOR.BITWISE.EXCLUSIVE_OR,
    "|": JSTokenTypes.OPERATOR.BITWISE.OR,
    "&": JSTokenTypes.OPERATOR.BITWISE.AND,
    "+": JSTokenTypes.OPERATOR.ARITHMETIC.ADD,
    "-": JSTokenTypes.OPERATOR.ARITHMETIC.SUBSTRACT,
    "*": JSTokenTypes.OPERATOR.ARITHMETIC.MULTIPLY,
    "/": JSTokenTypes.OPERATOR.ARITHMETIC.DIVIDE,
    "!": JSTokenTypes.OPERATOR.LOGICAL.NOT,
    "<": JSTokenTypes.OPERATOR.LOGICAL.LESS_THAN,
    ">": JSTokenTypes.OPERATOR.LOGICAL.GREATER_THAN,
    "=": JSTokenTypes.OPERATOR.ASSIGN.ASSIGN,
    "/**": JSTokenTypes.COMMENT.BLOCK_START,
    "/*": JSTokenTypes.COMMENT.BLOCK_START,
    "*/": JSTokenTypes.COMMENT.BLOCK_END,
    "//": JSTokenTypes.COMMENT.LINE,
    "///": JSTokenTypes.COMMENT.LINE_DOC,
    "(": JSTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN,
    ")": JSTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_CLOSE,
    "{": JSTokenTypes.BRACKET.CURLY_OPEN,
    "}": JSTokenTypes.BRACKET.CURLY_CLOSE,
    "[": JSTokenTypes.BRACKET.SQUARE_OPEN,
    "]": JSTokenTypes.BRACKET.SQUARE_CLOSE,
    ",": JSTokenTypes.PUNCTUATION.COMMA,
    ";": JSTokenTypes.PUNCTUATION.SEMICOLON,
    ":": JSTokenTypes.PUNCTUATION.COLON,
    ".": JSTokenTypes.PUNCTUATION.OBJECT_ACCESSOR,
    "?.": JSTokenTypes.PUNCTUATION.SAFE_OBJECT_ACCESSOR,
    "\\": JSTokenTypes.PUNCTUATION.BACKSLASH,
    "'": JSTokenTypes.PUNCTUATION.QUOTTES,
    '"': JSTokenTypes.PUNCTUATION.DOUBLE_QUOTTES,
    "@": JSTokenTypes.PUNCTUATION.AT,
    "?": JSTokenTypes.PUNCTUATION.EXMARK,
}

const reservedKeywords: { [key: string]: string } = {
    "abstract": JSTokenTypes.KEYWORD.FOR_FUTURE,
    "arguments": JSTokenTypes.KEYWORD.OTHER,
    "await": JSTokenTypes.KEYWORD.OTHER,
    "boolean": JSTokenTypes.KEYWORD.FOR_FUTURE,
    "break": JSTokenTypes.KEYWORD.FLOW_CONTROL.BREAK,
    "byte": JSTokenTypes.KEYWORD.FOR_FUTURE,
    "case": JSTokenTypes.KEYWORD.FLOW_CONTROL.SWITCH_CASE,
    "catch": JSTokenTypes.KEYWORD.FLOW_CONTROL.CATCH,
    "char": JSTokenTypes.KEYWORD.FOR_FUTURE,
    "class": JSTokenTypes.KEYWORD.DECLARATION.CLASS,
    "const": JSTokenTypes.KEYWORD.DECLARATION.CONSTANT,
    "continue": JSTokenTypes.KEYWORD.FLOW_CONTROL.CONTINUE,
    "constructor": JSTokenTypes.KEYWORD.DECLARATION.CONSTRUCTOR,
    "debugger": JSTokenTypes.KEYWORD.OTHER,
    "default": JSTokenTypes.KEYWORD.OTHER,
    "double": JSTokenTypes.KEYWORD.FOR_FUTURE,
    "do": JSTokenTypes.KEYWORD.FLOW_CONTROL.DO,
    "else": JSTokenTypes.KEYWORD.FLOW_CONTROL.ELSE,
    "enum": JSTokenTypes.KEYWORD.DECLARATION.ENUM,
    "eval": JSTokenTypes.KEYWORD.OTHER,
    "export": JSTokenTypes.KEYWORD.OTHER,
    "extends": JSTokenTypes.KEYWORD.DECLARATION.EXTENDS,
    "false": JSTokenTypes.LITERAL.BOOLEAN,
    "final": JSTokenTypes.KEYWORD.MODIFIER.FINAL,
    "finally": JSTokenTypes.KEYWORD.FLOW_CONTROL.FINALLY,
    "float": JSTokenTypes.KEYWORD.FOR_FUTURE,
    "for": JSTokenTypes.KEYWORD.FLOW_CONTROL.FOR,
    "function": JSTokenTypes.KEYWORD.DECLARATION.FUNCTION,
    "goto": JSTokenTypes.KEYWORD.FOR_FUTURE,
    "if": JSTokenTypes.KEYWORD.FLOW_CONTROL.IF,
    "implements": JSTokenTypes.KEYWORD.DECLARATION.IMPLEMENTS,
    "import": JSTokenTypes.KEYWORD.OTHER,
    "Infinity": JSTokenTypes.LITERAL.INFINITY,
    "in": JSTokenTypes.KEYWORD.OTHER,
    "instanceof": JSTokenTypes.OPERATOR.LOGICAL.INSTANCE_OF,
    "int": JSTokenTypes.KEYWORD.FOR_FUTURE,
    "interface": JSTokenTypes.KEYWORD.DECLARATION.INTERFACE,
    "let": JSTokenTypes.KEYWORD.DECLARATION.VARIABLE,
    "long": JSTokenTypes.KEYWORD.FOR_FUTURE,
    "NaN": JSTokenTypes.LITERAL.NAN,
    "native": JSTokenTypes.KEYWORD.OTHER,
    "new": JSTokenTypes.KEYWORD.OBJECT.NEW,
    "null": JSTokenTypes.LITERAL.NULL,
    "of": JSTokenTypes.KEYWORD.OTHER,
    "package": JSTokenTypes.KEYWORD.OTHER,
    "private": JSTokenTypes.KEYWORD.MODIFIER.ACCESS,
    "protected": JSTokenTypes.KEYWORD.MODIFIER.ACCESS,
    "public": JSTokenTypes.KEYWORD.MODIFIER.ACCESS,
    "return": JSTokenTypes.KEYWORD.FLOW_CONTROL.RETURN,
    "short": JSTokenTypes.KEYWORD.FOR_FUTURE,
    "static": JSTokenTypes.KEYWORD.MODIFIER.STATIC,
    "super": JSTokenTypes.KEYWORD.OBJECT.SUPER,
    "switch": JSTokenTypes.KEYWORD.FLOW_CONTROL.SWITCH,
    "synchronized": JSTokenTypes.KEYWORD.FOR_FUTURE,
    "this": JSTokenTypes.KEYWORD.OBJECT.THIS,
    "throw": JSTokenTypes.KEYWORD.FLOW_CONTROL.THROW,
    "throws": JSTokenTypes.KEYWORD.FLOW_CONTROL.THROW,
    "transient": JSTokenTypes.KEYWORD.MODIFIER.TRANSIENT,
    "true": JSTokenTypes.LITERAL.BOOLEAN,
    "try": JSTokenTypes.KEYWORD.FLOW_CONTROL.TRY,
    "typeof": JSTokenTypes.KEYWORD.OBJECT.TYPEOF,
    "undefined": JSTokenTypes.LITERAL.UNDEFINED,
    "var": JSTokenTypes.KEYWORD.DECLARATION.VARIABLE,
    "void": JSTokenTypes.DATATYPE.VOID,
    "volatile": JSTokenTypes.KEYWORD.OTHER,
    "while": JSTokenTypes.KEYWORD.FLOW_CONTROL.WHILE,
    "with": JSTokenTypes.KEYWORD.OTHER,
    "yield": JSTokenTypes.KEYWORD.OTHER,
    'Array': JSTokenTypes.DATATYPE.ARRAY,
    'Date': JSTokenTypes.DATATYPE.DATE,
    'String': JSTokenTypes.DATATYPE.STRING,
    'Math': JSTokenTypes.DATATYPE.MATH,
    'Number': JSTokenTypes.DATATYPE.NUMBER,
    'Object': JSTokenTypes.DATATYPE.OBJECT,
    'prototype': JSTokenTypes.KEYWORD.OBJECT.PROTOTYPE,
};

const predefinedObjects: string[] = [
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

export class JSTokenizer {

    /**
     * Method to Tokenize Aura Javscript file
     * @param {string} filePathOrContent File path or file content to tokenize
     * @param {number} [tabSize] Tab size 
     * @returns 
     */
    static tokenize(filePathOrContent: string, tabSize?: number) {
        if (!tabSize) {
            tabSize = 4;
        }
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
        const tokens: Token[] = [];
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
                    token = new Token(JSTokenTypes.LITERAL.DATETIME, numContent, lineNumber, column);
                else if (numContent.indexOf('-') !== -1)
                    token = new Token(JSTokenTypes.LITERAL.DATE, numContent, lineNumber, column);
                else if (numContent.indexOf(':') !== -1)
                    token = new Token(JSTokenTypes.LITERAL.TIME, numContent, lineNumber, column);
                else if (numContent.indexOf('.') !== -1) {
                    token = new Token(JSTokenTypes.LITERAL.DOUBLE, numContent, lineNumber, column);
                }
                else {
                    token = new Token(JSTokenTypes.LITERAL.INTEGER, numContent, lineNumber, column);
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
                token = new Token(JSTokenTypes.IDENTIFIER, idContent, lineNumber, column);
                column += idContent.length;
            } else if (char === "\n") {
                if (onCommentLine)
                    onCommentLine = false;
                lineNumber++;
                column = 0;
            } else if (char !== "\t" && char !== " " && char.trim().length != 0) {
                token = new Token(JSTokenTypes.UNKNOWN, char, lineNumber, column);
                column++;
            } else if (char === "\t") {
                column += tabSize;
            } else {
                column++;
            }
            if (token !== undefined) {
                if (!onText && !onCommentBlock && !onCommentLine && token.type === JSTokenTypes.PUNCTUATION.QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    token.type = JSTokenTypes.PUNCTUATION.QUOTTES_START;
                    onText = true;
                    token.parentToken = tokens.length - 1;
                    quottesIndex.push(tokens.length);
                } else if (onText && token.type === JSTokenTypes.PUNCTUATION.QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    token.type = JSTokenTypes.PUNCTUATION.QUOTTES_END;
                    onText = false;
                    if (quottesIndex.length > 0) {
                        const index = quottesIndex.pop();
                        if (index !== undefined) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                            token.parentToken = tokens[index].parentToken;
                        }
                    }
                } else if (!onText && !onCommentBlock && !onCommentLine && token.type === JSTokenTypes.PUNCTUATION.DOUBLE_QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    token.type = JSTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_START;
                    onText = true;
                    token.parentToken = tokens.length - 1;
                    quottesIndex.push(tokens.length);
                } else if (onText && token.type === JSTokenTypes.PUNCTUATION.DOUBLE_QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    token.type = JSTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_END;
                    onText = false;
                    if (quottesIndex.length > 0) {
                        const index = quottesIndex.pop();
                        if (index !== undefined) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                            token.parentToken = tokens[index].parentToken;
                        }
                    }
                } else if (!onText && !onCommentBlock && !onCommentLine && token.type === JSTokenTypes.COMMENT.BLOCK_START) {
                    onCommentBlock = true;
                    token.parentToken = tokens.length - 1;
                    commentBlockIndex.push(tokens.length);
                } else if (onCommentBlock && token.type === JSTokenTypes.COMMENT.BLOCK_END) {
                    onCommentBlock = false;
                    if (commentBlockIndex.length > 0) {
                        const index = commentBlockIndex.pop();
                        if (index !== undefined) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                            token.parentToken = tokens[index].parentToken;
                        }
                    }
                } else if (!onText && !onCommentBlock && !onCommentLine && (token.type === JSTokenTypes.COMMENT.LINE || token.type === JSTokenTypes.COMMENT.LINE_DOC)) {
                    token.parentToken = tokens.length - 1;
                    onCommentLine = true;
                } else if (onText) {
                    token.type = JSTokenTypes.LITERAL.STRING;
                    if (quottesIndex.length > 0) {
                        token.parentToken = quottesIndex[quottesIndex.length - 1];
                    }
                } else if (onCommentBlock || onCommentLine) {
                    token.type = JSTokenTypes.COMMENT.CONTENT;
                    if (commentBlockIndex.length > 0) {
                        token.parentToken = commentBlockIndex[commentBlockIndex.length - 1];
                    }
                } else if (token.type === JSTokenTypes.BRACKET.CURLY_OPEN && lastToken) {
                    if (lastToken.parentToken !== undefined)
                        token.parentToken = lastToken.parentToken;
                    else
                        token.parentToken = tokens.length - 1;
                    if (lastToken.type === JSTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE || lastToken.type === JSTokenTypes.KEYWORD.FLOW_CONTROL.ELSE || lastToken.type === JSTokenTypes.KEYWORD.FLOW_CONTROL.TRY || lastToken.type === JSTokenTypes.KEYWORD.FLOW_CONTROL.FINALLY || lastToken.type === JSTokenTypes.KEYWORD.FLOW_CONTROL.DO) {
                        if (lastToken.type === JSTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE && lastToken.parentToken !== undefined)
                            token.parentToken = lastToken.parentToken;
                        else
                            token.parentToken = tokens.length - 1
                    }
                    if (classDeclarationIndex.length > 0)
                        token.parentToken = classDeclarationIndex.pop();
                    bracketIndex.push(tokens.length);
                } else if (token.type === JSTokenTypes.BRACKET.CURLY_CLOSE) {
                    if (bracketIndex.length > 0) {
                        let index = bracketIndex.pop();
                        if (index !== undefined) {
                            if (tokens[index].parentToken) {
                                token.parentToken = tokens[index].parentToken;
                            } else {
                                token.parentToken = index;
                            }
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                    if (enumDeclarationIndex.length > 0)
                        enumDeclarationIndex.pop();
                } else if (token.type === JSTokenTypes.BRACKET.SQUARE_OPEN) {
                    sqBracketIndex.push(tokens.length);
                } else if (token.type === JSTokenTypes.BRACKET.SQUARE_CLOSE) {
                    if (sqBracketIndex.length > 0) {
                        let index = sqBracketIndex.pop();
                        if (index !== undefined) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (token.type === JSTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN) {
                    if (lastToken && lastToken.type === JSTokenTypes.DECLARATION.ENTITY.VARIABLE) {
                        tokens[tokens.length - 1].type = JSTokenTypes.DECLARATION.ENTITY.FUNCTION;
                        token.type = JSTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                    } else if (lastToken && lastToken.type === JSTokenTypes.ENTITY.VARIABLE) {
                        tokens[tokens.length - 1].type = JSTokenTypes.ENTITY.FUNCTION;
                        token.type = JSTokenTypes.BRACKET.PARENTHESIS_PARAM_OPEN;
                    } else if (lastToken && lastToken.type === JSTokenTypes.DECLARATION.ENTITY.FUNCTION) {
                        token.type = JSTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                    } else if (lastToken && lastToken.type === JSTokenTypes.KEYWORD.DECLARATION.FUNCTION) {
                        token.type = JSTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                    } else if (lastToken && (lastToken.type === JSTokenTypes.KEYWORD.FLOW_CONTROL.IF || lastToken.type === JSTokenTypes.KEYWORD.FLOW_CONTROL.ELSE_IF || lastToken.type === JSTokenTypes.KEYWORD.FLOW_CONTROL.CATCH || lastToken.type === JSTokenTypes.KEYWORD.FLOW_CONTROL.WHILE || lastToken.type === JSTokenTypes.KEYWORD.FLOW_CONTROL.FOR)) {
                        token.type = JSTokenTypes.BRACKET.PARENTHESIS_GUARD_OPEN;
                    }
                    token.parentToken = tokens.length - 1;
                    parentIndex.push(tokens.length);
                } else if (token.type === JSTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_CLOSE) {
                    if (parentIndex.length > 0) {
                        let index = parentIndex.pop();
                        if (index !== undefined && tokens[index]) {
                            if (tokens[index].type === JSTokenTypes.BRACKET.PARENTHESIS_PARAM_OPEN) {
                                token.type = JSTokenTypes.BRACKET.PARENTHESIS_PARAM_CLOSE;
                            } else if (tokens[index].type === JSTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN) {
                                token.type = JSTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE;
                            } else if (tokens[index].type === JSTokenTypes.BRACKET.PARENTHESIS_GUARD_OPEN) {
                                token.type = JSTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE;
                            }
                            token.parentToken = tokens[index].parentToken;
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (token.type === JSTokenTypes.IDENTIFIER) {
                    if (reservedKeywords[token.text]) {
                        token.type = reservedKeywords[token.text];
                        classDeclarationIndex.push(tokens.length);
                    } else if (lastToken && lastToken.type === JSTokenTypes.KEYWORD.DECLARATION.CLASS) {
                        token.type = JSTokenTypes.DECLARATION.ENTITY.CLASS;
                        classDeclarationIndex.push(tokens.length);
                    } else if (lastToken && lastToken.type === JSTokenTypes.KEYWORD.DECLARATION.ENUM) {
                        token.type = JSTokenTypes.DECLARATION.ENTITY.ENUM;
                        classDeclarationIndex.push(tokens.length);
                        enumDeclarationIndex.push(tokens.length);
                    } else if (lastToken && lastToken.type === JSTokenTypes.KEYWORD.DECLARATION.INTERFACE) {
                        token.type = JSTokenTypes.DECLARATION.ENTITY.INTERFACE;
                        classDeclarationIndex.push(tokens.length);
                    } else if (lastToken && lastToken.type === JSTokenTypes.KEYWORD.DECLARATION.VARIABLE) {
                        token.type = JSTokenTypes.DECLARATION.ENTITY.VARIABLE;
                    } else if (lastToken && lastToken.type === JSTokenTypes.KEYWORD.DECLARATION.CONSTANT) {
                        token.type = JSTokenTypes.DECLARATION.ENTITY.CONSTANT;
                    } else if (lastToken && lastToken.type === JSTokenTypes.KEYWORD.DECLARATION.FUNCTION) {
                        token.type = JSTokenTypes.DECLARATION.ENTITY.FUNCTION;
                    } else {
                        token.type = JSTokenTypes.ENTITY.VARIABLE;
                    }
                }
                if (lastToken && (lastToken.type === JSTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE || lastToken.type === JSTokenTypes.KEYWORD.FLOW_CONTROL.ELSE)) {
                    if (token.type !== JSTokenTypes.BRACKET.CURLY_OPEN && token.type !== JSTokenTypes.PUNCTUATION.SEMICOLON) {
                        let newToken = new Token(JSTokenTypes.BRACKET.CURLY_OPEN, '{', lastToken.range.start.line, lastToken.range.start.character + 1);
                        newToken.isAux = true;
                        newToken.parentToken = (lastToken.parentToken) ? lastToken.parentToken : tokens.length - 1;
                        auxBracketIndex.push(tokens.length);
                        tokens.push(newToken);
                    }
                } else if (token.type === JSTokenTypes.BRACKET.CURLY_CLOSE && !token.isAux && auxBracketIndex.length > 0) {
                    for (const index of auxBracketIndex) {
                        let tokenAux = tokens[index];
                        let newToken = new Token(JSTokenTypes.BRACKET.CURLY_CLOSE, '}', 0, 0);
                        newToken.parentToken = (tokenAux.parentToken) ? tokenAux.parentToken : token.parentToken;
                        newToken.isAux = true;
                        newToken.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                        tokens.push(newToken);
                    }
                    auxBracketIndex = [];
                }
                tokens.push(token);
                if ((token.type === JSTokenTypes.PUNCTUATION.SEMICOLON) && auxBracketIndex.length > 0) {
                    let index = auxBracketIndex.pop();
                    if (index !== undefined) {
                        let tokenAux = tokens[index];
                        let newToken = new Token(JSTokenTypes.BRACKET.CURLY_CLOSE, '}', token.range.start.line + 1, token.range.start.character - 4);
                        newToken.isAux = true;
                        newToken.parentToken = tokenAux.parentToken;
                        newToken.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                        tokens.push(newToken);
                        let tokentmp = tokens[index - 1];
                        if (tokentmp.type === JSTokenTypes.KEYWORD.FLOW_CONTROL.ELSE && auxBracketIndex.length > 0) {
                            index = auxBracketIndex.pop();
                            if (index !== undefined) {
                                tokenAux = tokens[index];
                                newToken = new Token(JSTokenTypes.BRACKET.CURLY_CLOSE, '}', 0, 0);
                                newToken.isAux = true;
                                newToken.parentToken = tokenAux.parentToken;
                                newToken.pairToken = index;
                                tokens[index].pairToken = tokens.length;
                                tokens.push(newToken);
                            }
                        }
                    }
                }
            }
        }
        return tokens;
    }
}
module.exports = JSTokenizer;