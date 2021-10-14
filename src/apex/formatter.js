const TokenType = require('./tokenTypes');
const { StrUtils, Utils, Validator } = require('@aurahelper/core').CoreUtils;
const { WrongDatatypeException } = require('@aurahelper/core').Exceptions;
const { ApexFormatterConfig } = require('@aurahelper/core').Types;
const { PathUtils, FileReader } = require('@aurahelper/core').FileSystem;
const LangUtils = require('../utils/languageUtils');
const Lexer = require('./tokenizer');

/**
 * Class to format any Apex Class with a selected configuration to format code as you want
 */
class ApexFormatter {

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
     * @param {String | Array<Token>} tokensOrContent Class file path or String file content or Apex Class Tokens (Use ApexTokenizer)
     * @param {(ApexFormatterConfig | Object)} [config] Apex formatter config object or VSCode Config JSON object
     * @param {Object} [systemData] System data like System Apex Classes or Namespaces to tokenize apex class if pathContentOrTokens is a class content or file path. Can get it with System Class from System Module
     * 
     * @returns {String} Returns the Apex Class content formatted 
     * 
     * @throws {WrongDatatypeException} If pathContentOrTokens datatype is not an String, path or file tokens
     * @throws {WrongFilePathException} If the file Path is not a String or can't convert to absolute path
     * @throws {FileNotFoundException} If the file not exists or not have access to it
     * @throws {InvalidFilePathException} If the path is not a file
     */
    static format(tokensOrContent, config, systemData, tabSize, insertSpaces) {
        let tokens;
        if (Utils.isArray(tokensOrContent)) {
            tokens = tokensOrContent;
        } else if (Utils.isString(tokensOrContent)) {
            const content = tokensOrContent;
            tokens = Lexer.tokenize(content, systemData, tabSize);
        } else {
            throw new WrongDatatypeException('You must to select a file path, file content or file tokens');
        }
        config = new ApexFormatterConfig(config);
        return formatApex(tokens, config, tabSize, insertSpaces);
    }
}
module.exports = ApexFormatter;

