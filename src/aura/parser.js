
const { CoreUtils, FileSystem, Types, Values } = require('@ah/core');
const TokenType = require('./tokenTypes');
const Lexer = require('./lexer');
const LangUtils = require('../utils/languageUtils');
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
const Token = Types.Token;
const Utils = CoreUtils.Utils;
const Validator = CoreUtils.Validator;

class Parser {

    static parse(pathContentOrTokens, position) {
        let tokens;
        if (Utils.isArray(pathContentOrTokens)) {
            tokens = pathContentOrTokens;
        } else if (Utils.isString(pathContentOrTokens)) {
            let content;
            if (PathUtils.isURI(pathContentOrTokens)) {
                pathContentOrTokens = Validator.validateFilePath(pathContentOrTokens);
                if (!FileChecker.isAuraFile(pathContentOrTokens))
                    throw new Error('Wrong file to parse. You must to select an Aura file (Component, App or Event)');
                content = FileReader.readFileSync(pathContentOrTokens);
            } else {
                content = pathContentOrTokens;
            }
            tokens = Lexer.tokenize(content);
        } else {
            throw new Error('You must to select a file path, file content or file tokens');
        }
        const len = tokens.length;
        let node;
        let positionData;
        const fileName = PathUtils.removeFileExtension(PathUtils.getBasename(pathContentOrTokens));
        const fileNameToLower = fileName.toLowerCase();
        for (let index = 0; index < len; index++) {
            const lastToken = LangUtils.getLastToken(tokens, index);
            const token = new Token(tokens[index]);
            if(lastToken){
                if((lastToken.type === TokenType.BRACKET.START_TAG_OPEN || lastToken.type === TokenType.BRACKET.TAG_EMPTY_OPEN) && token.type === TokenType.ENTITY.TAG.NAME){
                    const result = getTagData(tokens, index, position);
                    const tagData = result.tagData;
                    index = result.index;
                    if(Utils.isNull(node)){
                        if(token.textToLower === 'aura:component'){
                            node = new AuraComponent(fileName, token);
                            node.abstract = !Utils.isNull(tagData.attributes['abstract']) ? tagData.attributes['abstract'].value : false;
                            node.controller = !Utils.isNull(tagData.attributes['controller']) ? tagData.attributes['controller'].value : undefined;
                            node.access = !Utils.isNull(tagData.attributes['access']) ? tagData.attributes['access'].value : undefined;
                            node.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'].value : undefined;
                            node.extends = !Utils.isNull(tagData.attributes['extends']) ? tagData.attributes['extends'].value : undefined;
                            node.extensible = !Utils.isNull(tagData.attributes['extensible']) ? tagData.attributes['extensible'].value : false;
                            node.isTemplate = !Utils.isNull(tagData.attributes['isTemplate']) ? tagData.attributes['isTemplate'].value : false;
                            node.support = !Utils.isNull(tagData.attributes['support']) ? tagData.attributes['support'].value : undefined;
                            node.template = !Utils.isNull(tagData.attributes['template']) ? tagData.attributes['template'].value : undefined;
                            if(!Utils.isNull(tagData.attributes['implements']) && tagData.attributes['implements'].value){
                                const splits = tagData.attributes['implements'].value.split(',');
                                for(const split of splits){
                                    node.implements.push(split.trim());
                                }
                            }
                        } else if(token.textToLower === 'aura:event'){
                            node = new AuraEvent(fileName, token);
                            node.access = !Utils.isNull(tagData.attributes['access']) ? tagData.attributes['access'].value : undefined;
                            node.extends = !Utils.isNull(tagData.attributes['extends']) ? tagData.attributes['extends'].value : undefined;
                            node.type = !Utils.isNull(tagData.attributes['type']) ? tagData.attributes['type'].value : undefined;
                            node.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'].value : undefined;
                        } else if(token.textToLower === 'aura:application'){
                            node = new AuraApplication(fileName, token);
                            node.controller = !Utils.isNull(tagData.attributes['controller']) ? tagData.attributes['controller'].value : undefined;
                            node.abstract = !Utils.isNull(tagData.attributes['abstract']) ? tagData.attributes['abstract'].value : false;
                            node.access = !Utils.isNull(tagData.attributes['access']) ? tagData.attributes['access'].value : undefined;
                            node.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'].value : undefined;
                            node.extends = !Utils.isNull(tagData.attributes['extends']) ? tagData.attributes['extends'].value : undefined;
                            node.extensible = !Utils.isNull(tagData.attributes['extensible']) ? tagData.attributes['extensible'].value : false;
                            node.support = !Utils.isNull(tagData.attributes['support']) ? tagData.attributes['support'].value : undefined;
                            node.template = !Utils.isNull(tagData.attributes['template']) ? tagData.attributes['template'].value : undefined;
                            if(!Utils.isNull(tagData.attributes['implements']) && tagData.attributes['implements'].value){
                                const splits = tagData.attributes['implements'].value.split(',');
                                for(const split of splits){
                                    node.implements.push(split.trim());
                                }
                            }
                        }
                    } else {
                        const name = !Utils.isNull(tagData.attributes['name']) ? tagData.attributes['name'].value : tagData.name;
                        if(token.textToLower === 'aura:handler'){
                            const childNode = new AuraHandler(name, token);
                            childNode.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'].value : undefined;
                            childNode.action = !Utils.isNull(tagData.attributes['action']) ? tagData.attributes['action'].value : undefined;
                            childNode.event = !Utils.isNull(tagData.attributes['event']) ? tagData.attributes['event'].value : undefined;
                            childNode.includeFacets = !Utils.isNull(tagData.attributes['includeFacets']) ? tagData.attributes['includeFacets'].value : false;
                            childNode.phase = !Utils.isNull(tagData.attributes['phase']) ? tagData.attributes['phase'].value : undefined;
                            node.handlers.push(childNode);
                        } else if(token.textToLower === 'aura:registerevent'){
                            const childNode = new AuraRegisterEvent(name, token);
                            childNode.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'].value : undefined;
                            childNode.type = !Utils.isNull(tagData.attributes['type']) ? tagData.attributes['type'].value : undefined;
                            node.events.push(childNode);
                        } else if(token.textToLower === 'aura:dependency'){
                            const childNode = new AuraDependency(name, token);
                            childNode.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'].value : undefined;
                            childNode.resource = !Utils.isNull(tagData.attributes['resource']) ? tagData.attributes['resource'].value : undefined;
                            childNode.type = !Utils.isNull(tagData.attributes['type']) ? tagData.attributes['type'].value : undefined;
                            node.dependencies.push(childNode);
                        } else if(token.textToLower === 'aura:attribute'){
                            const childNode = new AuraAttribute(name, token);
                            childNode.description = !Utils.isNull(tagData.attributes['description']) ? tagData.attributes['description'].value : undefined;
                            childNode.access = !Utils.isNull(tagData.attributes['access']) ? tagData.attributes['access'].value : undefined;
                            childNode.default = !Utils.isNull(tagData.attributes['default']) ? tagData.attributes['default'].value : undefined;
                            childNode.required = !Utils.isNull(tagData.attributes['required']) ? tagData.attributes['required'].value : false;
                            childNode.type = !Utils.isNull(tagData.attributes['type']) ? tagData.attributes['type'].value : undefined;
                            node.attributes[childNode.qualifiedName.toLowerCase()] = childNode;
                        }
                    }
                } 
            }
        }
        return node;
    }

