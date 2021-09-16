
const { CoreUtils, FileSystem, Types, Exceptions, Values } = require('@ah/core');
const TokenType = require('./tokenTypes');
const Lexer = require('./tokenizer');
const LangUtils = require('../utils/languageUtils');
const StrUtils = CoreUtils.StrUtils;
const FileReader = FileSystem.FileReader;
const FileChecker = FileSystem.FileChecker;
const PathUtils = FileSystem.PathUtils;
const AuraComponent = Types.AuraComponent;
const AuraApplication = Types.AuraApplication;
const AuraEvent = Types.AuraEvent;
const AuraDependency = Types.AuraDependency;
const AuraHandler = Types.AuraHandler;
const AuraAttribute = Types.AuraAttribute;
const AuraRegisterEvent = Types.AuraRegisterEvent;
const SOQLQuery = Types.SOQLQuery;
const SOQLField = Types.SOQLField;
const PositionData = Types.PositionData;
const Token = Types.Token;
const Utils = CoreUtils.Utils;
const Validator = CoreUtils.Validator;
const InvalidFilePathException = Exceptions.InvalidFilePathException;

class AuraParser {

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
        this.onlyTagData = false;
    }

    getOnlyTagData(onlyTagData) {
        this.onlyTagData = (onlyTagData !== undefined && Utils.isBoolean(onlyTagData)) ? onlyTagData : false;
        return this;
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
            if (!FileChecker.isAuraFile(this.filePath))
                throw new InvalidFilePathException('Wrong file to parse. You must to select an Aura file (Component, App or Event)');
            this.tokens = Lexer.tokenize(this.content);
            this.tokensLength = this.tokens.length;
        } else if (this.content && (!this.tokens || this.tokens.length === 0)) {
            this.tokens = Lexer.tokenize(this.content);
            this.tokensLength = this.tokens.length;
        }
        let node;
        let positionData;
        for (let index = 0; index < this.tokensLength; index++) {
            const lastToken = LangUtils.getLastToken(this.tokens, index);
            const token = new Token(this.tokens[index]);
            if (lastToken) {
                if ((lastToken.type === TokenType.BRACKET.START_TAG_OPEN || lastToken.type === TokenType.BRACKET.TAG_EMPTY_OPEN) && token.type === TokenType.ENTITY.TAG.NAME) {
                    if (this.cursorPosition && node && !positionData) {
                        if (LangUtils.isOnPosition(token, this.cursorPosition)) {
                            const startIndex = this.cursorPosition.character - token.range.start.character;
                            const startPart = token.text.substring(0, startIndex + 1);
                            const endPart = token.text.substring(startIndex + 1);
                            positionData = new PositionData(startPart, endPart, node.nodeType, undefined, 'Aura');
                            positionData.onText = token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_START || token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_END || token.type === TokenType.LITERAL.STRING;
                        }
                    }
                    const result = getTagData(this.tokens, index, this.cursorPosition);
                    if (result.positionData && !positionData) {
                        positionData = result.positionData;
                        positionData.nodeType = node.nodeType;
                        delete result.positionData;
                        positionData.tagData = result.tagData;
                    }
                    const tagData = result.tagData;
                    index = result.index;
                    if (Utils.isNull(node)) {
                        if (token.textToLower === 'aura:component') {
                            node = new AuraComponent(token.text, token);
                            node.fileName = this.fileName;
                            node.abstract = !Utils.isNull(tagData.attributes['abstract']) ? tagData.attributes['abstract'] : false;
                            node.controller = !Utils.isNull(tagData.attributes['controller']) ? tagData.attributes['controller'] : undefined;
                            node.access = !Utils.isNull(tagData.attributes['access']) ? tagData.attributes['access'] : undefined;
                            node.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'] : undefined;
                            node.extends = !Utils.isNull(tagData.attributes['extends']) ? tagData.attributes['extends'] : undefined;
                            node.extensible = !Utils.isNull(tagData.attributes['extensible']) ? tagData.attributes['extensible'] : undefined;
                            node.isTemplate = !Utils.isNull(tagData.attributes['isTemplate']) ? tagData.attributes['isTemplate'] : undefined;
                            node.support = !Utils.isNull(tagData.attributes['support']) ? tagData.attributes['support'] : undefined;
                            node.template = !Utils.isNull(tagData.attributes['template']) ? tagData.attributes['template'] : undefined;
                            node.implements = !Utils.isNull(tagData.attributes['implements']) ? tagData.attributes['implements'] : undefined;
                            node.file = this.filePath;
                            if (node.implements) {
                                const implementValues = node.implements.value.text.split(',');
                                for (let i = 0; i < implementValues.length; i++) {
                                    const value = implementValues[i].trim();
                                    node.implementsValues.push(value);
                                }
                            }
                        } else if (token.textToLower === 'aura:event') {
                            node = new AuraEvent(token.text, token);
                            node.fileName = this.fileName;
                            node.access = !Utils.isNull(tagData.attributes['access']) ? tagData.attributes['access'] : undefined;
                            node.extends = !Utils.isNull(tagData.attributes['extends']) ? tagData.attributes['extends'] : undefined;
                            node.type = !Utils.isNull(tagData.attributes['type']) ? tagData.attributes['type'] : undefined;
                            node.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'] : undefined;
                            node.file = this.filePath;
                        } else if (token.textToLower === 'aura:application') {
                            node = new AuraApplication(token.text, token);
                            node.fileName = this.fileName;
                            node.controller = !Utils.isNull(tagData.attributes['controller']) ? tagData.attributes['controller'] : undefined;
                            node.abstract = !Utils.isNull(tagData.attributes['abstract']) ? tagData.attributes['abstract'] : undefined;
                            node.access = !Utils.isNull(tagData.attributes['access']) ? tagData.attributes['access'] : undefined;
                            node.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'] : undefined;
                            node.extends = !Utils.isNull(tagData.attributes['extends']) ? tagData.attributes['extends'] : undefined;
                            node.extensible = !Utils.isNull(tagData.attributes['extensible']) ? tagData.attributes['extensible'] : undefined;
                            node.support = !Utils.isNull(tagData.attributes['support']) ? tagData.attributes['support'] : undefined;
                            node.template = !Utils.isNull(tagData.attributes['template']) ? tagData.attributes['template'] : undefined;
                            node.implements = !Utils.isNull(tagData.attributes['implements']) ? tagData.attributes['implements'] : undefined;
                            node.file = this.filePath;
                            if (node.implements) {
                                const implementValues = node.implements.value.text.split(',');
                                for (let i = 0; i < implementValues.length; i++) {
                                    const value = implementValues[i].trim();
                                    node.implementsValues.push(value);
                                }
                            }
                        }
                    } else {
                        if (token.textToLower === 'aura:handler') {
                            const childNode = new AuraHandler(token.text, token);
                            childNode.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'] : undefined;
                            childNode.action = !Utils.isNull(tagData.attributes['action']) ? tagData.attributes['action'] : undefined;
                            childNode.event = !Utils.isNull(tagData.attributes['event']) ? tagData.attributes['event'] : undefined;
                            childNode.includeFacets = !Utils.isNull(tagData.attributes['includeFacets']) ? tagData.attributes['includeFacets'] : undefined;
                            childNode.phase = !Utils.isNull(tagData.attributes['phase']) ? tagData.attributes['phase'] : undefined;
                            childNode.name = !Utils.isNull(tagData.attributes['name']) ? tagData.attributes['name'] : undefined;
                            node.handlers.push(childNode);
                        } else if (token.textToLower === 'aura:registerevent') {
                            const childNode = new AuraRegisterEvent(token.text, token);
                            childNode.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'] : undefined;
                            childNode.type = !Utils.isNull(tagData.attributes['type']) ? tagData.attributes['type'] : undefined;
                            childNode.name = !Utils.isNull(tagData.attributes['name']) ? tagData.attributes['name'] : undefined;
                            node.events.push(childNode);
                        } else if (token.textToLower === 'aura:dependency') {
                            const childNode = new AuraDependency(token.text, token);
                            childNode.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'] : undefined;
                            childNode.resource = !Utils.isNull(tagData.attributes['resource']) ? tagData.attributes['resource'] : undefined;
                            childNode.type = !Utils.isNull(tagData.attributes['type']) ? tagData.attributes['type'] : undefined;
                            node.dependencies.push(childNode);
                        } else if (token.textToLower === 'aura:attribute') {
                            const childNode = new AuraAttribute(token.text, token);
                            childNode.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'] : undefined;
                            childNode.access = !Utils.isNull(tagData.attributes['access']) ? tagData.attributes['access'] : undefined;
                            childNode.default = !Utils.isNull(tagData.attributes['default']) ? tagData.attributes['default'] : undefined;
                            childNode.required = !Utils.isNull(tagData.attributes['required']) ? tagData.attributes['required'] : undefined;
                            childNode.type = !Utils.isNull(tagData.attributes['type']) ? tagData.attributes['type'] : undefined;
                            childNode.name = !Utils.isNull(tagData.attributes['name']) ? tagData.attributes['name'] : undefined;
                            node.attributes.push(childNode);
                        }
                    }
                }
            }
        }
        if (positionData)
            node.positionData = positionData;
        this.node = node;
        return node;
    }

}
module.exports = AuraParser;