function formatApex(tokens, config, tabSize, insertSpaces) {
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
    let projectionFieldsOnLine = [];
    for (let len = tokens.length, index = 0; index < len; index++) {
        let token = tokens[index];
        let lastToken = LangUtils.getLastToken(tokens, index);
        let twoLastToken = LangUtils.getTwoLastToken(tokens, index);
        let nextToken = LangUtils.getNextToken(tokens, index);
        let newLines = 0;
        let originalNewLines = (lastToken && !token.isAux && !lastToken.isAux) ? token.range.start.line - lastToken.range.start.line : 0;
        if (token.type === TokenType.BRACKET.CURLY_OPEN || token.type === TokenType.BRACKET.INITIALIZER_OPEN) {
            indent++;
        } else if (token.type === TokenType.BRACKET.CURLY_CLOSE || token.type === TokenType.BRACKET.INITIALIZER_CLOSE) {
            if (mainBodyIndent === indent)
                mainBodyIndent--;
            indent--;
        } else if (token.type === TokenType.BRACKET.PARENTHESIS_GUARD_OPEN) {
            guardOpen = true;
        } else if (token.type === TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE) {
            guardOpen = false;
        }
        if (lastToken && lastToken.type === TokenType.BRACKET.QUERY_START || lastToken && lastToken.type === TokenType.BRACKET.INNER_QUERY_START) {
            queryOpenIndex.push(StrUtils.replace(line, '\t', '    ').length - (indent * 4));
            projectionFieldsOnLine.push(0);
        }
        if (token.type === TokenType.BRACKET.INNER_QUERY_START) {
            if (config && config.query.maxProjectionFieldPerLine > 0) {
                if (projectionFieldsOnLine[projectionFieldsOnLine.length - 1] === config.query.maxProjectionFieldPerLine) {
                    newLines = 1;
                    beforeWhitespaces = querySelectIndex[querySelectIndex.length - 1];
                    projectionFieldsOnLine[projectionFieldsOnLine.length - 1] = 1;
                } else {
                    projectionFieldsOnLine[projectionFieldsOnLine.length - 1] = projectionFieldsOnLine[projectionFieldsOnLine.length - 1] + 1;
                }
            }
        }
        if (lastToken && lastToken.type === TokenType.QUERY.CLAUSE.SELECT) {
            querySelectIndex.push(StrUtils.replace(line, '\t', '    ').length - (indent * 4));
        }

        if (token.type === TokenType.KEYWORD.DECLARATION.CLASS || token.type === TokenType.KEYWORD.DECLARATION.ENUM || token.type === TokenType.KEYWORD.DECLARATION.INTERFACE)
            mainBodyIndent = indent + 1;

        if (lastToken && isAnnotationToken(lastToken) && !isAnnotationToken(token))
            newLines = 1;
        if (isCommentToken(token) && nextToken && isCommentToken(nextToken) && isOnSameLine(token, nextToken))
            afterWhitespaces = nextToken.range.start.character - token.range.end.character;
        if (isCommentToken(token) && lastToken && isCommentToken(lastToken) && !isOnSameLine(token, lastToken))
            newLines = (lastToken) ? token.range.start.line - lastToken.range.start.line : 0;
        if (lastToken && isCommentToken(lastToken) && !isCommentToken(token) && !isOnSameLine(token, lastToken))
            newLines = 1;
        if (lastToken && !isCommentToken(lastToken) && isCommentToken(token) && isOnSameLine(token, lastToken) && config && config.comment.holdBeforeWhitespacesOnLineComment)
            beforeWhitespaces = token.range.start.character - lastToken.range.end.character;
        if (lastToken && isCommentToken(lastToken) && !isCommentToken(token) && isOnSameLine(token, lastToken) && config && config.comment.holdAfterWhitespacesOnLineComment)
            afterWhitespaces = token.range.start.character - lastToken.range.end.character;
        if (lastToken && isCommentToken(lastToken) && (token.type === TokenType.COMMENT.BLOCK_START || token.type === TokenType.COMMENT.LINE || token.type === TokenType.COMMENT.LINE_DOC) && !isOnSameLine(token, lastToken))
            newLines = (config) ? config.comment.newLinesBewteenComments + 1 : 1;
        if (isStringToken(token) && nextToken && isStringToken(nextToken) && isOnSameLine(token, nextToken)) {
            afterWhitespaces = nextToken.range.start.character - token.range.end.character;
            if (!strIndex)
                strIndex = token.range.start.character;
        }
        if (lastToken && (lastToken.type === TokenType.BRACKET.CURLY_OPEN || lastToken.type === TokenType.BRACKET.INITIALIZER_OPEN))
            newLines = 1;
        if (lastToken && (lastToken.type === TokenType.BRACKET.CURLY_CLOSE || lastToken.type === TokenType.BRACKET.INITIALIZER_CLOSE))
            newLines = 1;
        if (lastToken && lastToken.type === TokenType.BRACKET.CURLY_CLOSE && lastToken.isAux && token.type === TokenType.BRACKET.CURLY_CLOSE && token.isAux)
            newLines = 0;
        else if (token.type === TokenType.BRACKET.CURLY_CLOSE && !token.isAux)
            newLines = 1;
        if (!token.isAux && token.type === TokenType.BRACKET.CURLY_OPEN && config && config.punctuation.addWhitespaceBeforeOpenCurlyBracket && !config.punctuation.openCurlyBracketOnNewLine)
            beforeWhitespaces = 1;
        if (!token.isAux && token.type === TokenType.BRACKET.CURLY_OPEN && config && config.punctuation.openCurlyBracketOnNewLine) {
            newLines = 1;
            indentOffset = -1;
        }
        if (lastToken && lastToken.type === TokenType.PUNCTUATION.SEMICOLON && !guardOpen && token.type !== TokenType.BRACKET.CURLY_CLOSE) {
            strIndex = undefined;
            if (isCommentToken(token) && isOnSameLine(token, lastToken)) {
                if (config && config.comment.holdAfterWhitespacesOnLineComment)
                    beforeWhitespaces = token.range.start.character - lastToken.range.end.character;
                else
                    beforeWhitespaces = 1;
            } else {
                newLines = 1;
            }
        }
        else if (lastToken && lastToken.type === TokenType.PUNCTUATION.SEMICOLON && guardOpen)
            beforeWhitespaces = 1;
        if (lastToken && lastToken.type === TokenType.BRACKET.CURLY_CLOSE && lastToken.parentToken && config && config.punctuation.addNewLineAfterCloseCurlyBracket)
            newLines = 1;
        else if (lastToken && lastToken.type === TokenType.BRACKET.CURLY_CLOSE && !lastToken.isAux && lastToken.parentToken && config && !config.punctuation.addNewLineAfterCloseCurlyBracket && isDependentFlowStructure(token)) {
            newLines = 0;
            if (config && config.punctuation.addWhitespaceAfterCloseCurlyBracket)
                beforeWhitespaces = 1;
        }
        if (token.type === TokenType.BRACKET.TRIGGER_GUARD_OPEN && config && config.punctuation.addWhitespaceBeforeOpenTriggerEvents)
            beforeWhitespaces = 1;
        if (token.type === TokenType.PUNCTUATION.COMMA && config && config.punctuation.addWhiteSpaceAfterComma)
            afterWhitespaces = 1;
        if (mainBodyIndent === indent && lastToken && ((lastToken.type === TokenType.BRACKET.CURLY_CLOSE && !lastToken.isAux && (!lastToken.parentToken || !lastToken.parentToken.parentToken)) || (lastToken.type === TokenType.PUNCTUATION.SEMICOLON && twoLastToken && twoLastToken.type === TokenType.BRACKET.PARENTHESIS_PARAM_CLOSE)) && config && config.classMembers.newLinesBetweenCodeBlockMembers > 0 && token.type !== TokenType.BRACKET.CURLY_CLOSE && token.type !== TokenType.KEYWORD.DECLARATION.PROPERTY_GETTER && token.type !== TokenType.KEYWORD.DECLARATION.PROPERTY_SETTER) {
            newLines = (config) ? config.classMembers.newLinesBetweenCodeBlockMembers + 1 : 1;
            if (isFieldInstructionDeclaration(tokens, index)) {
                if (isNextInstructionFieldDeclaration(tokens, index))
                    newLines = (config) ? config.classMembers.newLinesBetweenClassFields + 1 : 1;
                else
                    newLines = (config) ? config.classMembers.newLinesBetweenCodeBlockMembers + 1 : 1;
            }
        }
        if (lastToken && (lastToken.type === TokenType.BRACKET.CURLY_CLOSE || lastToken.type === TokenType.PUNCTUATION.SEMICOLON) && !lastToken.isAux && (token.type === TokenType.KEYWORD.DECLARATION.PROPERTY_GETTER || token.type === TokenType.KEYWORD.DECLARATION.PROPERTY_SETTER) && config && config.classMembers.newLinesBetweenGetterAndSetterAccessor > 0)
            newLines = (config) ? config.classMembers.newLinesBetweenGetterAndSetterAccessor + 1 : 1;
        if (isKeyword(token) && nextToken && nextToken.type !== TokenType.BRACKET.CURLY_OPEN && nextToken.type !== TokenType.PUNCTUATION.COMMA && nextToken.type !== TokenType.BRACKET.TRIGGER_GUARD_CLOSE && nextToken.type !== TokenType.PUNCTUATION.SEMICOLON) {
            afterWhitespaces = 1;
            if (lastToken && lastToken.type === TokenType.BRACKET.PARAMETRIZED_TYPE_CLOSE)
                beforeWhitespaces = 1;
        }
        if (isMemberDeclaration(token) && lastToken && lastToken.type !== TokenType.PUNCTUATION.COMMA)
            beforeWhitespaces = 1;
        if (twoLastToken && isFieldDeclaration(twoLastToken) && lastToken && lastToken.type === TokenType.PUNCTUATION.SEMICOLON && isNextInstructionFieldDeclaration(tokens, index) && config && config.classMembers.newLinesBetweenClassFields > 0 && mainBodyIndent === indent)
            newLines = (config) ? config.classMembers.newLinesBetweenClassFields + 1 : 1;
        else if (twoLastToken && isFieldDeclaration(twoLastToken) && lastToken && lastToken.type === TokenType.PUNCTUATION.SEMICOLON && !isNextInstructionFieldDeclaration(tokens, index) && mainBodyIndent === indent)
            newLines = (config) ? config.classMembers.newLinesBetweenCodeBlockMembers + 1 : 1;
        if (lastToken && lastToken.type === TokenType.PUNCTUATION.COMMA && twoLastToken && twoLastToken.type === TokenType.ENTITY.ENUM_VALUE && token.type !== TokenType.COMMENT.LINE && token.type !== TokenType.COMMENT.LINE_DOC)
            newLines = 1;
        if (isKeyword(token) && lastToken && lastToken.type === TokenType.DECLARATION.ENTITY.VARIABLE)
            beforeWhitespaces = 1;
        if (isQueryClause(token) && config && config.query.oneClausePerLine && lastToken && lastToken.type !== TokenType.BRACKET.QUERY_START && lastToken.type !== TokenType.BRACKET.INNER_QUERY_START) {
            newLines = 1;
            beforeWhitespaces = queryOpenIndex[queryOpenIndex.length - 1];
        } else if(isQueryClause(token) && lastToken && lastToken.type !== TokenType.BRACKET.QUERY_START && lastToken.type !== TokenType.BRACKET.INNER_QUERY_START){
            beforeWhitespaces = 1;
        }
        if (isQueryClause(token)) {
            afterWhitespaces = 1;
        }
        if (token.type === TokenType.QUERY.OPERATOR && lastToken && lastToken.type !== TokenType.QUERY.OPERATOR) {
            beforeWhitespaces = 1;
        }
        if (token.type === TokenType.QUERY.OPERATOR && nextToken && nextToken.type !== TokenType.QUERY.VALUE_BIND) {
            afterWhitespaces = 1;
        }
        if (lastToken && isQueryClause(lastToken) && token.type === TokenType.DATATYPE.SOBJECT)
            afterWhitespaces = 1;
        if (lastToken && isQueryFunction(lastToken) && token.type === TokenType.DATATYPE.SOBJECT)
            beforeWhitespaces = 1;
        if (lastToken && (isLiteral(lastToken) || lastToken.type === TokenType.ENTITY.SOBJECT_FIELD || lastToken.type === TokenType.ENTITY.SOBJECT_PROJECTION_FIELD || lastToken.type === TokenType.PUNCTUATION.QUOTTES_END || lastToken.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_CLOSE || lastToken.type === TokenType.ENTITY.VARIABLE) && isQueryClause(token) && newLines === 0)
            beforeWhitespaces = 1;
        if (lastToken && lastToken.type === TokenType.QUERY.CLAUSE.SELECT && config && config.query.maxProjectionFieldPerLine > 0) {
            if (config && projectionFieldsOnLine[projectionFieldsOnLine.length - 1] === config.query.maxProjectionFieldPerLine) {
                newLines = 1;
                beforeWhitespaces = querySelectIndex[querySelectIndex.length - 1];
                projectionFieldsOnLine[projectionFieldsOnLine.length - 1] = 1;
            } else {
                projectionFieldsOnLine[projectionFieldsOnLine.length - 1] = projectionFieldsOnLine[projectionFieldsOnLine.length - 1] + 1;
            }
        }
        if (twoLastToken && twoLastToken.type === TokenType.ENTITY.SOBJECT_PROJECTION_FIELD && lastToken && (lastToken.type === TokenType.PUNCTUATION.COMMA) && config && config.query.maxProjectionFieldPerLine > 0) {
            if (config && projectionFieldsOnLine[projectionFieldsOnLine.length - 1] === config.query.maxProjectionFieldPerLine) {
                newLines = 1;
                beforeWhitespaces = querySelectIndex[querySelectIndex.length - 1];
                projectionFieldsOnLine[projectionFieldsOnLine.length - 1] = 1;
            } else {
                projectionFieldsOnLine[projectionFieldsOnLine.length - 1] = projectionFieldsOnLine[projectionFieldsOnLine.length - 1] + 1;
            }
        }
        if (token.type === TokenType.QUERY.VALUE_BIND && lastToken && lastToken !== TokenType.QUERY.OPERATOR && !isOperator(lastToken) && !isKeyword(lastToken) && !isQueryClause(lastToken)) {
            beforeWhitespaces = 1;
        }
        if ((isOperator(token) || (token.type === TokenType.ANNOTATION.CONTENT && token.text === '=')) && config && config.operator.addWhitespaceBeforeOperator)
            beforeWhitespaces = 1;
        if ((isOperator(token) || (token.type === TokenType.ANNOTATION.CONTENT && token.text === '=')) && config && config.operator.addWhitespaceAfterOperator)
            afterWhitespaces = 1;
        if (token.type === TokenType.OPERATOR.ARITHMETIC.INCREMENT && nextToken && (nextToken.type === TokenType.ENTITY.VARIABLE)) {
            afterWhitespaces = 0;
        }
        if (token.type === TokenType.OPERATOR.ARITHMETIC.INCREMENT && lastToken && (lastToken.type === TokenType.ENTITY.VARIABLE)) {
            beforeWhitespaces = 0;
            if (nextToken && (nextToken.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_OPEN || nextToken.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_CLOSE || nextToken.type === TokenType.PUNCTUATION.SEMICOLON || nextToken.type === TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE || nextToken.type === TokenType.BRACKET.PARENTHESIS_GUARD_OPEN))
                afterWhitespaces = 0;
        }
        if (token.type === TokenType.OPERATOR.ARITHMETIC.DECREMENT && nextToken && (nextToken.type === TokenType.ENTITY.VARIABLE)) {
            afterWhitespaces = 0;
        }
        if (token.type === TokenType.OPERATOR.ARITHMETIC.DECREMENT && lastToken && (lastToken.type === TokenType.ENTITY.VARIABLE)) {
            beforeWhitespaces = 0;
        }
        if (token.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_OPEN && config && config.operator.addWhitespaceAfterOpenParenthesisOperator)
            afterWhitespaces = 1;
        if (token.type === TokenType.OPERATOR.PRIORITY.PARENTHESIS_CLOSE && config && config.operator.addWhitespaceBeforeCloseParenthesisOperator)
            beforeWhitespaces = 1;
        if (token.type === TokenType.BRACKET.PARENTHESIS_GUARD_OPEN && config && config.punctuation.addWhitespaceBeforeOpenGuardParenthesis)
            beforeWhitespaces = 1;
        if (token.type === TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE && config && config.punctuation.addWhitespaceBeforeCloseGuardParenthesis)
            beforeWhitespaces = 1;
        if (token.type === TokenType.BRACKET.PARENTHESIS_GUARD_OPEN && config && config.punctuation.addWhitespaceAfterOpenGuardParenthesis)
            afterWhitespaces = 1;
        if (token.type === TokenType.BRACKET.PARENTHESIS_GUARD_CLOSE && config && config.punctuation.addWhitespaceBeforeCloseGuardParenthesis)
            beforeWhitespaces = 1;
        if (token.type === TokenType.ENTITY.SOBJECT_PROJECTION_FIELD && nextToken && nextToken.type === TokenType.ENTITY.SOBJECT_PROJECTION_FIELD)
            afterWhitespaces = 1;
        if (token.type === TokenType.ENTITY.SOBJECT_PROJECTION_FIELD && nextToken && nextToken.type === TokenType.ENTITY.ALIAS_FIELD)
            afterWhitespaces = 1;
        if (token.type === TokenType.QUERY.SCOPE_VALUE || token.type === TokenType.QUERY.NULLS_VALUE || token.type === TokenType.QUERY.ORDER)
            beforeWhitespaces = 1;
        if (token.type === TokenType.PUNCTUATION.OBJECT_ACCESSOR) {
            afterWhitespaces = 0;
            beforeWhitespaces = 0;
        }
        if (lastToken && lastToken.type === TokenType.PUNCTUATION.OBJECT_ACCESSOR)
            beforeWhitespaces = 0;
        if (nextToken && nextToken.type === TokenType.PUNCTUATION.OBJECT_ACCESSOR)
            afterWhitespaces = 0;
        if (token.type === TokenType.OPERATOR.LOGICAL.INSTANCE_OF) {
            afterWhitespaces = 1;
            beforeWhitespaces = 1;
        }
        if (token && token.type === TokenType.BRACKET.INIT_VALUES_OPEN)
            afterWhitespaces = 1;
        if (token && token.type === TokenType.BRACKET.INIT_VALUES_CLOSE)
            beforeWhitespaces = 1;
        if (token.type === TokenType.BRACKET.CASTING_OPEN) {
            afterWhitespaces = 0;
        } else if (isDatatype(token) && lastToken && lastToken.type === TokenType.BRACKET.CASTING_OPEN && nextToken && nextToken.type === TokenType.BRACKET.CASTING_CLOSE) {
            afterWhitespaces = 0;
            beforeWhitespaces = 0;
        } else if (token.type === TokenType.BRACKET.CASTING_CLOSE) {
            beforeWhitespaces = 0;
            afterWhitespaces = 1;
        }
        if (lastToken && lastToken.type === TokenType.PUNCTUATION.COMMA && isCommentToken(token) && originalNewLines > 0) {
            newLines = 1;
        }
        if ((lastToken && isOperator(lastToken) && isStringToken(token) && originalNewLines > 0) || complexString) {
            complexString = false;
            if (strIndex) {
                let rest = strIndex % 4;
                indentOffset = (strIndex - (indent * 4)) / 4;
                if (rest > 0) {
                    indentOffset -= 1;
                    beforeWhitespaces = rest - 1;
                }
            }
            newLines = 1;
        }
        if (lastToken && isStringToken(lastToken) && isOperator(token) && originalNewLines > 0) {
            newLines = 0;
            complexString = true;
        }
        if (token.type === TokenType.BRACKET.QUERY_END || token.type === TokenType.BRACKET.INNER_QUERY_END) {
            querySelectIndex.pop();
            queryOpenIndex.pop();
            projectionFieldsOnLine.pop();
        }
        if (indent > 0 && indent !== mainBodyIndent && token.type !== TokenType.KEYWORD.DECLARATION.PROPERTY_GETTER && token.type !== TokenType.KEYWORD.DECLARATION.PROPERTY_SETTER) {
            if (newLines > 0 && originalNewLines > 1) {
                if (config && config.punctuation.maxBlankLines === -1)
                    newLines = originalNewLines;
                else if (config && config.punctuation.maxBlankLines === 0)
                    newLines = 1;
                else if (config && config.punctuation.maxBlankLines > 0 && originalNewLines > config.punctuation.maxBlankLines) {
                    newLines = config.punctuation.maxBlankLines + 1;
                } else if (config && config.punctuation.maxBlankLines > 0 && originalNewLines <= config.punctuation.maxBlankLines) {
                    newLines = originalNewLines;
                }
            }
        }
        if (lastToken && lastToken.type === TokenType.DECLARATION.ENTITY.PROPERTY) {
            onProperty = true;
            emptyProperty = isEmptyProperty(tokens, index);
        }
        if (token.type === TokenType.BRACKET.CURLY_CLOSE && onProperty && emptyProperty && config && config.classMembers.singleLineProperties) {
            onProperty = false;
            emptyProperty = false;
            newLines = 0;
            beforeWhitespaces = 1;
        }
        if (onProperty && emptyProperty && config && config.classMembers.singleLineProperties) {
            newLines = 0;
            if (token.type === TokenType.KEYWORD.DECLARATION.PROPERTY_GETTER || token.type === TokenType.KEYWORD.DECLARATION.PROPERTY_SETTER) {
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
            if (newLines > 1)
                line += StrUtils.getNewLines(newLines - 1);
            lines += line + '\n';
            line = '';
            if (!insertSpaces)
                line += StrUtils.getTabs(indent + indentOffset);
            else
                line += StrUtils.getWhitespaces((indent + indentOffset) * tabSize);

            if (token.type === TokenType.COMMENT.CONTENT || token.type === TokenType.COMMENT.BLOCK_END)
                beforeWhitespaces = 1;
            if (!token.isAux) {
                if (beforeWhitespaces > 0)
                    line += StrUtils.getWhitespaces(beforeWhitespaces);
                line += token.text;
                if (afterWhitespaces > 0)
                    line += StrUtils.getWhitespaces(afterWhitespaces);
            }
            beforeWhitespaces = 0;
            afterWhitespaces = 0;
            newLines = 0;
            indentOffset = 0;
        } else {
            if (!token.isAux) {
                if (beforeWhitespaces > 0)
                    line += StrUtils.getWhitespaces(beforeWhitespaces);
                line += token.text;
                if (afterWhitespaces > 0)
                    line += StrUtils.getWhitespaces(afterWhitespaces);
            }
            beforeWhitespaces = 0;
            afterWhitespaces = 0;
            indentOffset = 0;
        }
    }
    lines += line;
    return lines;
}

function isLiteral(token) {
    return token.type === TokenType.LITERAL.BOOLEAN || token.type === TokenType.LITERAL.DATE || token.type === TokenType.LITERAL.DATETIME || token.type === TokenType.LITERAL.DATE_PARAMETRIZED || token.type === TokenType.LITERAL.DATE_PARAMETRIZED_START_PARAM || token.type === TokenType.LITERAL.DOUBLE || token.type === TokenType.LITERAL.DOUBLE_INDICATOR || token.type === TokenType.LITERAL.INTEGER || token.type === TokenType.LITERAL.LONG || token.type === TokenType.LITERAL.LONG_INDICATOR || token.type === TokenType.LITERAL.NULL || token.type === TokenType.LITERAL.TIME;
}

function isStringToken(token) {
    return token.type === TokenType.LITERAL.STRING || token.type === TokenType.PUNCTUATION.QUOTTES_START || token.type === TokenType.PUNCTUATION.QUOTTES_END;
}

function isCommentToken(token) {
    return token.type === TokenType.COMMENT.CONTENT || token.type === TokenType.COMMENT.BLOCK_START || token.type === TokenType.COMMENT.BLOCK_END || token.type === TokenType.COMMENT.LINE || token.type === TokenType.COMMENT.LINE_DOC;
}

function isDependentFlowStructure(token) {
    return token.type === TokenType.KEYWORD.FLOW_CONTROL.WHILE_DO || token.type === TokenType.KEYWORD.FLOW_CONTROL.ELSE || token.type === TokenType.KEYWORD.FLOW_CONTROL.ELSE_IF || token.type === TokenType.KEYWORD.FLOW_CONTROL.CATCH || token.type === TokenType.KEYWORD.FLOW_CONTROL.FINALLY
}

function isOperator(token) {
    switch (token.type) {
        case TokenType.OPERATOR.ARITHMETIC.ADD:
        case TokenType.OPERATOR.ARITHMETIC.ADD_ASSIGN:
        case TokenType.OPERATOR.ARITHMETIC.DIVIDE:
        case TokenType.OPERATOR.ARITHMETIC.DIVIDE_ASSIGN:
        case TokenType.OPERATOR.ARITHMETIC.MULTIPLY:
        case TokenType.OPERATOR.ARITHMETIC.MULTIPLY_ASSIGN:
        case TokenType.OPERATOR.ARITHMETIC.SUBSTRACT:
        case TokenType.OPERATOR.ARITHMETIC.SUBSTRACT_ASSIGN:
        case TokenType.OPERATOR.ASSIGN.ASSIGN:
        case TokenType.OPERATOR.ASSIGN.MAP_KEY_VALUE:
        case TokenType.OPERATOR.BITWISE.AND:
        case TokenType.OPERATOR.BITWISE.EXCLUSIVE_OR:
        case TokenType.OPERATOR.BITWISE.EXCLUSIVE_OR_ASSIGN:
        case TokenType.OPERATOR.BITWISE.LEFT_ASSIGN:
        case TokenType.OPERATOR.BITWISE.OR:
        case TokenType.OPERATOR.BITWISE.SIGNED_LEFT:
        case TokenType.OPERATOR.BITWISE.SIGNED_RIGHT:
        case TokenType.OPERATOR.BITWISE.SIGNED_RIGTH_ASSIGN:
        case TokenType.OPERATOR.BITWISE.UNSIGNED_RIGHT:
        case TokenType.OPERATOR.BITWISE.UNSIGNED_RIGHT_ASSIGN:
        case TokenType.OPERATOR.LOGICAL.AND:
        case TokenType.OPERATOR.LOGICAL.AND_ASSIGN:
        case TokenType.OPERATOR.LOGICAL.EQUALITY:
        case TokenType.OPERATOR.LOGICAL.EQUALITY_EXACT:
        case TokenType.OPERATOR.LOGICAL.GREATER_THAN:
        case TokenType.OPERATOR.LOGICAL.GREATER_THAN_EQUALS:
        case TokenType.OPERATOR.LOGICAL.INEQUALITY:
        case TokenType.OPERATOR.LOGICAL.INEQUALITY_EXACT:
        case TokenType.OPERATOR.LOGICAL.LESS_THAN:
        case TokenType.OPERATOR.LOGICAL.LESS_THAN_EQUALS:
        case TokenType.OPERATOR.LOGICAL.OR:
        case TokenType.OPERATOR.LOGICAL.OR_ASSIGN:
        case TokenType.PUNCTUATION.EXMARK:
        case TokenType.PUNCTUATION.COLON:
            return true;
        default:
            return false;
    }
}

function isDatatype(token) {
    switch (token.type) {
        case TokenType.DATATYPE.PRIMITIVE:
        case TokenType.DATATYPE.COLLECTION:
        case TokenType.DATATYPE.SOBJECT:
        case TokenType.DATATYPE.CUSTOM_CLASS:
        case TokenType.DATATYPE.SUPPORT_CLASS:
        case TokenType.DATATYPE.SUPPORT_NAMESPACE:
            return true;
        default:
            return false;
    }
}

function isQueryFunction(token) {
    switch (token.type) {
        case TokenType.QUERY.FUNCTION:
            return true;
        default:
            return false;
    }
}

function isQueryClause(token) {
    switch (token.type) {
        case TokenType.QUERY.CLAUSE.SELECT:
        case TokenType.QUERY.CLAUSE.FROM:
        case TokenType.QUERY.CLAUSE.WHERE:
        case TokenType.QUERY.CLAUSE.TYPE_OF:
        case TokenType.QUERY.CLAUSE.WHEN:
        case TokenType.QUERY.CLAUSE.ELSE:
        case TokenType.QUERY.CLAUSE.THEN:
        case TokenType.QUERY.CLAUSE.FOR:
        case TokenType.QUERY.CLAUSE.GROUP_BY:
        case TokenType.QUERY.CLAUSE.HAVING:
        case TokenType.QUERY.CLAUSE.END:
        case TokenType.QUERY.CLAUSE.FIND:
        case TokenType.QUERY.CLAUSE.LIMIT:
        case TokenType.QUERY.CLAUSE.NULLS:
        case TokenType.QUERY.CLAUSE.OFFSET:
        case TokenType.QUERY.CLAUSE.ORDER_BY:
        case TokenType.QUERY.CLAUSE.USING_SCOPE:
        case TokenType.QUERY.CLAUSE.WITH:
        case TokenType.QUERY:
            return true;
        default:
            return false;
    }
}

function isInitializer(token) {
    return token.type === TokenType.BRACKET.INITIALIZER_OPEN;
}

function isOnSameLine(tokenA, tokenB) {
    return tokenA && tokenB && tokenA.range.start.line === tokenB.range.start.line;
}

function isFieldInstructionDeclaration(tokens, index) {
    let token = tokens[index];
    for (; index >= 0; index--) {
        token = tokens[index];
        if (isFieldDeclaration(token))
            return true;
        if (token.type === TokenType.BRACKET.CURLY_CLOSE || token.type === TokenType.BRACKET.CURLY_OPEN)
            break;
    }
    return false;
}

function isNextInstructionFieldDeclaration(tokens, index) {
    let token = tokens[index];
    for (let len = tokens.length; index < len; index++) {
        token = tokens[index];
        if (isFieldDeclaration(token))
            return true;
        if (token.type === TokenType.PUNCTUATION.SEMICOLON)
            break;
    }
    return false;
}

function isAnnotationToken(token) {
    switch (token.type) {
        case TokenType.BRACKET.ANNOTATION_PARAM_OPEN:
        case TokenType.BRACKET.ANNOTATION_PARAM_CLOSE:
        case TokenType.ANNOTATION.CONTENT:
        case TokenType.ANNOTATION.ENTITY:
        case TokenType.ANNOTATION.NAME:
            return true;
        default:
            return false;
    }
}

function isFieldDeclaration(token) {
    return token.type === TokenType.DECLARATION.ENTITY.VARIABLE;
}

function isMemberDeclaration(token) {
    switch (token.type) {
        case TokenType.DECLARATION.ENTITY.FUNCTION:
        case TokenType.DECLARATION.ENTITY.PROPERTY:
        case TokenType.DECLARATION.ENTITY.VARIABLE:
            return true;
        default:
            return false;
    }
}

function isUnaryOperator(token) {
    switch (token.type) {
        case TokenType.OPERATOR.ARITHMETIC.POSITIVE:
        case TokenType.OPERATOR.ARITHMETIC.DECREMENT:
        case TokenType.OPERATOR.ARITHMETIC.INCREMENT:
        case TokenType.OPERATOR.ARITHMETIC.NEGATIVE:
            return true;
        default:
            return false;
    }
}

function isKeyword(token) {
    switch (token.type) {
        case TokenType.KEYWORD.OTHER:
        case TokenType.KEYWORD.DECLARATION.CLASS:
        case TokenType.KEYWORD.DECLARATION.ENUM:
        case TokenType.KEYWORD.DECLARATION.EXTENDS:
        case TokenType.KEYWORD.DECLARATION.IMPLEMENTS:
        case TokenType.KEYWORD.DECLARATION.INTERFACE:
        case TokenType.DECLARATION.ENTITY.CLASS:
        case TokenType.DECLARATION.ENTITY.ENUM:
        case TokenType.DECLARATION.ENTITY.INTERFACE:
        case TokenType.KEYWORD.DECLARATION.INTERFACE:
        case TokenType.KEYWORD.DECLARATION.TRIGGER:
        case TokenType.KEYWORD.MODIFIER.ACCESS:
        case TokenType.KEYWORD.MODIFIER.DEFINITION:
        case TokenType.KEYWORD.MODIFIER.FINAL:
        case TokenType.KEYWORD.MODIFIER.OVERRIDE:
        case TokenType.KEYWORD.MODIFIER.SHARING:
        case TokenType.KEYWORD.MODIFIER.STATIC:
        case TokenType.KEYWORD.MODIFIER.TEST_METHOD:
        case TokenType.KEYWORD.MODIFIER.TRANSIENT:
        case TokenType.KEYWORD.MODIFIER.WEB_SERVICE:
        case TokenType.KEYWORD.OBJECT.NEW:
        case TokenType.DATABASE.TRIGGER_EXEC:
        case TokenType.DATABASE.DML:
        case TokenType.KEYWORD.FLOW_CONTROL.BREAK:
        case TokenType.KEYWORD.FLOW_CONTROL.SWITCH:
        case TokenType.KEYWORD.FLOW_CONTROL.SWITCH_CASE:
        case TokenType.KEYWORD.FLOW_CONTROL.CONTINUE:
        case TokenType.KEYWORD.FLOW_CONTROL.RETURN:
        case TokenType.KEYWORD.FLOW_CONTROL.THROW:
            return true;
        default:
            return false;
    }
}

function isEmptyProperty(tokens, index) {
    let isEmptyProperty = true;
    for (; index < tokens.length; index++) {
        let token = tokens[index];
        let nextToken = LangUtils.getNextToken(tokens, index);
        if ((token.type === TokenType.KEYWORD.DECLARATION.PROPERTY_GETTER || token.type === TokenType.KEYWORD.DECLARATION.PROPERTY_SETTER) && nextToken && nextToken.type !== TokenType.PUNCTUATION.SEMICOLON) {
            isEmptyProperty = false;
            break;
        }
        if (token.type === TokenType.BRACKET.CURLY_CLOSE) {
            break;
        }
    }
    return isEmptyProperty;
}