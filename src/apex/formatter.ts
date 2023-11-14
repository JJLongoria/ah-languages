import { ApexFormatterConfig, ParserData, Token, WrongDatatypeException, CoreUtils, ApexTokenTypes } from "@aurahelper/core";
import { LanguageUtils } from "../utils";
import { ApexTokenizer } from "./tokenizer";

const StrUtils = CoreUtils.StrUtils;

/**
 * Class to format any Apex Class with a selected configuration to format code as you want
 */
export class ApexFormatter {

    /**
     * Method to get a default formatter config object
     * 
     * @returns {ApexFormatterConfig} Returns a default formatter config object
     */
    static config() {
        return new ApexFormatterConfig();
    }

    /**
     * Method to format an Apex Class with the selected options
     * @param {string | Token[]} tokensOrContent Class file path or string file content or Apex Class Tokens (Use ApexTokenizer)
     * @param {ApexFormatterConfig | { [key: string]: any }} [config] Apex formatter config object or VSCode Config JSON object
     * @param {ParserData} [systemData] System data like System Apex Classes or Namespaces to tokenize apex class if pathContentOrTokens is a class content or file path. Can get it with System Class from System Module
     * @param {number} [tabSize] Tab size to format
     * @param {boolean} [insertSpaces] True to insert spaces instead tabs
     * 
     * @returns {string} Returns the Apex Class content formatted 
     * 
     * @throws {WrongDatatypeException} If pathContentOrTokens datatype is not an string, path or file tokens
     * @throws {WrongFilePathException} If the file Path is not a string or can't convert to absolute path
     * @throws {FileNotFoundException} If the file not exists or not have access to it
     * @throws {InvalidFilePathException} If the path is not a file
     */
    static format(tokensOrContent: string | Token[], config?: ApexFormatterConfig | { [key: string]: any }, systemData?: ParserData, tabSize?: number, insertSpaces?: boolean): string {
        let tokens: Token[] = [];
        if (typeof tokensOrContent !== 'string') {
            tokens = tokensOrContent;
        } else if (typeof tokensOrContent === 'string') {
            const content = tokensOrContent;
            tokens = ApexTokenizer.tokenize(content, systemData, tabSize);
        } else {
            throw new WrongDatatypeException('You must to select a file path, file content or file tokens');
        }
        const conf = new ApexFormatterConfig(config);
        return formatApex(tokens, conf, tabSize, insertSpaces);
    }
}

