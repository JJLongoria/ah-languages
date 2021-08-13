
const { CoreUtils, FileSystem, Types } = require('@ah/core');
const TokenType = require('./tokenTypes');
const Lexer = require('./lexer');
const LangUtils = require('../utils/languageUtils');
const FileReader = FileSystem.FileReader;
const FileChecker = FileSystem.FileChecker;
const PathUtils = FileSystem.PathUtils;
const Token = Types.Token;
const Validator = CoreUtils.Validator;
const AuraJSFunction = Types.AuraJSFunction;
const AuraJSComment = Types.AuraJSComment;
const AuraJSCommentBlock = Types.AuraJSCommentBlock;
const Utils = CoreUtils.Utils;

class Parser {

    static parse(pathContentOrTokens) {
        let tokens;
        if (Utils.isArray(pathContentOrTokens)) {
            tokens = pathContentOrTokens;
        } else if (Utils.isString(pathContentOrTokens)) {
            let content;
            if (PathUtils.isURI(pathContentOrTokens)) {
                pathContentOrTokens = Validator.validateFilePath(pathContentOrTokens);
                if (!FileChecker.isAuraHelperJS(pathContentOrTokens) && !FileChecker.isAuraControllerJS(pathContentOrTokens))
                    throw new Error('Wrong file to parse. You must to select an Aura Javascript file (Controller or Helper)');
                content = FileReader.readFileSync(pathContentOrTokens);
            } else {
                content = pathContentOrTokens;
            }
            tokens = Lexer.tokenize(content);
        } else {
            throw new Error('You must to select a file path, file content or file tokens');
        }
        const len = tokens.length;
        const methods = [];
        let bracketIndent = 0;
        let parenthesisIndent = 0;
        let comment;
        for (let index = 0; index < len; index++) {
            const lastToken = LangUtils.getLastToken(tokens, index);
            const token = new Token(tokens[index]);
            const nextToken = LangUtils.getNextToken(tokens, index);
            if (openBracket(token)) {
                bracketIndent++;
            } else if (closeBracket(token)) {
                bracketIndent--;
            } else if (openParenthesis(token)) {
                parenthesisIndent++;
            } else if (closeParenthesis(token)) {
                parenthesisIndent--;
            } else if (isCommentLine(token)) {
                const newNode = new AuraJSComment(token);
                index = processCommentLine(newNode, tokens, index);
                comment = newNode;
            } else if (openCommentBlock(token)) {
                const newNode = new AuraJSCommentBlock(token);
                index = processCommentBlock(newNode, tokens, index);
                comment = newNode;
            } else if (bracketIndent === 1 && parenthesisIndent === 1) {
                if (isFunction(lastToken, token, nextToken)) {
                    const newNode = new AuraJSFunction(lastToken.text, lastToken, comment);
                    index = processFunction(newNode, tokens, index);
                    if (comment) {
                        comment = undefined;
                    }
                    methods.push(newNode);
                }
            }
        }
        return methods;
    }

    static isPositionOnText(content, position) {
        const tokens = Lexer.tokenize(content);
        const len = tokens.length;
        for (let index = 0; index < len; index++) {
            let token = new Token(tokens[index]);
            if (token.range.start.isBeforeOrEqual(position) && token.range.end.isAfterOrEqual(position) && (token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_START || token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_END || token.type === TokenType.PUNCTUATION.QUOTTES_START || token.type === TokenType.PUNCTUATION.QUOTTES_END || token.type === TokenType.LITERAL.STRING))
                return true;

        }
        return false;
    }

    static getPositionRange(content, tokenText, ignoreCase) {
        if (ignoreCase)
            tokenText = tokenText.toLowerCase();
        const tokens = Lexer.tokenize(content);
        const len = tokens.length;
        for (let index = 0; index < len; index++) {
            let token = new Token(tokens[index]);
            const sameText = (ignoreCase) ? token.textToLower === tokenText : token.text === tokenText;
            if (sameText && token.range.start.isBeforeOrEqual(position) && token.range.end.isAfterOrEqual(position))
                return token.range;

        }
        return 0;
    }

    static getDataToPutApexParams(content) {
        const data = {
            startIndex: 0,
            endsWithSemicolon: true,
            completeBody: true
        };
        const tokens = Lexer.tokenize(content);
        const len = tokens.length;
        for (let index = 0; index < len; index++) {
            const token = new Token(tokens[index]);
            const lastToken = LangUtils.getLastToken(tokens, index);
            const nextToken = LangUtils.getNextToken(tokens, index);
            if (token.text === 'c' && nextToken && (nextToken.type === TokenType.PUNCTUATION.OBJECT_ACCESSOR || nextToken.type === TokenType.PUNCTUATION.SAFE_OBJECT_ACCESSOR)) {
                data.startIndex = token.range.start.character;
                if (lastToken && (lastToken.type === TokenType.PUNCTUATION.COMMA || lastToken.type === TokenType.OPERATOR.ASSIGN.ASSIGN)) {
                    data.completeBody = false;
                    if (lastToken.tokenType !== TokenType.OPERATOR.ASSIGN.ASSIGN)
                        data.endsWithSemicolon = false
                }
            }
        }
        return data;
    }
}
module.exports = Parser;

function processFunction(newNode, tokens, index) {
    const len = tokens.length;

    let varNames = [];
    for (; index < len; index++) {
        const token = new Token(tokens[index]);
        if (token.type === TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE)
            break;
        if (token.type === TokenType.ENTITY.VARIABLE) {
            varNames.push(token.text);
            newNode.variables.push(token);
        }
    }
    newNode.signature = newNode.name + '(' + varNames.join(', ') + ')';
    newNode.auraSignature = newNode.name + ' : function(' + varNames.join(', ') + ')';
    return index;
}

function openBracket(token) {
    return token && token.type === TokenType.BRACKET.CURLY_OPEN;
}

function closeBracket(token) {
    return token && token.type === TokenType.BRACKET.CURLY_CLOSE;
}

function openParenthesis(token) {
    return token && token.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_OPEN;
}

function closeParenthesis(token) {
    return token && token.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_CLOSE;
}

function openCommentBlock(token) {
    return token && token.type === TokenType.COMMENT.BLOCK_START;
}

function closeCommentBlock(token) {
    return token && token.type === TokenType.COMMENT.BLOCK_END;
}

function isCommentLine(token) {
    return token && (token.type === TokenType.COMMENT.LINE || token.type === TokenType.COMMENT.LINE_DOC);
}

function isFunction(lastToken, token, nextToken) {
    return token.type === TokenType.PUNCTUATION.COLON && lastToken.type === TokenType.ENTITY.VARIABLE && nextToken && nextToken.type === TokenType.KEYWORD.DECLARATION.FUNCTION;
}

function processCommentBlock(node, tokens, index) {
    const len = tokens.length;
    for (; index < len; index++) {
        const token = tokens[index];
        if (!closeCommentBlock(token)) {
            node.addToken(token);
        } else {
            node.addToken(token);
            break;
        }
    }
    return index;
}

function processCommentLine(node, tokens, index) {
    const len = tokens.length;
    for (; index < len; index++) {
        const token = tokens[index];
        if (token.type === TokenType.COMMENT.LINE || token.type === TokenType.COMMENT.LINE_DOC || token.type === TokenType.COMMENT.CONTENT) {
            node.addToken(token);
        } else {
            break;
        }
    }
    index--;
    return index;
}