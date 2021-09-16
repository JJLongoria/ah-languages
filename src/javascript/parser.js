
const { CoreUtils, FileSystem, Types } = require('@ah/core');
const TokenType = require('./tokenTypes');
const Lexer = require('./tokenizer');
const LangUtils = require('../utils/languageUtils');
const { StrUtils } = require('@ah/core').CoreUtils;
const { InvalidFilePathException } = require('@ah/core').Exceptions;
const FileReader = FileSystem.FileReader;
const FileChecker = FileSystem.FileChecker;
const PathUtils = FileSystem.PathUtils;
const Token = Types.Token;
const Validator = CoreUtils.Validator;
const AuraJSFunction = Types.AuraJSFunction;
const AuraJSComment = Types.AuraJSComment;
const AuraJSCommentBlock = Types.AuraJSCommentBlock;
const PositionData = Types.PositionData;
const Utils = CoreUtils.Utils;

class JSParser {

    constructor(filePathOrTokens, fileName) {
        if (Utils.isArray(filePathOrTokens)) {
            this.tokens = filePathOrTokens;
            this.tokensLength = this.tokens.length;
            this.fileName = fileName;
        } else {
            this.tokens = [];
            this.tokensLength = 0;
            this.filePath = filePathOrTokens;
            this.fileName = this.fileName || (this.filePath ? PathUtils.removeFileExtension(PathUtils.getBasename(this.filePath)) : undefined);
        }
        this.content = undefined;
        this.cursorPosition = undefined;
        this.node = undefined;
    }

    setTokens(tokens) {
        this.tokens = tokens;
        this.tokensLength = this.tokens.length;
        return this;
    }

    setFilePath(filePath) {
        this.filePath = filePath;
        return this;
    }

    setFileName(fileName) {
        this.fileName = fileName;
        return this;
    }

    setContent(content) {
        this.content = content;
        return this;
    }

    setCursorPosition(position) {
        this.cursorPosition = position;
        return this;
    }

    parse() {
        if (this.node)
            return this.node;
        if (this.filePath && !this.content && (!this.tokens || this.tokens.length === 0)) {
            this.filePath = Validator.validateFilePath(this.filePath);
            this.content = FileReader.readFileSync(this.filePath);
            if (!FileChecker.isJavaScript(this.filePath))
                throw new InvalidFilePathException(this.filePath, this.fileName);
            this.tokens = Lexer.tokenize(this.content);
            this.tokensLength = this.tokens.length;
        } else if (this.content && (!this.tokens || this.tokens.length === 0)) {
            this.tokens = Lexer.tokenize(this.content);
            this.tokensLength = this.tokens.length;
        }
        const methods = [];
        let bracketIndent = 0;
        let parenthesisIndent = 0;
        let comment;
        let positionData;
        let strQueryStartIndex = -1;
        let strQueryEndIndex = -1;
        let strQueryFrom = false;
        this.node = {
            name: this.fileName,
            methods: [],
        }
        for (let index = 0; index < this.tokensLength; index++) {
            const lastToken = LangUtils.getLastToken(this.tokens, index);
            const token = new Token(this.tokens[index]);
            const nextToken = LangUtils.getNextToken(this.tokens, index);
            if (this.cursorPosition && this.node && !positionData) {
                if (LangUtils.isOnPosition(token, this.cursorPosition)) {
                    const startIndex = this.cursorPosition.character - token.range.start.character;
                    const startPart = token.text.substring(0, startIndex + 1);
                    const endPart = token.text.substring(startIndex + 1);
                    positionData = new PositionData(startPart, endPart, this.node.nodeType, undefined, 'JS');
                    positionData.onText = token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_START || token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_END || token.type === TokenType.LITERAL.STRING;
                    if (strQueryStartIndex !== -1 && strQueryEndIndex !== -1 && strQueryFrom) {
                        positionData.strQueryStartIndex = strQueryStartIndex;
                        positionData.strQueryEndIndex = strQueryEndIndex;
                    }
                }
                strQueryStartIndex = -1;
                strQueryEndIndex = -1;
            }
            if (openBracket(token)) {
                bracketIndent++;
            } else if (closeBracket(token)) {
                bracketIndent--;
            } else if (openParenthesis(token)) {
                parenthesisIndent++;
            } else if (closeParenthesis(token)) {
                parenthesisIndent--;
            } else if (isCommentLine(token)) {
                const newNode = new AuraJSComment();
                index = processCommentLine(newNode, this.tokens, index);
                comment = newNode;
            } else if (openCommentBlock(token)) {
                const newNode = new AuraJSCommentBlock();
                index = processCommentBlock(newNode, this.tokens, index);
                comment = newNode;
            } else if (isQuery(token, lastToken)) {
                const data = processQuery(this.tokens, index, this.cursorPosition, node);
                index = data.index;
                if (data.positionData && !positionData) {
                    positionData = data.positionData;
                }
            } else if (bracketIndent === 1 && parenthesisIndent === 1) {
                if (isFunction(lastToken, token, nextToken)) {
                    const newNode = new AuraJSFunction(lastToken.text, lastToken, comment);
                    index = processFunction(newNode, this.tokens, index);
                    if (comment) {
                        comment = undefined;
                    }
                    methods.push(newNode);
                }
            }
        }
        this.node.methods = methods;
        if (positionData)
            this.node.positionData = positionData;
        return this.node;
    }
}
module.exports = JSParser;