function formatApex(tokens: Token[], config: ApexFormatterConfig, tabSize?: number, insertSpaces?: boolean): string {
    let indent = 0;
    let indentOffset = 0;
    let strIndex;
    let lines = '';
    let line = '';
    let beforeWhitespaces = 0;
    let afterWhitespaces = 0;
    let guardOpen = false;
    let mainBodyIndent = 0;
    let queryOpenIndex = [];
    let querySelectIndex = [];
    let complexString = false;
    let onProperty = false;
    let emptyProperty = false;
    if (!tabSize) {
        tabSize = 4;
    }
    let projectionFieldsOnLine = [];
    let objectFieldsOnLine = [];
    let conditionsOnLine = [];
    let conditionOpenIndex = [];
    let priorityIndex = [];
    for (let len = tokens.length, index = 0; index < len; index++) {
        let token = tokens[index];
        let lastToken = LanguageUtils.getLastToken(tokens, index);
        let twoLastToken = LanguageUtils.getTwoLastToken(tokens, index);
        let nextToken = LanguageUtils.getNextToken(tokens, index);
        let newLines = 0;
        let originalNewLines = (lastToken && !token.isAux && !lastToken.isAux) ? token.range.start.line - lastToken.range.start.line : 0;
        const parentToken = (token.parentToken !== undefined && token.parentToken !== -1) ? new Token(tokens[token.parentToken]) : undefined;
        const lastParentToken = (lastToken && lastToken.parentToken !== undefined && lastToken.parentToken !== -1) ? new Token(tokens[lastToken.parentToken]) : undefined;
        if (token.type === ApexTokenTypes.BRACKET.CURLY_OPEN || token.type === ApexTokenTypes.BRACKET.INITIALIZER_OPEN) {
            indent++;
        } else if (token.type === ApexTokenTypes.BRACKET.CURLY_CLOSE || token.type === ApexTokenTypes.BRACKET.INITIALIZER_CLOSE) {
            if (mainBodyIndent === indent) {
                mainBodyIndent--;
            }
            indent--;
        } else if (token.type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_OPEN) {
            guardOpen = true;
        } else if (token.type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE) {
            guardOpen = false;
        }
        if(token.type === ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN){
            priorityIndex.push(StrUtils.replace(line, '\t', StrUtils.getWhitespaces(tabSize)).length - (indent * tabSize));
        } else if(token.type === ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_CLOSE){
            priorityIndex.pop();
        }
        if (lastToken && (lastToken.type === ApexTokenTypes.BRACKET.QUERY_START || lastToken && lastToken.type === ApexTokenTypes.BRACKET.INNER_QUERY_START)) {
            queryOpenIndex.push(StrUtils.replace(line, '\t', StrUtils.getWhitespaces(tabSize)).length - (indent * tabSize));
            projectionFieldsOnLine.push(0);
        }
        if (lastToken && lastToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_SOBJECT_OPEN) {
            objectFieldsOnLine.push(0);
            if (config && config.punctuation.SObjectFieldsPerLine > 0) {
                indent++;
            }
        }
        if (lastToken && lastToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_OPEN) {
            conditionsOnLine.push(1);
            conditionOpenIndex.push(StrUtils.replace(line, '\t', StrUtils.getWhitespaces(tabSize)).length - (indent * tabSize));
            /*if (config && config.punctuation.maxConditionsPerLine > 0) {
                indent++;
            }*/
        }
        if (token.type === ApexTokenTypes.BRACKET.INNER_QUERY_START) {
            if (config && config.query.maxProjectionFieldPerLine > 0) {
                if (projectionFieldsOnLine[projectionFieldsOnLine.length - 1] === config.query.maxProjectionFieldPerLine) {
                    newLines = 1;
                    beforeWhitespaces = querySelectIndex[0];
                    projectionFieldsOnLine[projectionFieldsOnLine.length - 1] = 1;
                } else {
                    projectionFieldsOnLine[projectionFieldsOnLine.length - 1] = projectionFieldsOnLine[projectionFieldsOnLine.length - 1] + 1;
                }
            }
        }
        if (lastToken && lastToken.type === ApexTokenTypes.QUERY.CLAUSE.SELECT) {
            querySelectIndex.push(StrUtils.replace(line, '\t', StrUtils.getWhitespaces(tabSize)).length - (indent * tabSize));
        }

        if (token.type === ApexTokenTypes.KEYWORD.DECLARATION.CLASS || token.type === ApexTokenTypes.KEYWORD.DECLARATION.ENUM || token.type === ApexTokenTypes.KEYWORD.DECLARATION.INTERFACE) {
            mainBodyIndent = indent + 1;
        }

        if (lastToken && isAnnotationToken(lastToken) && !isAnnotationToken(token)) {
            newLines = 1;
        }
        if (lastToken && lastToken.type === ApexTokenTypes.BRACKET.ANNOTATION_PARAM_CLOSE) {
            newLines = 1;
        }
        if (isCommentToken(token) && nextToken && isCommentToken(nextToken) && isOnSameLine(token, nextToken)) {
            afterWhitespaces = nextToken.range.start.character - token.range.end.character;
        }
        if (isCommentToken(token) && lastToken && isCommentToken(lastToken) && !isOnSameLine(token, lastToken)) {
            newLines = (lastToken) ? token.range.start.line - lastToken.range.start.line : 0;
        }
        if (lastToken && isCommentToken(lastToken) && !isCommentToken(token) && !isOnSameLine(token, lastToken)) {
            newLines = 1;
        }
        if (lastToken && !isCommentToken(lastToken) && isCommentToken(token) && isOnSameLine(token, lastToken) && config && config.comment.holdBeforeWhitespacesOnLineComment) {
            beforeWhitespaces = token.range.start.character - lastToken.range.end.character;
        }
        if (lastToken && isCommentToken(lastToken) && !isCommentToken(token) && isOnSameLine(token, lastToken) && config && config.comment.holdAfterWhitespacesOnLineComment) {
            afterWhitespaces = token.range.start.character - lastToken.range.end.character;
        }
        if (lastToken && isCommentToken(lastToken) && (token.type === ApexTokenTypes.COMMENT.BLOCK_START || token.type === ApexTokenTypes.COMMENT.LINE || token.type === ApexTokenTypes.COMMENT.LINE_DOC) && !isOnSameLine(token, lastToken)) {
            newLines = (config) ? config.comment.newLinesBewteenComments + 1 : 1;
        }
        if (isStringToken(token) && nextToken && isStringToken(nextToken) && isOnSameLine(token, nextToken)) {
            afterWhitespaces = nextToken.range.start.character - token.range.end.character;
            if (!strIndex) {
                strIndex = token.range.start.character;
            }
        }
        if (lastToken && (lastToken.type === ApexTokenTypes.BRACKET.CURLY_OPEN || lastToken.type === ApexTokenTypes.BRACKET.INITIALIZER_OPEN)) {
            newLines = 1;
        }
        if (lastToken && (lastToken.type === ApexTokenTypes.BRACKET.CURLY_CLOSE || lastToken.type === ApexTokenTypes.BRACKET.INITIALIZER_CLOSE)) {
            newLines = 1;
        }
        if (lastToken && lastToken.type === ApexTokenTypes.BRACKET.CURLY_CLOSE && lastToken.isAux && token.type === ApexTokenTypes.BRACKET.CURLY_CLOSE && token.isAux) {
            newLines = 0;
        }
        else if (token.type === ApexTokenTypes.BRACKET.CURLY_CLOSE && !token.isAux) {
            newLines = 1;
        }
        if (!token.isAux && token.type === ApexTokenTypes.BRACKET.CURLY_OPEN && config && config.punctuation.addWhitespaceBeforeOpenCurlyBracket && !config.punctuation.openCurlyBracketOnNewLine) {
            beforeWhitespaces = 1;
        }
        if (!token.isAux && token.type === ApexTokenTypes.BRACKET.CURLY_OPEN && config && config.punctuation.openCurlyBracketOnNewLine) {
            newLines = 1;
            indentOffset = -1;
        }
        if (lastToken && lastToken.type === ApexTokenTypes.PUNCTUATION.SEMICOLON && !guardOpen && token.type !== ApexTokenTypes.BRACKET.CURLY_CLOSE) {
            strIndex = undefined;
            if (isCommentToken(token) && isOnSameLine(token, lastToken)) {
                if (config && config.comment.holdAfterWhitespacesOnLineComment) {
                    beforeWhitespaces = token.range.start.character - lastToken.range.end.character;
                } else {
                    beforeWhitespaces = 1;
                }
            } else {
                newLines = 1;
            }
        }
        else if (lastToken && lastToken.type === ApexTokenTypes.PUNCTUATION.SEMICOLON && guardOpen) {
            beforeWhitespaces = 1;
        }
        if (lastToken && lastToken.type === ApexTokenTypes.BRACKET.CURLY_CLOSE && lastToken.parentToken && config && config.punctuation.addNewLineAfterCloseCurlyBracket) {
            newLines = 1;
        } else if (lastToken && lastToken.type === ApexTokenTypes.BRACKET.CURLY_CLOSE && !lastToken.isAux && lastToken.parentToken && config && !config.punctuation.addNewLineAfterCloseCurlyBracket && isDependentFlowStructure(token)) {
            newLines = 0;
            if (config && config.punctuation.addWhitespaceAfterCloseCurlyBracket) {
                beforeWhitespaces = 1;
            }
        }
        if (token.type === ApexTokenTypes.BRACKET.TRIGGER_GUARD_OPEN && config && config.punctuation.addWhitespaceBeforeOpenTriggerEvents) {
            beforeWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.PUNCTUATION.COMMA && config && config.punctuation.addWhiteSpaceAfterComma) {
            afterWhitespaces = 1;
        }
        if (lastToken && lastToken.type === ApexTokenTypes.BRACKET.CURLY_CLOSE && !lastToken.isAux && config.classMembers.newLinesBetweenCodeBlockMembers > 0) {
            if (lastParentToken) {
            }
            if (lastParentToken && (lastParentToken.type === ApexTokenTypes.DECLARATION.ENTITY.FUNCTION || lastParentToken.type === ApexTokenTypes.DECLARATION.ENTITY.CLASS || lastParentToken.type === ApexTokenTypes.DECLARATION.ENTITY.PROPERTY || lastParentToken.type === ApexTokenTypes.DECLARATION.ENTITY.CONSTRUCTOR || lastParentToken.type === ApexTokenTypes.DECLARATION.ENTITY.ENUM || lastParentToken.type === ApexTokenTypes.DECLARATION.ENTITY.INTERFACE)) {
                newLines = (config) ? config.classMembers.newLinesBetweenCodeBlockMembers + 1 : 1;
                if (isFieldInstructionDeclaration(tokens, index)) {
                    if (isNextInstructionFieldDeclaration(tokens, index)) {
                        newLines = (config) ? config.classMembers.newLinesBetweenClassFields + 1 : 1;
                    } else {
                        newLines = (config) ? config.classMembers.newLinesBetweenCodeBlockMembers + 1 : 1;
                    }
                }
            }
        }
        if (lastToken && (lastToken.type === ApexTokenTypes.BRACKET.CURLY_CLOSE || lastToken.type === ApexTokenTypes.PUNCTUATION.SEMICOLON) && !lastToken.isAux && (token.type === ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_GETTER || token.type === ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_SETTER) && config && config.classMembers.newLinesBetweenGetterAndSetterAccessor > 0) {
            newLines = (config) ? config.classMembers.newLinesBetweenGetterAndSetterAccessor + 1 : 1;
        }
        if (isKeyword(token) && nextToken && nextToken.type !== ApexTokenTypes.BRACKET.CURLY_OPEN && nextToken.type !== ApexTokenTypes.PUNCTUATION.COMMA && nextToken.type !== ApexTokenTypes.BRACKET.TRIGGER_GUARD_CLOSE && nextToken.type !== ApexTokenTypes.PUNCTUATION.SEMICOLON) {
            afterWhitespaces = 1;
            if (lastToken && lastToken.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE) {
                beforeWhitespaces = 1;
            }
        }
        if (isMemberDeclaration(token) && lastToken && lastToken.type !== ApexTokenTypes.PUNCTUATION.COMMA) {
            beforeWhitespaces = 1;
        }
        if (twoLastToken && isFieldDeclaration(twoLastToken) && lastToken && lastToken.type === ApexTokenTypes.PUNCTUATION.SEMICOLON && isNextInstructionFieldDeclaration(tokens, index) && config && config.classMembers.newLinesBetweenClassFields > 0 && mainBodyIndent === indent) {
            newLines = (config) ? config.classMembers.newLinesBetweenClassFields + 1 : 1;
        }
        else if (twoLastToken && isFieldDeclaration(twoLastToken) && lastToken && lastToken.type === ApexTokenTypes.PUNCTUATION.SEMICOLON && !isNextInstructionFieldDeclaration(tokens, index) && mainBodyIndent === indent) {
            newLines = (config) ? config.classMembers.newLinesBetweenCodeBlockMembers + 1 : 1;
        }
        if (lastToken && lastToken.type === ApexTokenTypes.PUNCTUATION.COMMA && twoLastToken && twoLastToken.type === ApexTokenTypes.ENTITY.ENUM_VALUE && token.type !== ApexTokenTypes.COMMENT.LINE && token.type !== ApexTokenTypes.COMMENT.LINE_DOC) {
            newLines = 1;
        }
        if (isKeyword(token) && lastToken && lastToken.type === ApexTokenTypes.DECLARATION.ENTITY.VARIABLE) {
            beforeWhitespaces = 1;
        }
        if (isQueryClause(token) && config && config.query.oneClausePerLine && lastToken && lastToken.type !== ApexTokenTypes.BRACKET.QUERY_START && lastToken.type !== ApexTokenTypes.BRACKET.INNER_QUERY_START) {
            newLines = 1;
            beforeWhitespaces = queryOpenIndex[queryOpenIndex.length - 1];
        } else if (isQueryClause(token) && lastToken && lastToken.type !== ApexTokenTypes.BRACKET.QUERY_START && lastToken.type !== ApexTokenTypes.BRACKET.INNER_QUERY_START) {
            beforeWhitespaces = 1;
        }
        if (isQueryClause(token)) {
            afterWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.QUERY.OPERATOR && lastToken && lastToken.type !== ApexTokenTypes.QUERY.OPERATOR) {
            beforeWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.QUERY.OPERATOR && nextToken && nextToken.type !== ApexTokenTypes.QUERY.VALUE_BIND) {
            afterWhitespaces = 1;
        }
        if (lastToken && isQueryClause(lastToken) && token.type === ApexTokenTypes.DATATYPE.SOBJECT) {
            afterWhitespaces = 1;
        }
        if (lastToken && isQueryFunction(lastToken) && token.type === ApexTokenTypes.DATATYPE.SOBJECT) {
            beforeWhitespaces = 1;
        }
        if (lastToken && (isLiteral(lastToken) || lastToken.type === ApexTokenTypes.ENTITY.SOBJECT_FIELD || lastToken.type === ApexTokenTypes.ENTITY.SOBJECT_PROJECTION_FIELD || lastToken.type === ApexTokenTypes.PUNCTUATION.QUOTTES_END || lastToken.type === ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_CLOSE || lastToken.type === ApexTokenTypes.ENTITY.VARIABLE) && isQueryClause(token) && newLines === 0) {
            beforeWhitespaces = 1;
        }
        if (lastToken && lastToken.type === ApexTokenTypes.QUERY.CLAUSE.SELECT && config && config.query.maxProjectionFieldPerLine > 0) {
            if (config && projectionFieldsOnLine[projectionFieldsOnLine.length - 1] === config.query.maxProjectionFieldPerLine) {
                newLines = 1;
                beforeWhitespaces = querySelectIndex[querySelectIndex.length - 1];
                projectionFieldsOnLine[projectionFieldsOnLine.length - 1] = 1;
            } else {
                projectionFieldsOnLine[projectionFieldsOnLine.length - 1] = projectionFieldsOnLine[projectionFieldsOnLine.length - 1] + 1;
            }
        }
        if (twoLastToken && twoLastToken.type === ApexTokenTypes.ENTITY.SOBJECT_PROJECTION_FIELD && lastToken && (lastToken.type === ApexTokenTypes.PUNCTUATION.COMMA) && config && config.query.maxProjectionFieldPerLine > 0) {
            if (config && projectionFieldsOnLine[projectionFieldsOnLine.length - 1] === config.query.maxProjectionFieldPerLine) {
                newLines = 1;
                beforeWhitespaces = querySelectIndex[querySelectIndex.length - 1];
                projectionFieldsOnLine[projectionFieldsOnLine.length - 1] = 1;
            } else {
                projectionFieldsOnLine[projectionFieldsOnLine.length - 1] = projectionFieldsOnLine[projectionFieldsOnLine.length - 1] + 1;
            }
        }
        if (token.type === ApexTokenTypes.QUERY.VALUE_BIND && lastToken && lastToken.type !== ApexTokenTypes.QUERY.OPERATOR && !isOperator(lastToken) && !isKeyword(lastToken) && !isQueryClause(lastToken)) {
            beforeWhitespaces = 1;
        }
        if ((isOperator(token) || (token.type === ApexTokenTypes.ANNOTATION.CONTENT && token.text === '=')) && config && config.operator.addWhitespaceBeforeOperator) {
            beforeWhitespaces = 1;
        }
        if ((isOperator(token) || (token.type === ApexTokenTypes.ANNOTATION.CONTENT && token.text === '=')) && config && config.operator.addWhitespaceAfterOperator) {
            afterWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.OPERATOR.ARITHMETIC.INCREMENT && nextToken && (nextToken.type === ApexTokenTypes.ENTITY.VARIABLE)) {
            afterWhitespaces = 0;
        }
        if (token.type === ApexTokenTypes.OPERATOR.ARITHMETIC.INCREMENT && lastToken && (lastToken.type === ApexTokenTypes.ENTITY.VARIABLE)) {
            beforeWhitespaces = 0;
            if (nextToken && (nextToken.type === ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN || nextToken.type === ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_CLOSE || nextToken.type === ApexTokenTypes.PUNCTUATION.SEMICOLON || nextToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE || nextToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_OPEN)) {
                afterWhitespaces = 0;
            }
        }
        if (token.type === ApexTokenTypes.OPERATOR.ARITHMETIC.DECREMENT && nextToken && (nextToken.type === ApexTokenTypes.ENTITY.VARIABLE)) {
            afterWhitespaces = 0;
        }
        if (token.type === ApexTokenTypes.OPERATOR.ARITHMETIC.DECREMENT && lastToken && (lastToken.type === ApexTokenTypes.ENTITY.VARIABLE)) {
            beforeWhitespaces = 0;
        }
        if (token.type === ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN && config && config.operator.addWhitespaceAfterOpenParenthesisOperator) {
            afterWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN && config && config.operator.addWhitespaceBeforeOpenParenthesisOperator) {
            beforeWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_CLOSE && config && config.operator.addWhitespaceAfterCloseParenthesisOperator) {
            afterWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_CLOSE && config && config.operator.addWhitespaceBeforeCloseParenthesisOperator) {
            beforeWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_OPEN && config && config.punctuation.addWhitespaceBeforeOpenGuardParenthesis) {
            beforeWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE && config && config.punctuation.addWhitespaceBeforeCloseGuardParenthesis) {
            beforeWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_OPEN && config && config.punctuation.addWhitespaceAfterOpenGuardParenthesis) {
            afterWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE && config && config.punctuation.addWhitespaceBeforeCloseGuardParenthesis) {
            beforeWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.ENTITY.SOBJECT_PROJECTION_FIELD && nextToken && nextToken.type === ApexTokenTypes.ENTITY.SOBJECT_PROJECTION_FIELD) {
            afterWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.ENTITY.SOBJECT_PROJECTION_FIELD && nextToken && nextToken.type === ApexTokenTypes.ENTITY.ALIAS_FIELD) {
            afterWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.QUERY.SCOPE_VALUE || token.type === ApexTokenTypes.QUERY.NULLS_VALUE || token.type === ApexTokenTypes.QUERY.ORDER) {
            beforeWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.PUNCTUATION.OBJECT_ACCESSOR) {
            afterWhitespaces = 0;
            beforeWhitespaces = 0;
        }
        if (lastToken && lastToken.type === ApexTokenTypes.PUNCTUATION.OBJECT_ACCESSOR) {
            beforeWhitespaces = 0;
        }
        if (nextToken && nextToken.type === ApexTokenTypes.PUNCTUATION.OBJECT_ACCESSOR) {
            afterWhitespaces = 0;
        }
        if (token.type === ApexTokenTypes.OPERATOR.LOGICAL.INSTANCE_OF) {
            afterWhitespaces = 1;
            beforeWhitespaces = 1;
        }
        if (token && token.type === ApexTokenTypes.BRACKET.INIT_VALUES_OPEN) {
            afterWhitespaces = 1;
        }
        if (token && token.type === ApexTokenTypes.BRACKET.INIT_VALUES_CLOSE) {
            beforeWhitespaces = 1;
        }
        if (token.type === ApexTokenTypes.BRACKET.CASTING_OPEN) {
            afterWhitespaces = 0;
        } else if (isDatatype(token) && lastToken && lastToken.type === ApexTokenTypes.BRACKET.CASTING_OPEN && nextToken && nextToken.type === ApexTokenTypes.BRACKET.CASTING_CLOSE) {
            afterWhitespaces = 0;
            beforeWhitespaces = 0;
        } else if (token.type === ApexTokenTypes.BRACKET.CASTING_CLOSE) {
            beforeWhitespaces = 0;
            afterWhitespaces = 1;
        }
        if (lastToken && lastToken.type === ApexTokenTypes.PUNCTUATION.COMMA && isCommentToken(token) && originalNewLines > 0) {
            newLines = 1;
        }
        if (token.type === ApexTokenTypes.ENTITY.SOBJECT_FIELD && objectFieldsOnLine.length > 0 && config && config.punctuation.SObjectFieldsPerLine > 0) {
            if (lastToken && lastToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_SOBJECT_OPEN) {
                newLines = 1;
            }
            if (objectFieldsOnLine[objectFieldsOnLine.length - 1] === config.punctuation.SObjectFieldsPerLine) {
                newLines = 1;
                objectFieldsOnLine[objectFieldsOnLine.length - 1] = 1;
            } else {
                objectFieldsOnLine[objectFieldsOnLine.length - 1] = objectFieldsOnLine[objectFieldsOnLine.length - 1] + 1;
            }
        }
        if (isLogicalOperator(token) && conditionsOnLine.length > 0 && priorityIndex.length === 0 && config && config.punctuation.maxConditionsPerLine > 0 && config.punctuation.conditionLogicOperatorOnNewLine) {
            if (conditionsOnLine[conditionsOnLine.length - 1] === config.punctuation.maxConditionsPerLine) {
                newLines = 1;
                beforeWhitespaces = conditionOpenIndex[conditionOpenIndex.length - 1];
                conditionsOnLine[conditionsOnLine.length - 1] = 1;
            } else {
                conditionsOnLine[conditionsOnLine.length - 1] = conditionsOnLine[conditionsOnLine.length - 1] + 1;
            }
        }
        if (lastToken && isLogicalOperator(lastToken) && conditionsOnLine.length > 0 && (priorityIndex.length === 0 || (priorityIndex.length === 1 && ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN)) && config && config.punctuation.maxConditionsPerLine > 0 && !config.punctuation.conditionLogicOperatorOnNewLine) {
            if (conditionsOnLine[conditionsOnLine.length - 1] === config.punctuation.maxConditionsPerLine) {
                newLines = 1;
                beforeWhitespaces = conditionOpenIndex[conditionOpenIndex.length - 1];
                conditionsOnLine[conditionsOnLine.length - 1] = 1;
            } else {
                conditionsOnLine[conditionsOnLine.length - 1] = conditionsOnLine[conditionsOnLine.length - 1] + 1;
            }
        }
        if ((lastToken && isOperator(lastToken) && isStringToken(token) && originalNewLines > 0) || complexString) {
            complexString = false;
            if (strIndex) {
                let rest = strIndex % 4;
                indentOffset = (strIndex - (indent * tabSize)) / tabSize;
                if (rest > 0) {
                    indentOffset -= 1;
                    beforeWhitespaces = rest - 1;
                }
            }
            newLines = 1;
        }
        if (isKeyword(token) && token.textToLower === 'on') {
            if (beforeWhitespaces === 0) {
                beforeWhitespaces = 1;
            }
        }
        if (lastToken && isStringToken(lastToken) && isOperator(token) && originalNewLines > 0) {
            newLines = 0;
            complexString = true;
        }
        if (token.type === ApexTokenTypes.BRACKET.QUERY_END || token.type === ApexTokenTypes.BRACKET.INNER_QUERY_END) {
            querySelectIndex.pop();
            queryOpenIndex.pop();
            projectionFieldsOnLine.pop();
        }
        if (token.type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE) {
            conditionOpenIndex.pop();
            conditionsOnLine.pop();
        }
        if (token.type === ApexTokenTypes.BRACKET.PARENTHESIS_SOBJECT_CLOSE) {
            objectFieldsOnLine.pop();
            if (config.punctuation.SObjectFieldsPerLine > 0) {
                newLines = lastToken && lastToken.type !== ApexTokenTypes.BRACKET.PARENTHESIS_SOBJECT_OPEN ? 1 : 0;
                indent--;
            }
        }
        if (indent > 0 && indent !== mainBodyIndent && token.type !== ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_GETTER && token.type !== ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_SETTER) {
            if (newLines > 0 && originalNewLines > 1) {
                if (config && config.punctuation.maxBlankLines === -1) {
                    newLines = originalNewLines;
                } else if (config && config.punctuation.maxBlankLines === 0) {
                    newLines = 1;
                } else if (config && config.punctuation.maxBlankLines > 0 && originalNewLines > config.punctuation.maxBlankLines) {
                    newLines = config.punctuation.maxBlankLines + 1;
                } else if (config && config.punctuation.maxBlankLines > 0 && originalNewLines <= config.punctuation.maxBlankLines) {
                    newLines = originalNewLines;
                }
            }
        }
        if (lastToken && lastToken.type === ApexTokenTypes.DECLARATION.ENTITY.PROPERTY) {
            onProperty = true;
            emptyProperty = isEmptyProperty(tokens, index);
        }
        if (token.type === ApexTokenTypes.BRACKET.CURLY_CLOSE && onProperty && emptyProperty && config && config.classMembers.singleLineProperties) {
            onProperty = false;
            emptyProperty = false;
            newLines = 0;
            beforeWhitespaces = 1;
        }
        if (onProperty && emptyProperty && config && config.classMembers.singleLineProperties) {
            newLines = 0;
            if (token.type === ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_GETTER || token.type === ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_SETTER) {
                beforeWhitespaces = 1;
            }
        }
        if (isInitializer(token)) {
            indentOffset = -1;
            beforeWhitespaces = 0;
            newLines = 1;
        }
        if (isUnaryOperator(token)) {
            afterWhitespaces = 0;
        }
        if (newLines > 0) {
            if (newLines > 1) {
                line += StrUtils.getNewLines(newLines - 1);
            }
            lines += line + '\n';
            line = '';
            if (!insertSpaces) {
                line += StrUtils.getTabs(indent + indentOffset);
            } else {
                line += StrUtils.getWhitespaces((indent + indentOffset) * tabSize);
            }

            if (token.type === ApexTokenTypes.COMMENT.CONTENT || token.type === ApexTokenTypes.COMMENT.BLOCK_END) {
                beforeWhitespaces = 1;
            }
            if (!token.isAux) {
                if (beforeWhitespaces > 0) {
                    line += StrUtils.getWhitespaces(beforeWhitespaces);
                }
                line += token.text;
                if (afterWhitespaces > 0) {
                    line += StrUtils.getWhitespaces(afterWhitespaces);
                }
            }
            beforeWhitespaces = 0;
            afterWhitespaces = 0;
            newLines = 0;
            indentOffset = 0;
        } else {
            if (!token.isAux) {
                if (beforeWhitespaces > 0) {
                    line += StrUtils.getWhitespaces(beforeWhitespaces);
                }
                line += token.text;
                if (afterWhitespaces > 0) {
                    line += StrUtils.getWhitespaces(afterWhitespaces);
                }
            }
            beforeWhitespaces = 0;
            afterWhitespaces = 0;
            indentOffset = 0;
        }
    }
    lines += line;
    return lines;
}