function getTagData(tokens, index, position) {
    const tagData = {
        name: undefined,
        attributes: {}
    };
    const len = tokens.length;
    let attrName;
    let positionData;
    for (; index < len; index++) {
        const token = new Token(tokens[index]);
        const nextToken = LangUtils.getNextToken(tokens, index);
        const lastToken = LangUtils.getLastToken(tokens, index);
        if (position && !positionData) {
            if (LangUtils.isOnPosition(token, lastToken, nextToken, position)) {
                const startIndex = position.character - token.range.start.character;
                const startPart = token.text.substring(0, startIndex + 1);
                const endPart = token.text.substring(startIndex + 1);
                positionData = new PositionData(startPart, endPart, undefined, undefined, 'Aura');
                positionData.onText = token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_START || token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_END || token.type === TokenType.LITERAL.STRING;
            }
        }
        if (token.type === TokenType.BRACKET.TAG_EMPTY_CLOSE || token.type === TokenType.BRACKET.START_TAG_CLOSE || token.type === TokenType.BRACKET.TAG_EXMARK_CLOSE) {
            if (positionData && position.line > token.range.start.line) {
                positionData = undefined;
            } else if (positionData && position.line === token.range.start.line && position.character >= token.range.end.character) {
                positionData = undefined;
            }
            break;
        }
        if (token.type === TokenType.ENTITY.TAG.NAME) {
            tagData.fullName = token;
            if (StrUtils.contains(token.text, ':')) {
                const splits = token.text.split(':');
                tagData.namespace = splits[0];
                tagData.name = splits[1];
            } else {
                tagData.name = token.text;
            }
        } else if (token.type === TokenType.ENTITY.TAG.ATTRIBUTE) {
            attrName = token;
        } else if (token.type === TokenType.ENTITY.TAG.ATTRIBUTE_VALUE) {
            if (isAttributeQuery(token.textToLower)) {
                const data = processQuery(Lexer.tokenize(token.text), 0, position, token.range.start.character, token.range.start.line);
                if (data.positionData && !positionData) {
                    positionData = data.positionData;
                } else if (positionData) {
                    positionData.query = data.query;
                }
            }
            if (positionData && Utils.isNull(positionData.isOnAttributeValue) && position.character >= token.range.start.character && position.character <= token.range.end.character) {
                positionData.isOnAttributeValue = true;
                positionData.activeAttributeName = attrName.text;
                positionData.isParamEmpty = token.text.length === 0;
            }
            tagData.attributes[attrName.textToLower] = {
                name: attrName,
                value: token,
            };
        }
    }
    index--;
    return {
        tagData: tagData,
        positionData: positionData,
        index: index
    };
}

