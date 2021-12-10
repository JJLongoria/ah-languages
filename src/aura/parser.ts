import { AuraApplication, AuraAttribute, AuraComponent, AuraDependency, AuraEvent, AuraHandler, AuraRegisterEvent, AuraTag, AuraTagData, AuraTokenTypes, CoreUtils, FileChecker, FileReader, InvalidFilePathException, PathUtils, Position, PositionData, SOQLField, SOQLQuery, Token } from "@aurahelper/core";
import { LanguageUtils } from "../utils";
import { AuraTokenizer } from "./tokenizer";

const StrUtils = CoreUtils.StrUtils;
const Utils = CoreUtils.Utils;
const Validator = CoreUtils.Validator;

/**
 * Class to parse Aura XML files to extract data from files
 */
export class AuraParser {

    tokens: Token[];
    tokensLength: number;
    fileName?: string;
    filePath?: string;
    content?: string;
    cursorPosition?: Position;
    node?: AuraComponent | AuraEvent | AuraApplication;
    onlyTagData: boolean;
    _tabSize: number;

    /**
     * Create new Aura Parser instance to parse Aura XML files
     * @param {string | Token[]} [filePathOrTokens] 
     * @param {string} [fileName] 
     */
    constructor(filePathOrTokens?: string | Token[], fileName?: string) {
        if (typeof filePathOrTokens !== 'string') {
            this.tokens = filePathOrTokens || [];
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
        this._tabSize = 4;
    }

    /**
     * Method to get only the tag data from Cursor position
     * @param {boolean} onlyTagData True to get only tag data, false to pase the entire file
     * @returns {AuraParser} Returns the AuraParser instance
     */
    getOnlyTagData(onlyTagData: boolean): AuraParser {
        this.onlyTagData = (onlyTagData !== undefined && Utils.isBoolean(onlyTagData)) ? onlyTagData : false;
        return this;
    }

    /**
     * Method to set the file tokens to parse
     * @param {Token[]} tokens File tokens
     * @returns {AuraParser} Returns the AuraParser instance
     */
    setTokens(tokens: Token[]): AuraParser {
        this.tokens = tokens;
        this.tokensLength = this.tokens.length;
        return this;
    }

    /**
     * Method to set the file path
     * @param {string} filePath File path value
     * @returns {AuraParser} Returns the AuraParser instance
     */
    setFilePath(filePath: string): AuraParser {
        this.filePath = filePath;
        return this;
    }

    /**
     * Method to set the file name
     * @param {string} fileName File name value
     * @returns {AuraParser} Returns the AuraParser instance
     */
    setFileName(fileName: string): AuraParser {
        this.fileName = fileName;
        return this;
    }

    /**
     * Method to set the file content
     * @param {string} content File content value
     * @returns {AuraParser} Returns the AuraParser instance
     */
    setContent(content?: string): AuraParser {
        this.content = content;
        return this;
    }

    /**
     * Method to set the cursor position on file
     * @param {Position} position Position object
     * @returns {AuraParser} Returns the AuraParser instance
     */
    setCursorPosition(position?: Position): AuraParser {
        this.cursorPosition = position;
        return this;
    }

    /**
     * Method to set the file tab size
     * @param {number} tabSize File tab size value
     * @returns {AuraParser} Returns the AuraParser instance
     */
    setTabSize(tabSize: number): AuraParser {
        this._tabSize = tabSize;
        return this;
    }

    /**
     * Method to parse Aura XML file to extract data
     * @returns { AuraComponent | AuraApplication | AuraEvent | undefined } Returns the selected file or false if not exists
     */
    parse() {
        if (this.node) {
            return this.node;
        }
        if (this.filePath && !this.content && (!this.tokens || this.tokens.length === 0)) {
            this.filePath = Validator.validateFilePath(this.filePath);
            this.content = FileReader.readFileSync(this.filePath);
            if (!FileChecker.isAuraFile(this.filePath)) {
                throw new InvalidFilePathException('Wrong file to parse. You must to select an Aura file (Component, App or Event)');
            }
            this.tokens = AuraTokenizer.tokenize(this.content, this._tabSize);
            this.tokensLength = this.tokens.length;
        } else if (this.content && (!this.tokens || this.tokens.length === 0)) {
            this.tokens = AuraTokenizer.tokenize(this.content, this._tabSize);
            this.tokensLength = this.tokens.length;
        }
        let node;
        let positionData;
        for (let index = 0; index < this.tokensLength; index++) {
            const lastToken = LanguageUtils.getLastToken(this.tokens, index);
            const nextToken = LanguageUtils.getNextToken(this.tokens, index);
            const token = new Token(this.tokens[index]);
            if (this.cursorPosition && !positionData) {
                if (LanguageUtils.isOnPosition(token, lastToken, nextToken, this.cursorPosition)) {
                    const startIndex = this.cursorPosition.character - token.range.start.character;
                    const startPart = token.text.substring(0, startIndex + 1);
                    const endPart = token.text.substring(startIndex + 1);
                    positionData = new PositionData(startPart, endPart, (node) ? node.nodeType : undefined, undefined, 'Aura');
                    positionData.onText = token.type === AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_START || token.type === AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_END || token.type === AuraTokenTypes.LITERAL.STRING;
                }
            }
            if (lastToken) {
                if ((lastToken.type === AuraTokenTypes.BRACKET.START_TAG_OPEN || lastToken.type === AuraTokenTypes.BRACKET.TAG_EMPTY_OPEN) && token.type === AuraTokenTypes.ENTITY.TAG.NAME) {
                    const result = getTagData(this.tokens, index, this.cursorPosition);
                    if (result.positionData) {
                        if (!positionData) {
                            positionData = result.positionData;
                            positionData.nodeType = (node) ? node.nodeType : undefined;
                            delete result.positionData;
                        }
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
                                    node.implementsValues!.push(value);
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
                                    node.implementsValues!.push(value);
                                }
                            }
                        }
                    } else {
                        if (token.textToLower === 'aura:handler' && node instanceof AuraComponent) {
                            const childNode = new AuraHandler(token.text, token);
                            childNode.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'] : undefined;
                            childNode.action = !Utils.isNull(tagData.attributes['action']) ? tagData.attributes['action'] : undefined;
                            childNode.event = !Utils.isNull(tagData.attributes['event']) ? tagData.attributes['event'] : undefined;
                            childNode.includeFacets = !Utils.isNull(tagData.attributes['includeFacets']) ? tagData.attributes['includeFacets'] : undefined;
                            childNode.phase = !Utils.isNull(tagData.attributes['phase']) ? tagData.attributes['phase'] : undefined;
                            childNode.name = !Utils.isNull(tagData.attributes['name']) ? tagData.attributes['name'] : undefined;
                            node.handlers!.push(childNode);
                        } else if (token.textToLower === 'aura:registerevent' && node instanceof AuraComponent) {
                            const childNode = new AuraRegisterEvent(token.text, token);
                            childNode.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'] : undefined;
                            childNode.type = !Utils.isNull(tagData.attributes['type']) ? tagData.attributes['type'] : undefined;
                            childNode.name = !Utils.isNull(tagData.attributes['name']) ? tagData.attributes['name'] : undefined;
                            node.events!.push(childNode);
                        } else if (token.textToLower === 'aura:dependency' && node instanceof AuraApplication) {
                            const childNode = new AuraDependency(token.text, token);
                            childNode.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'] : undefined;
                            childNode.resource = !Utils.isNull(tagData.attributes['resource']) ? tagData.attributes['resource'] : undefined;
                            childNode.type = !Utils.isNull(tagData.attributes['type']) ? tagData.attributes['type'] : undefined;
                            node.dependencies!.push(childNode);
                        } else if (token.textToLower === 'aura:attribute' && node) {
                            const childNode = new AuraAttribute(token.text, token);
                            childNode.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'] : undefined;
                            childNode.access = !Utils.isNull(tagData.attributes['access']) ? tagData.attributes['access'] : undefined;
                            childNode.default = !Utils.isNull(tagData.attributes['default']) ? tagData.attributes['default'] : undefined;
                            childNode.required = !Utils.isNull(tagData.attributes['required']) ? tagData.attributes['required'] : undefined;
                            childNode.type = !Utils.isNull(tagData.attributes['type']) ? tagData.attributes['type'] : undefined;
                            childNode.name = !Utils.isNull(tagData.attributes['name']) ? tagData.attributes['name'] : undefined;
                            node.attributes!.push(childNode);
                        }
                    }
                }
            }
        }
        if (positionData && node) {
            if (!positionData.nodeType) {
                positionData.nodeType = node.nodeType;
            }
            node.positionData = positionData;
        }
        this.node = node;
        return node;
    }

}