function isLiteral(token: Token): boolean {
    return token.type === ApexTokenTypes.LITERAL.BOOLEAN || token.type === ApexTokenTypes.LITERAL.DATE || token.type === ApexTokenTypes.LITERAL.DATETIME || token.type === ApexTokenTypes.LITERAL.DATE_PARAMETRIZED || token.type === ApexTokenTypes.LITERAL.DATE_PARAMETRIZED_START_PARAM || token.type === ApexTokenTypes.LITERAL.DOUBLE || token.type === ApexTokenTypes.LITERAL.DOUBLE_INDICATOR || token.type === ApexTokenTypes.LITERAL.INTEGER || token.type === ApexTokenTypes.LITERAL.LONG || token.type === ApexTokenTypes.LITERAL.LONG_INDICATOR || token.type === ApexTokenTypes.LITERAL.NULL || token.type === ApexTokenTypes.LITERAL.TIME;
}

function isStringToken(token: Token): boolean {
    return token.type === ApexTokenTypes.LITERAL.STRING || token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_START || token.type === ApexTokenTypes.PUNCTUATION.QUOTTES_END;
}

function isCommentToken(token: Token): boolean {
    return token.type === ApexTokenTypes.COMMENT.CONTENT || token.type === ApexTokenTypes.COMMENT.BLOCK_START || token.type === ApexTokenTypes.COMMENT.BLOCK_END || token.type === ApexTokenTypes.COMMENT.LINE || token.type === ApexTokenTypes.COMMENT.LINE_DOC;
}