function processFunction(newNode, tokens, index) {
    const len = tokens.length;

    let varNames = [];
    for (; index < len; index++) {
        const token = new Token(tokens[index]);
        if (token.type === TokenType.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE)
            break;
        if (token.type === TokenType.ENTITY.VARIABLE) {
            varNames.push(token.text);
            newNode.params.push(token);
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

function isQuery(token, lastToken) {
    if (lastToken && (token.type === TokenType.PUNCTUATION.QUOTTES_START || token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_START) && token.textToLower === 'select')
        return true;
    return false;
}

function processQuery(tokens, index, position, node, startColumn) {
    const len = tokens.length;
    let token = tokens[index];
    let lastToken = LangUtils.getLastToken(tokens, index);
    let isDynamic = (lastToken && lastToken.type === TokenType.PUNCTUATION.QUOTTES_START && token.textToLower === 'select');
    let nodeId;
    let nodeName;
    let positionData;
    if (node.type === AuraNodeTypes.SOQL) {
        nodeId = node.id + '.subquery.' + node.projection.length;
        nodeName = 'subquery.' + node.queries.length;
    } else {
        nodeId = node.id + '.query.' + node.queries.length;
        nodeName = 'query.' + node.queries.length;
    }
    const query = new SOQLQuery(nodeId, nodeName, (isDynamic) ? lastToken : token);
    if (!isDynamic)
        index++;
    let onProjection = false;
    let field = '';
    let fieldStartToken;
    for (; index < len; index++) {
        lastToken = LangUtils.getLastToken(tokens, index);
        token = tokens[index];
        const nextToken = LangUtils.getNextToken(tokens, index);
        if (position && query && !positionData) {
            if (LangUtils.isOnPosition(token, lastToken, nextToken, position)) {
                const startIndex = position.character - token.range.start.character;
                const startPart = token.text.substring(0, startIndex + 1);
                const endPart = token.text.substring(startIndex + 1);
                positionData = new PositionData(startPart, endPart, query.nodeType, query.id, 'JS');
                positionData.onText = token.type === TokenType.PUNCTUATION.QUOTTES_START || token.type === TokenType.PUNCTUATION.QUOTTES_END || token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_START || token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_END || token.type === TokenType.LITERAL.STRING;
            }
        }
        if (token.textToLower === 'from') {
            if (field) {
                query.projection.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                field = '';
                fieldStartToken = undefined;
            }
            onProjection = false;
            query.from = nextToken;
        } else if (token.textToLower === 'select') {
            onProjection = true;
        } else if (token.type === TokenType.PUNCTUATION.QUOTTES_END) {
            query.endToken = token;
            break;
        } else if (onProjection) {
            if (token.textToLower === ',') {
                query.projection.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                field = '';
                fieldStartToken = undefined;
            } else if (isQuery(token, lastToken)) {
                const data = processQuery(tokens, index, position, query);
                index = data.index;
                query.projection.push(data.query);
                if (data.positionData && !positionData) {
                    positionData = data.positionData;
                }
            } else {
                field += token.text;
                if (!fieldStartToken)
                    fieldStartToken = token;
            }
        }
    }
    if (positionData)
        positionData.query = query;
    return {
        query: query,
        positionData: positionData,
        index: index
    };
}