function getTagData(tokens: Token[], index: number, position?: Position): any {
    const tagData: AuraTag = {
        name: undefined,
        startToken: undefined,
        endToken: undefined,
        attributes: {}
    };
    const len = tokens.length;
    let attrName: Token | undefined;
    let positionData;
    for (; index < len; index++) {
        const token = new Token(tokens[index]);
        const nextToken = LanguageUtils.getNextToken(tokens, index);
        const lastToken = LanguageUtils.getLastToken(tokens, index);
        if (!tagData.startToken) {
            tagData.startToken = token;
        }
        tagData.endToken = token;
        if (position && !positionData) {
            if (LanguageUtils.isOnPosition(token, lastToken, nextToken, position)) {
                const startIndex = position.character - token.range.start.character;
                const startPart = token.text.substring(0, startIndex + 1);
                const endPart = token.text.substring(startIndex + 1);
                positionData = new PositionData(startPart, endPart, undefined, undefined, 'Aura');
                positionData.onText = token.type === AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_START || token.type === AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_END || token.type === AuraTokenTypes.LITERAL.STRING;
            }
        }
        if (token.type === AuraTokenTypes.BRACKET.TAG_EMPTY_CLOSE || token.type === AuraTokenTypes.BRACKET.START_TAG_CLOSE || token.type === AuraTokenTypes.BRACKET.TAG_EXMARK_CLOSE) {
            if (positionData && position && position.line > token.range.start.line) {
                positionData = undefined;
            } else if (positionData && position && position.line === token.range.start.line && position.character >= token.range.end.character) {
                positionData = undefined;
            }
            break;
        }
        if (token.type === AuraTokenTypes.ENTITY.TAG.NAME) {
            tagData.fullName = token;
            if (StrUtils.contains(token.text, ':')) {
                const splits = token.text.split(':');
                tagData.namespace = splits[0];
                tagData.name = splits[1];
            } else {
                tagData.name = token.text;
            }
        } else if (token.type === AuraTokenTypes.ENTITY.TAG.ATTRIBUTE) {
            attrName = token;
        } else if (attrName && token.type === AuraTokenTypes.ENTITY.TAG.ATTRIBUTE_VALUE) {
            if (isAttributeQuery(token.textToLower)) {
                const data = processQuery(AuraTokenizer.tokenize(token.text), 0, position, token.range.start.character, token.range.start.line);
                if (data.positionData && !positionData) {
                    positionData = data.positionData;
                } else if (positionData) {
                    positionData.query = data.query;
                }
            }
            if (positionData && Utils.isNull(positionData.isOnAttributeValue) && position && position.character >= token.range.start.character && position.character <= token.range.end.character) {
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
    if (!positionData && position) {
        if (tagData.startToken!.range.start.line <= position.line && tagData.endToken!.range.end.line >= position.line) {
            if (tagData.startToken!.range.start.line === position.line) {
                if (tagData.startToken!.range.start.character <= position.character) {
                    positionData = new PositionData(undefined, undefined, undefined, undefined, 'Aura');
                }
            } else if (tagData.endToken!.range.end.line === position.line) {
                if (tagData.endToken!.range.start.character >= position.character) {
                    positionData = new PositionData(undefined, undefined, undefined, undefined, 'Aura');
                }
            } else {
                positionData = new PositionData(undefined, undefined, undefined, undefined, 'Aura');
            }
        }
    }
    return {
        tagData: tagData,
        positionData: positionData,
        index: index
    };
}

function isQuery(token: Token, lastToken?: Token): boolean {
    if (lastToken && lastToken.type === AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_START && token.textToLower === 'select') {
        return true;
    }
    return false;
}

function isAttributeQuery(text: string): boolean {
    return StrUtils.contains(text, 'select') && StrUtils.contains(text, 'from');
}

function processQuery(tokens: Token[], index: number, position?: Position, startColumn?: number, startLine?: number): any {
    if (!startColumn) {
        startColumn = 0;
    }
    if (!startLine) {
        startLine = 0;
    }
    const len = tokens.length;
    let token = tokens[index];
    let lastToken = LanguageUtils.getLastToken(tokens, index);
    let positionData;
    const query = new SOQLQuery('query', 'Query', token);
    let onProjection = false;
    let field = '';
    let fieldStartToken;
    for (; index < len; index++) {
        lastToken = LanguageUtils.getLastToken(tokens, index);
        token = tokens[index];
        let nextToken = LanguageUtils.getNextToken(tokens, index);
        if (startColumn !== undefined) {
            token = Utils.clone(token);
            token.range.start.character = token.range.start.character + startColumn;
            token.range.end.character = token.range.end.character + startColumn;
            token.range.start.line = token.range.start.line + startLine;
            token.range.end.line = token.range.end.line + startLine;
            if (lastToken) {
                lastToken = Utils.clone(lastToken);
                if (lastToken) {
                    lastToken.range.start.character = lastToken.range.start.character + startColumn;
                    lastToken.range.end.character = lastToken.range.end.character + startColumn;
                    lastToken.range.start.line = lastToken.range.start.line + startLine;
                    lastToken.range.end.line = lastToken.range.end.line + startLine;
                }
            }
            if (nextToken) {
                nextToken = Utils.clone(nextToken);
                if (nextToken) {
                    nextToken.range.start.character = nextToken.range.start.character + startColumn;
                    nextToken.range.end.character = nextToken.range.end.character + startColumn;
                    nextToken.range.start.line = nextToken.range.start.line + startLine;
                    nextToken.range.end.line = nextToken.range.end.line + startLine;
                }
            }
        }
        if (position && query && !positionData) {
            if (LanguageUtils.isOnPosition(token, lastToken, nextToken, position)) {
                const startIndex = position.character - token.range.start.character;
                const startPart = token.text.substring(0, startIndex + 1);
                const endPart = token.text.substring(startIndex + 1);
                positionData = new PositionData(startPart, endPart, query.nodeType, query.id, 'Aura');
                positionData.onText = token.type === AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_START || token.type === AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_END || token.type === AuraTokenTypes.LITERAL.STRING;
            }
        }
        if (token.textToLower === 'from') {
            if (field) {
                query.projection!.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                field = '';
                fieldStartToken = undefined;
            }
            onProjection = false;
            query.from = nextToken;
        } else if (token.textToLower === 'select') {
            onProjection = true;
        } else if (token.type === AuraTokenTypes.PUNCTUATION.DOUBLE_QUOTTES_END) {
            query.endToken = token;
            break;
        } else if (onProjection) {
            if (token.textToLower === ',') {
                query.projection!.push(new SOQLField(query.id + 'field_' + field, field, fieldStartToken));
                field = '';
                fieldStartToken = undefined;
            } else if (isQuery(token, lastToken)) {
                const data = processQuery(tokens, index, position, (startColumn !== undefined) ? token.range.start.character : undefined, (startColumn !== undefined) ? token.range.start.line : undefined);
                index = data.index;
                query.projection!.push(data.query);
                if (data.positionData && !positionData) {
                    positionData = data.positionData;
                }
            } else {
                field += token.text;
                if (!fieldStartToken) {
                    fieldStartToken = token;
                }
            }
        }
    }
    if (positionData) {
        positionData.query = query;
    }
    return {
        query: query,
        positionData: positionData,
        index: index
    };
}