function isDependentFlowStructure(token: Token): boolean {
    return token.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.WHILE_DO || token.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.ELSE || token.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.ELSE_IF || token.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.CATCH || token.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.FINALLY;
}

function isLogicalOperator(token: Token) {
    switch (token.type) {
        case ApexTokenTypes.OPERATOR.LOGICAL.AND:
        case ApexTokenTypes.OPERATOR.LOGICAL.OR:
            return true;
        default:
            return false;
    }
}

function isCompareOperator(token: Token) {
    switch (token.type) {
        case ApexTokenTypes.OPERATOR.LOGICAL.EQUALITY:
        case ApexTokenTypes.OPERATOR.LOGICAL.EQUALITY_EXACT:
        case ApexTokenTypes.OPERATOR.LOGICAL.GREATER_THAN:
        case ApexTokenTypes.OPERATOR.LOGICAL.GREATER_THAN_EQUALS:
        case ApexTokenTypes.OPERATOR.LOGICAL.INEQUALITY:
        case ApexTokenTypes.OPERATOR.LOGICAL.INEQUALITY_EXACT:
        case ApexTokenTypes.OPERATOR.LOGICAL.LESS_THAN:
        case ApexTokenTypes.OPERATOR.LOGICAL.LESS_THAN_EQUALS:
            return true;
        default:
            return false;
    }
}