function isQuery(token, lastToken) {
    if (lastToken && lastToken.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_START && token.textToLower === 'select')
        return true;
    return false;
}

function isAttributeQuery(text) {
    return StrUtils.contains(text, 'select') && StrUtils.contains(text, 'from');
}

function processQuery(tokens, index, position, startColumn, startLine) {
    const len = tokens.length;
    let token = tokens[index];
    let lastToken = LangUtils.getLastToken(tokens, index);
    let positionData;
    const query = new SOQLQuery('query', 'Query', token);
    let onProjection = false;
    let field = '';
    let fieldStartToken;
    for (; index < len; index++) {
        lastToken = LangUtils.getLastToken(tokens, index);
        token = tokens[index];
        let nextToken = LangUtils.getNextToken(tokens, index);
        if (startColumn !== undefined) {
            token = Utils.clone(token);
            token.range.start.character = token.range.start.character + startColumn;
            token.range.end.character = token.range.end.character + startColumn;
            token.range.start.line = token.range.start.line + startLine;
            token.range.end.line = token.range.end.line + startLine;
            if (lastToken) {
                lastToken = Utils.clone(lastToken);
                lastToken.range.start.character = lastToken.range.start.character + startColumn;
                lastToken.range.end.character = lastToken.range.end.character + startColumn;
                lastToken.range.start.line = lastToken.range.start.line + startLine;
                lastToken.range.end.line = lastToken.range.end.line + startLine;
            }
            if (nextToken) {
                nextToken = Utils.clone(nextToken);
                nextToken.range.start.character = nextToken.range.start.character + startColumn;
                nextToken.range.end.character = nextToken.range.end.character + startColumn;
                nextToken.range.start.line = nextToken.range.start.line + startLine;
                nextToken.range.end.line = nextToken.range.end.line + startLine;
            }
        }
        if (position && query && !positionData) {
            if (LangUtils.isOnPosition(token, lastToken, nextToken, position)) {
                const startIndex = position.character - token.range.start.character;
                const startPart = token.text.substring(0, startIndex + 1);
                const endPart = token.text.substring(startIndex + 1);
                positionData = new PositionData(startPart, endPart, query.nodeType, query.id, 'Aura');
                positionData.onText = token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_START || token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_END || token.type === TokenType.LITERAL.STRING;
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
                const data = processQuery(tokens, index, position, (startColumn !== undefined) ? token.range.start.character : undefined, (startColumn !== undefined) ? token.range.start.line : undefined);
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