    static isPositionOnText(content, position) {
        const tokens = Lexer.tokenize(content);
        const len = tokens.length;
        for (let index = 0; index < len; index++) {
            let token = new Token(tokens[index]);
            if (token.range.start.isBeforeOrEqual(position) && token.range.end.isAfterOrEqual(position) && (token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_START || token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_END || token.type === TokenType.LITERAL.STRING))
                return true;

        }
        return false;
    }

    static getPositionRange(content, tokenText, ignoreCase){
        if(ignoreCase)
            tokenText = tokenText.toLowerCase();
        const tokens = Lexer.tokenize(content);
        const len = tokens.length;
        for (let index = 0; index < len; index++) {
            const token = new Token(tokens[index]);
            const sameText = (ignoreCase) ? token.textToLower === tokenText : token.text === tokenText;
            if(sameText && token.range.start.isBeforeOrEqual(position) && token.range.end.isAfterOrEqual(position))
                return token.range;
            
        }
        return 0;
    }

    static getDataToPutAuraAttributes(content, position) {
        const data = {
            openBracket: false,
            startIndex: 0,
            onText: false
        }
        const tokens = Lexer.tokenize(content);
        const len = tokens.length;
        for (let index = 0; index < len; index++) {
            const token = new Token(tokens[index]);
            const nextToken = LangUtils.getNextToken(tokens, index);
            if (token.range.start.isBeforeOrEqual(position) && token.range.end.isAfterOrEqual(position) && (token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_START || token.type === TokenType.PUNCTUATION.DOUBLE_QUOTTES_END || token.type === TokenType.LITERAL.STRING))
                data.onText = true;
            if (token.type === TokenType.BRACKET.CURLY_OPEN && token.range.start.isBeforeOrEqual(position))
                data.openBracket = true;
            if (token.type === TokenType.BRACKET.CURLY_CLOSE && token.range.start.isBeforeOrEqual(position))
                data.openBracket = false;
            if (token.textToLower === 'v' && nextToken && (nextToken.type === TokenType.PUNCTUATION.OBJECT_ACCESSOR ||nextToken.type === TokenType.PUNCTUATION.SAFE_OBJECT_ACCESSOR))
                data.startIndex = token.startColumn;
        }
        return data;
    }
}
module.exports = Parser;

function getTagData(tokens, index, position){
    const tagData = {
        name: undefined,
        nameToLower: undefined,
        attributes: {}
    };
    const len = tokens.length;
    let attrName;
    for(; index < len; index++){
        const token = new Token(tokens[index]);
        if(token.type === TokenType.BRACKET.TAG_EMPTY_CLOSE || token.type === TokenType.BRACKET.START_TAG_CLOSE || token.type === TokenType.BRACKET.TAG_EXMARK_CLOSE)
            break;
        if(token.type === TokenType.ENTITY.TAG.NAME){
            tagData.name = token.text;
            tagData.nameToLower = token.textToLower;
        } else if(token.type === TokenType.ENTITY.TAG.ATTRIBUTE){
            attrName = token;
        } else if(token.type === TokenType.ENTITY.TAG.ATTRIBUTE_VALUE){
            tagData.attributes[attrName.textToLower] = {
                name: attrName.text,
                nameToLower: attrName.textToLower,
                value: token.text,
                valueToLower: token.textToLower
            };
        }
    }
    index--;
    return {
        tagData: tagData,
        index: index
    };
}