function isOperator(token: Token): boolean {
    switch (token.type) {
        case ApexTokenTypes.OPERATOR.ARITHMETIC.ADD:
        case ApexTokenTypes.OPERATOR.ARITHMETIC.ADD_ASSIGN:
        case ApexTokenTypes.OPERATOR.ARITHMETIC.DIVIDE:
        case ApexTokenTypes.OPERATOR.ARITHMETIC.DIVIDE_ASSIGN:
        case ApexTokenTypes.OPERATOR.ARITHMETIC.MULTIPLY:
        case ApexTokenTypes.OPERATOR.ARITHMETIC.MULTIPLY_ASSIGN:
        case ApexTokenTypes.OPERATOR.ARITHMETIC.SUBSTRACT:
        case ApexTokenTypes.OPERATOR.ARITHMETIC.SUBSTRACT_ASSIGN:
        case ApexTokenTypes.OPERATOR.ASSIGN.ASSIGN:
        case ApexTokenTypes.OPERATOR.ASSIGN.MAP_KEY_VALUE:
        case ApexTokenTypes.OPERATOR.BITWISE.AND:
        case ApexTokenTypes.OPERATOR.BITWISE.EXCLUSIVE_OR:
        case ApexTokenTypes.OPERATOR.BITWISE.EXCLUSIVE_OR_ASSIGN:
        case ApexTokenTypes.OPERATOR.BITWISE.LEFT_ASSIGN:
        case ApexTokenTypes.OPERATOR.BITWISE.OR:
        case ApexTokenTypes.OPERATOR.BITWISE.SIGNED_LEFT:
        case ApexTokenTypes.OPERATOR.BITWISE.SIGNED_RIGHT:
        case ApexTokenTypes.OPERATOR.BITWISE.SIGNED_RIGTH_ASSIGN:
        case ApexTokenTypes.OPERATOR.BITWISE.UNSIGNED_RIGHT:
        case ApexTokenTypes.OPERATOR.BITWISE.UNSIGNED_RIGHT_ASSIGN:
        case ApexTokenTypes.OPERATOR.LOGICAL.AND:
        case ApexTokenTypes.OPERATOR.LOGICAL.AND_ASSIGN:
        case ApexTokenTypes.OPERATOR.LOGICAL.EQUALITY:
        case ApexTokenTypes.OPERATOR.LOGICAL.EQUALITY_EXACT:
        case ApexTokenTypes.OPERATOR.LOGICAL.GREATER_THAN:
        case ApexTokenTypes.OPERATOR.LOGICAL.GREATER_THAN_EQUALS:
        case ApexTokenTypes.OPERATOR.LOGICAL.INEQUALITY:
        case ApexTokenTypes.OPERATOR.LOGICAL.INEQUALITY_EXACT:
        case ApexTokenTypes.OPERATOR.LOGICAL.LESS_THAN:
        case ApexTokenTypes.OPERATOR.LOGICAL.LESS_THAN_EQUALS:
        case ApexTokenTypes.OPERATOR.LOGICAL.OR:
        case ApexTokenTypes.OPERATOR.LOGICAL.OR_ASSIGN:
        case ApexTokenTypes.PUNCTUATION.EXMARK:
        case ApexTokenTypes.PUNCTUATION.COLON:
            return true;
        default:
            return false;
    }
}

function isDatatype(token: Token): boolean {
    switch (token.type) {
        case ApexTokenTypes.DATATYPE.PRIMITIVE:
        case ApexTokenTypes.DATATYPE.COLLECTION:
        case ApexTokenTypes.DATATYPE.SOBJECT:
        case ApexTokenTypes.DATATYPE.CUSTOM_CLASS:
        case ApexTokenTypes.DATATYPE.SUPPORT_CLASS:
        case ApexTokenTypes.DATATYPE.SUPPORT_NAMESPACE:
            return true;
        default:
            return false;
    }
}

function isQueryFunction(token: Token): boolean {
    switch (token.type) {
        case ApexTokenTypes.QUERY.FUNCTION:
            return true;
        default:
            return false;
    }
}

function isQueryClause(token: Token): boolean {
    switch (token.type) {
        case ApexTokenTypes.QUERY.CLAUSE.SELECT:
        case ApexTokenTypes.QUERY.CLAUSE.FROM:
        case ApexTokenTypes.QUERY.CLAUSE.WHERE:
        case ApexTokenTypes.QUERY.CLAUSE.TYPE_OF:
        case ApexTokenTypes.QUERY.CLAUSE.WHEN:
        case ApexTokenTypes.QUERY.CLAUSE.ELSE:
        case ApexTokenTypes.QUERY.CLAUSE.THEN:
        case ApexTokenTypes.QUERY.CLAUSE.FOR:
        case ApexTokenTypes.QUERY.CLAUSE.GROUP_BY:
        case ApexTokenTypes.QUERY.CLAUSE.HAVING:
        case ApexTokenTypes.QUERY.CLAUSE.END:
        case ApexTokenTypes.QUERY.CLAUSE.FIND:
        case ApexTokenTypes.QUERY.CLAUSE.LIMIT:
        case ApexTokenTypes.QUERY.CLAUSE.NULLS:
        case ApexTokenTypes.QUERY.CLAUSE.OFFSET:
        case ApexTokenTypes.QUERY.CLAUSE.ORDER_BY:
        case ApexTokenTypes.QUERY.CLAUSE.USING_SCOPE:
        case ApexTokenTypes.QUERY.CLAUSE.WITH:
            return true;
        default:
            return false;
    }
}

function isInitializer(token: Token): boolean {
    return token.type === ApexTokenTypes.BRACKET.INITIALIZER_OPEN;
}

function isOnSameLine(tokenA: Token, tokenB: Token): boolean {
    return tokenA && tokenB && tokenA.range.start.line === tokenB.range.start.line;
}

function isFieldInstructionDeclaration(tokens: Token[], index: number): boolean {
    let token = tokens[index];
    for (; index >= 0; index--) {
        token = tokens[index];
        if (isFieldDeclaration(token)) {
            return true;
        }
        if (token.type === ApexTokenTypes.BRACKET.CURLY_CLOSE || token.type === ApexTokenTypes.BRACKET.CURLY_OPEN) {
            break;
        }
    }
    return false;
}

function isNextInstructionFieldDeclaration(tokens: Token[], index: number): boolean {
    let token = tokens[index];
    for (let len = tokens.length; index < len; index++) {
        token = tokens[index];
        if (isFieldDeclaration(token)) {
            return true;
        }
        if (token.type === ApexTokenTypes.PUNCTUATION.SEMICOLON) {
            break;
        }
    }
    return false;
}

function isAnnotationToken(token: Token): boolean {
    switch (token.type) {
        case ApexTokenTypes.BRACKET.ANNOTATION_PARAM_OPEN:
        case ApexTokenTypes.BRACKET.ANNOTATION_PARAM_CLOSE:
        case ApexTokenTypes.ANNOTATION.CONTENT:
        case ApexTokenTypes.ANNOTATION.ENTITY:
        case ApexTokenTypes.ANNOTATION.NAME:
            return true;
        default:
            return false;
    }
}

function isFieldDeclaration(token: Token): boolean {
    return token.type === ApexTokenTypes.DECLARATION.ENTITY.VARIABLE;
}

function isMemberDeclaration(token: Token): boolean {
    switch (token.type) {
        case ApexTokenTypes.DECLARATION.ENTITY.FUNCTION:
        case ApexTokenTypes.DECLARATION.ENTITY.PROPERTY:
        case ApexTokenTypes.DECLARATION.ENTITY.VARIABLE:
            return true;
        default:
            return false;
    }
}

function isUnaryOperator(token: Token): boolean {
    switch (token.type) {
        case ApexTokenTypes.OPERATOR.ARITHMETIC.POSITIVE:
        case ApexTokenTypes.OPERATOR.ARITHMETIC.DECREMENT:
        case ApexTokenTypes.OPERATOR.ARITHMETIC.INCREMENT:
        case ApexTokenTypes.OPERATOR.ARITHMETIC.NEGATIVE:
            return true;
        default:
            return false;
    }
}

function isKeyword(token: Token): boolean {
    switch (token.type) {
        case ApexTokenTypes.KEYWORD.OTHER:
        case ApexTokenTypes.KEYWORD.DECLARATION.CLASS:
        case ApexTokenTypes.KEYWORD.DECLARATION.ENUM:
        case ApexTokenTypes.KEYWORD.DECLARATION.EXTENDS:
        case ApexTokenTypes.KEYWORD.DECLARATION.IMPLEMENTS:
        case ApexTokenTypes.KEYWORD.DECLARATION.INTERFACE:
        case ApexTokenTypes.DECLARATION.ENTITY.CLASS:
        case ApexTokenTypes.DECLARATION.ENTITY.ENUM:
        case ApexTokenTypes.DECLARATION.ENTITY.INTERFACE:
        case ApexTokenTypes.KEYWORD.DECLARATION.INTERFACE:
        case ApexTokenTypes.KEYWORD.DECLARATION.TRIGGER:
        case ApexTokenTypes.KEYWORD.MODIFIER.ACCESS:
        case ApexTokenTypes.KEYWORD.MODIFIER.DEFINITION:
        case ApexTokenTypes.KEYWORD.MODIFIER.FINAL:
        case ApexTokenTypes.KEYWORD.MODIFIER.OVERRIDE:
        case ApexTokenTypes.KEYWORD.MODIFIER.SHARING:
        case ApexTokenTypes.KEYWORD.MODIFIER.STATIC:
        case ApexTokenTypes.KEYWORD.MODIFIER.TEST_METHOD:
        case ApexTokenTypes.KEYWORD.MODIFIER.TRANSIENT:
        case ApexTokenTypes.KEYWORD.MODIFIER.WEB_SERVICE:
        case ApexTokenTypes.KEYWORD.OBJECT.NEW:
        case ApexTokenTypes.DATABASE.TRIGGER_EXEC:
        case ApexTokenTypes.DATABASE.DML:
        case ApexTokenTypes.KEYWORD.FLOW_CONTROL.BREAK:
        case ApexTokenTypes.KEYWORD.FLOW_CONTROL.SWITCH:
        case ApexTokenTypes.KEYWORD.FLOW_CONTROL.SWITCH_CASE:
        case ApexTokenTypes.KEYWORD.FLOW_CONTROL.CONTINUE:
        case ApexTokenTypes.KEYWORD.FLOW_CONTROL.RETURN:
        case ApexTokenTypes.KEYWORD.FLOW_CONTROL.THROW:
            return true;
        default:
            return false;
    }
}

function isEmptyProperty(tokens: Token[], index: number): boolean {
    let isEmptyProperty = true;
    for (; index < tokens.length; index++) {
        let token = tokens[index];
        let nextToken = LanguageUtils.getNextToken(tokens, index);
        if ((token.type === ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_GETTER || token.type === ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_SETTER) && nextToken && nextToken.type !== ApexTokenTypes.PUNCTUATION.SEMICOLON) {
            isEmptyProperty = false;
            break;
        }
        if (token.type === ApexTokenTypes.BRACKET.CURLY_CLOSE) {
            break;
        }
    }
    return isEmptyProperty;
}