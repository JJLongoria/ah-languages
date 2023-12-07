import { ApexTokenTypes, CoreUtils, FileReader, ParserData, Token } from "@aurahelper/core";
import { System } from "../system";
const Utils = CoreUtils.Utils;
const Validator = CoreUtils.Validator;
const StrUtils = CoreUtils.StrUtils;

const symbolTokens: { [key: string]: string } = {
    ">>>=": ApexTokenTypes.OPERATOR.BITWISE.UNSIGNED_RIGHT_ASSIGN,
    ">>=": ApexTokenTypes.OPERATOR.BITWISE.SIGNED_RIGTH_ASSIGN,
    "<<=": ApexTokenTypes.OPERATOR.BITWISE.LEFT_ASSIGN,
    ">>>": ApexTokenTypes.OPERATOR.BITWISE.UNSIGNED_RIGHT,
    "!==": ApexTokenTypes.OPERATOR.LOGICAL.INEQUALITY_EXACT,
    "===": ApexTokenTypes.OPERATOR.LOGICAL.EQUALITY_EXACT,
    ">>": ApexTokenTypes.OPERATOR.BITWISE.SIGNED_RIGHT,
    "<<": ApexTokenTypes.OPERATOR.BITWISE.SIGNED_LEFT,
    "^=": ApexTokenTypes.OPERATOR.BITWISE.EXCLUSIVE_OR_ASSIGN,
    "--": ApexTokenTypes.OPERATOR.ARITHMETIC.DECREMENT,
    "++": ApexTokenTypes.OPERATOR.ARITHMETIC.INCREMENT,
    "!=": ApexTokenTypes.OPERATOR.LOGICAL.INEQUALITY,
    "<>": ApexTokenTypes.OPERATOR.LOGICAL.INEQUALITY,
    "==": ApexTokenTypes.OPERATOR.LOGICAL.EQUALITY,
    "||": ApexTokenTypes.OPERATOR.LOGICAL.OR,
    "|=": ApexTokenTypes.OPERATOR.LOGICAL.OR_ASSIGN,
    "&&": ApexTokenTypes.OPERATOR.LOGICAL.AND,
    "&=": ApexTokenTypes.OPERATOR.LOGICAL.AND_ASSIGN,
    ">=": ApexTokenTypes.OPERATOR.LOGICAL.GREATER_THAN_EQUALS,
    "<=": ApexTokenTypes.OPERATOR.LOGICAL.LESS_THAN_EQUALS,
    "=>": ApexTokenTypes.OPERATOR.ASSIGN.MAP_KEY_VALUE,
    "+=": ApexTokenTypes.OPERATOR.ARITHMETIC.ADD_ASSIGN,
    "-=": ApexTokenTypes.OPERATOR.ARITHMETIC.SUBSTRACT_ASSIGN,
    "*=": ApexTokenTypes.OPERATOR.ARITHMETIC.MULTIPLY_ASSIGN,
    "/=": ApexTokenTypes.OPERATOR.ARITHMETIC.DIVIDE_ASSIGN,
    "^": ApexTokenTypes.OPERATOR.BITWISE.EXCLUSIVE_OR,
    "|": ApexTokenTypes.OPERATOR.BITWISE.OR,
    "&": ApexTokenTypes.OPERATOR.BITWISE.AND,
    "+": ApexTokenTypes.OPERATOR.ARITHMETIC.ADD,
    "-": ApexTokenTypes.OPERATOR.ARITHMETIC.SUBSTRACT,
    "*": ApexTokenTypes.OPERATOR.ARITHMETIC.MULTIPLY,
    "/": ApexTokenTypes.OPERATOR.ARITHMETIC.DIVIDE,
    "!": ApexTokenTypes.OPERATOR.LOGICAL.NOT,
    "<": ApexTokenTypes.OPERATOR.LOGICAL.LESS_THAN,
    ">": ApexTokenTypes.OPERATOR.LOGICAL.GREATER_THAN,
    "=": ApexTokenTypes.OPERATOR.ASSIGN.ASSIGN,
    "/**": ApexTokenTypes.COMMENT.BLOCK_START,
    "/*": ApexTokenTypes.COMMENT.BLOCK_START,
    "*/": ApexTokenTypes.COMMENT.BLOCK_END,
    "//": ApexTokenTypes.COMMENT.LINE,
    "///": ApexTokenTypes.COMMENT.LINE_DOC,
    "(": ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN,
    ")": ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_CLOSE,
    "{": ApexTokenTypes.BRACKET.CURLY_OPEN,
    "}": ApexTokenTypes.BRACKET.CURLY_CLOSE,
    "[": ApexTokenTypes.BRACKET.SQUARE_OPEN,
    "]": ApexTokenTypes.BRACKET.SQUARE_CLOSE,
    ",": ApexTokenTypes.PUNCTUATION.COMMA,
    ";": ApexTokenTypes.PUNCTUATION.SEMICOLON,
    ":": ApexTokenTypes.PUNCTUATION.COLON,
    ".": ApexTokenTypes.PUNCTUATION.OBJECT_ACCESSOR,
    "?.": ApexTokenTypes.PUNCTUATION.SAFE_OBJECT_ACCESSOR,
    "\\": ApexTokenTypes.PUNCTUATION.BACKSLASH,
    "'": ApexTokenTypes.PUNCTUATION.QUOTTES,
    "@": ApexTokenTypes.PUNCTUATION.AT,
    "?": ApexTokenTypes.PUNCTUATION.EXMARK,
};

const primitiveDatatypes: { [key: string]: string } = {
    "blob": ApexTokenTypes.DATATYPE.PRIMITIVE,
    "boolean": ApexTokenTypes.DATATYPE.PRIMITIVE,
    "byte": ApexTokenTypes.DATATYPE.PRIMITIVE,
    "date": ApexTokenTypes.DATATYPE.PRIMITIVE,
    "datetime": ApexTokenTypes.DATATYPE.PRIMITIVE,
    "decimal": ApexTokenTypes.DATATYPE.PRIMITIVE,
    "double": ApexTokenTypes.DATATYPE.PRIMITIVE,
    "id": ApexTokenTypes.DATATYPE.PRIMITIVE,
    "integer": ApexTokenTypes.DATATYPE.PRIMITIVE,
    "long": ApexTokenTypes.DATATYPE.PRIMITIVE,
    "object": ApexTokenTypes.DATATYPE.PRIMITIVE,
    "string": ApexTokenTypes.DATATYPE.PRIMITIVE,
    "time": ApexTokenTypes.DATATYPE.PRIMITIVE,
    "void": ApexTokenTypes.DATATYPE.PRIMITIVE,
};

const collectionsDatatypes: { [key: string]: string } = {
    "list": ApexTokenTypes.DATATYPE.COLLECTION,
    "set": ApexTokenTypes.DATATYPE.COLLECTION,
    "map": ApexTokenTypes.DATATYPE.COLLECTION,
    "array": ApexTokenTypes.DATATYPE.COLLECTION,
};

const dateLiterals: { [key: string]: string } = {
    "yesterday": ApexTokenTypes.LITERAL.DATE,
    "today": ApexTokenTypes.LITERAL.DATE,
    "tomorrow": ApexTokenTypes.LITERAL.DATE,
    "last_week": ApexTokenTypes.LITERAL.DATE,
    "this_week": ApexTokenTypes.LITERAL.DATE,
    "next_week": ApexTokenTypes.LITERAL.DATE,
    "last_month": ApexTokenTypes.LITERAL.DATE,
    "this_month": ApexTokenTypes.LITERAL.DATE,
    "next_month": ApexTokenTypes.LITERAL.DATE,
    "last_90_days": ApexTokenTypes.LITERAL.DATE,
    "next_90_days": ApexTokenTypes.LITERAL.DATE,
    "last_n_days": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
    "next_n_days": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
    "next_n_weeks": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
    "last_n_weeks": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
    "next_n_months": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
    "last_n_months": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
    "this_quarter": ApexTokenTypes.LITERAL.DATE,
    "last_quarter": ApexTokenTypes.LITERAL.DATE,
    "next_quarter": ApexTokenTypes.LITERAL.DATE,
    "next_n_quarters": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
    "last_n_quarters": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
    "this_year": ApexTokenTypes.LITERAL.DATE,
    "last_year": ApexTokenTypes.LITERAL.DATE,
    "next_n_years": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
    "last_n_years": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
    "this_fiscal_quarter": ApexTokenTypes.LITERAL.DATE,
    "last_fiscal_quarter": ApexTokenTypes.LITERAL.DATE,
    "next_fiscal_quarter": ApexTokenTypes.LITERAL.DATE,
    "next_n_fiscal_quarters": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
    "last_n_fiscal_quarters": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
    "this_fiscal_year": ApexTokenTypes.LITERAL.DATE,
    "last_fiscal_year": ApexTokenTypes.LITERAL.DATE,
    "next_fiscal_year": ApexTokenTypes.LITERAL.DATE,
    "next_n_fiscal_years": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
    "last_n_fiscal_years": ApexTokenTypes.LITERAL.DATE_PARAMETRIZED,
};

const reservedKeywords: { [key: string]: string } = {
    "abstract": ApexTokenTypes.KEYWORD.MODIFIER.DEFINITION,
    "after": ApexTokenTypes.DATABASE.TRIGGER_EXEC,
    "any": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "activate": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "as": ApexTokenTypes.KEYWORD.OTHER,
    "asc": ApexTokenTypes.QUERY.ORDER,
    "autonomous": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "begin": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "before": ApexTokenTypes.DATABASE.TRIGGER_EXEC,
    "bigdecimal": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "break": ApexTokenTypes.KEYWORD.FLOW_CONTROL.BREAK,
    "bulk": ApexTokenTypes.KEYWORD.OTHER,
    "case": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "cast": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "catch": ApexTokenTypes.KEYWORD.FLOW_CONTROL.CATCH,
    "char": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "class": ApexTokenTypes.KEYWORD.DECLARATION.CLASS,
    "collect": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "commit": ApexTokenTypes.KEYWORD.OTHER,
    "const": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "continue": ApexTokenTypes.KEYWORD.FLOW_CONTROL.CONTINUE,
    "default": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "delete": ApexTokenTypes.DATABASE.DML,
    "desc": ApexTokenTypes.QUERY.ORDER,
    "do": ApexTokenTypes.KEYWORD.FLOW_CONTROL.DO,
    "else": ApexTokenTypes.KEYWORD.FLOW_CONTROL.ELSE,
    "enum": ApexTokenTypes.KEYWORD.DECLARATION.ENUM,
    "exit": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "export": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "extends": ApexTokenTypes.KEYWORD.DECLARATION.EXTENDS,
    "false": ApexTokenTypes.LITERAL.BOOLEAN,
    "final": ApexTokenTypes.KEYWORD.MODIFIER.FINAL,
    "finally": ApexTokenTypes.KEYWORD.FLOW_CONTROL.FINALLY,
    "float": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "for": ApexTokenTypes.KEYWORD.FLOW_CONTROL.FOR,
    "global": ApexTokenTypes.KEYWORD.MODIFIER.ACCESS,
    "goto": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "group": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "hint": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "if": ApexTokenTypes.KEYWORD.FLOW_CONTROL.IF,
    "implements": ApexTokenTypes.KEYWORD.DECLARATION.IMPLEMENTS,
    "import": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "inner": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "insert": ApexTokenTypes.DATABASE.DML,
    "instanceof": ApexTokenTypes.OPERATOR.LOGICAL.INSTANCE_OF,
    "interface": ApexTokenTypes.KEYWORD.DECLARATION.INTERFACE,
    "into": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "join": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "loop": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "merge": ApexTokenTypes.DATABASE.DML,
    "new": ApexTokenTypes.KEYWORD.OBJECT.NEW,
    "null": ApexTokenTypes.LITERAL.NULL,
    "number": ApexTokenTypes.KEYWORD.OTHER,
    "of": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "on": ApexTokenTypes.KEYWORD.OTHER,
    "outer": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "override": ApexTokenTypes.KEYWORD.MODIFIER.OVERRIDE,
    "package": ApexTokenTypes.KEYWORD.OTHER,
    "parallel": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "pragma": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "private": ApexTokenTypes.KEYWORD.MODIFIER.ACCESS,
    "protected": ApexTokenTypes.KEYWORD.MODIFIER.ACCESS,
    "public": ApexTokenTypes.KEYWORD.MODIFIER.ACCESS,
    "retrieve": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "return": ApexTokenTypes.KEYWORD.FLOW_CONTROL.RETURN,
    "returning": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "search": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "select": ApexTokenTypes.QUERY.CLAUSE.SELECT,
    "short": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "sort": ApexTokenTypes.KEYWORD.OTHER,
    "stat": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "static": ApexTokenTypes.KEYWORD.MODIFIER.STATIC,
    "super": ApexTokenTypes.KEYWORD.OBJECT.SUPER,
    "switch": ApexTokenTypes.KEYWORD.FLOW_CONTROL.SWITCH,
    "synchronized": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "testmethod": ApexTokenTypes.KEYWORD.MODIFIER.TEST_METHOD,
    "this": ApexTokenTypes.KEYWORD.OBJECT.THIS,
    "throw": ApexTokenTypes.KEYWORD.FLOW_CONTROL.THROW,
    "transaction": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "trigger": ApexTokenTypes.KEYWORD.DECLARATION.TRIGGER,
    "true": ApexTokenTypes.LITERAL.BOOLEAN,
    "try": ApexTokenTypes.KEYWORD.FLOW_CONTROL.TRY,
    "type": ApexTokenTypes.KEYWORD.FOR_FUTURE,
    "transient": ApexTokenTypes.KEYWORD.MODIFIER.TRANSIENT,
    "undelete": ApexTokenTypes.DATABASE.DML,
    "update": ApexTokenTypes.DATABASE.DML,
    "upsert": ApexTokenTypes.DATABASE.DML,
    "virtual": ApexTokenTypes.KEYWORD.MODIFIER.DEFINITION,
    "webservice": ApexTokenTypes.KEYWORD.MODIFIER.WEB_SERVICE,
    "while": ApexTokenTypes.KEYWORD.FLOW_CONTROL.WHILE,
    "when": ApexTokenTypes.KEYWORD.FLOW_CONTROL.SWITCH_CASE,
};

const soqlFunctions: { [key: string]: string } = {
    "avg": ApexTokenTypes.QUERY.FUNCTION,
    "calendar_month": ApexTokenTypes.QUERY.FUNCTION,
    "calendar_quarter": ApexTokenTypes.QUERY.FUNCTION,
    "calendar_year": ApexTokenTypes.QUERY.FUNCTION,
    "convertcurrency": ApexTokenTypes.QUERY.FUNCTION,
    "converttimezone": ApexTokenTypes.QUERY.FUNCTION,
    "count": ApexTokenTypes.QUERY.FUNCTION,
    "day_in_month": ApexTokenTypes.QUERY.FUNCTION,
    "day_in_week": ApexTokenTypes.QUERY.FUNCTION,
    "day_in_year": ApexTokenTypes.QUERY.FUNCTION,
    "day_only": ApexTokenTypes.QUERY.FUNCTION,
    "data category": ApexTokenTypes.QUERY.FUNCTION,
    "tolabel": ApexTokenTypes.QUERY.FUNCTION,
    "includes": ApexTokenTypes.QUERY.FUNCTION,
    "excludes": ApexTokenTypes.QUERY.FUNCTION,
    "fiscal_month": ApexTokenTypes.QUERY.FUNCTION,
    "fiscal_quarter": ApexTokenTypes.QUERY.FUNCTION,
    "fiscal_year": ApexTokenTypes.QUERY.FUNCTION,
    "format": ApexTokenTypes.QUERY.FUNCTION,
    "grouping": ApexTokenTypes.QUERY.FUNCTION,
    "group by cube": ApexTokenTypes.QUERY.FUNCTION,
    "group by rollup": ApexTokenTypes.QUERY.FUNCTION,
    "hour_in_day": ApexTokenTypes.QUERY.FUNCTION,
    "max": ApexTokenTypes.QUERY.FUNCTION,
    "min": ApexTokenTypes.QUERY.FUNCTION,
    "sum": ApexTokenTypes.QUERY.FUNCTION,
    "week_in_month": ApexTokenTypes.QUERY.FUNCTION,
    "week_in_year": ApexTokenTypes.QUERY.FUNCTION,
};

const queryClauses: { [key: string]: string } = {
    "using scope": ApexTokenTypes.QUERY.CLAUSE.USING_SCOPE,
    "order by": ApexTokenTypes.QUERY.CLAUSE.ORDER_BY,
    "where": ApexTokenTypes.QUERY.CLAUSE.WHERE,
    "when": ApexTokenTypes.QUERY.CLAUSE.WHEN,
    "typeof": ApexTokenTypes.QUERY.CLAUSE.TYPE_OF,
    "then": ApexTokenTypes.QUERY.CLAUSE.THEN,
    "nulls": ApexTokenTypes.QUERY.CLAUSE.NULLS,
    "from": ApexTokenTypes.QUERY.CLAUSE.FROM,
    "end": ApexTokenTypes.QUERY.CLAUSE.END,
    "else": ApexTokenTypes.QUERY.CLAUSE.ELSE,
    "group by": ApexTokenTypes.QUERY.CLAUSE.GROUP_BY,
    "having": ApexTokenTypes.QUERY.CLAUSE.HAVING,
    "with": ApexTokenTypes.QUERY.CLAUSE.WITH,
    "limit": ApexTokenTypes.QUERY.CLAUSE.LIMIT,
    "offset": ApexTokenTypes.QUERY.CLAUSE.OFFSET,
    "for": ApexTokenTypes.QUERY.CLAUSE.FOR,
};

const soqlOperators: { [key: string]: string } = {
    "above": ApexTokenTypes.QUERY.OPERATOR,
    "above_or_below": ApexTokenTypes.QUERY.OPERATOR,
    "and": ApexTokenTypes.QUERY.OPERATOR,
    "at": ApexTokenTypes.QUERY.OPERATOR,
    "reference": ApexTokenTypes.QUERY.OPERATOR,
    "update": ApexTokenTypes.QUERY.OPERATOR,
    "view": ApexTokenTypes.QUERY.OPERATOR,
    "in": ApexTokenTypes.QUERY.OPERATOR,
    "like": ApexTokenTypes.QUERY.OPERATOR,
    "not in": ApexTokenTypes.QUERY.OPERATOR,
    "not": ApexTokenTypes.QUERY.OPERATOR,
    "or": ApexTokenTypes.QUERY.OPERATOR,
    "update tracking": ApexTokenTypes.QUERY.OPERATOR,
    "update viewstat": ApexTokenTypes.QUERY.OPERATOR,
    "data category": ApexTokenTypes.QUERY.OPERATOR,
    "snippet": ApexTokenTypes.QUERY.OPERATOR,
    "network": ApexTokenTypes.QUERY.OPERATOR,
    "metadata": ApexTokenTypes.QUERY.OPERATOR,
    "using listview": ApexTokenTypes.QUERY.OPERATOR,
    "division": ApexTokenTypes.QUERY.OPERATOR,
    "highlight": ApexTokenTypes.QUERY.OPERATOR,
    "spell_correction": ApexTokenTypes.QUERY.OPERATOR,
    "returning": ApexTokenTypes.QUERY.OPERATOR
};

const annotations: { [key: string]: string } = {
    "auraenabled": ApexTokenTypes.ANNOTATION.NAME,
    "deprecated": ApexTokenTypes.ANNOTATION.NAME,
    "future": ApexTokenTypes.ANNOTATION.NAME,
    "invocablemethod": ApexTokenTypes.ANNOTATION.NAME,
    "invocablevariable": ApexTokenTypes.ANNOTATION.NAME,
    "istest": ApexTokenTypes.ANNOTATION.NAME,
    "namespaceaccesible": ApexTokenTypes.ANNOTATION.NAME,
    "readonly": ApexTokenTypes.ANNOTATION.NAME,
    "remoteaction": ApexTokenTypes.ANNOTATION.NAME,
    "suppresswarnings": ApexTokenTypes.ANNOTATION.NAME,
    "testsetup": ApexTokenTypes.ANNOTATION.NAME,
    "testvisible": ApexTokenTypes.ANNOTATION.NAME,
    "restresource": ApexTokenTypes.ANNOTATION.NAME,
    "httpdelete": ApexTokenTypes.ANNOTATION.NAME,
    "httpget": ApexTokenTypes.ANNOTATION.NAME,
    "httppatch": ApexTokenTypes.ANNOTATION.NAME,
    "httppost": ApexTokenTypes.ANNOTATION.NAME,
    "httpPut": ApexTokenTypes.ANNOTATION.NAME,
};

let nsSummary;

/**
 * Class to Tokenize any apex node to extract all tokens
 */
export class ApexTokenizer {

    /**
     * Method to tokenize an Apex file
     * @param {string} filePathOrContent File path or file content to tokenize
     * @param {ParserData} [systemData] Object with the system data to identify tokens with more precission 
     * @param {number} [tabSize] Integer number with the tab size for the file 
     * @returns {Token[]} Returns an array with all file tokens
     */
    static tokenize(filePathOrContent: string, systemData?: ParserData, tabSize?: number): Token[] {
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
        const sObjects = systemData ? systemData.sObjects : [];
        const userClasses = systemData ? systemData.userClasses : [];
        const namespacesSummary = systemData ? systemData.namespaceSummary : undefined;
        if (!namespacesSummary) {
            nsSummary = System.getAllNamespacesSummary();
        }
        else {
            nsSummary = namespacesSummary;
        }
        const systemNamespace = nsSummary['system'];
        const NUM_FORMAT = /[0-9]/;
        const ID_FORMAT = /([a-zA-Z0-9À-ÿ]|_|–)/;
        content = StrUtils.replace(content, '\r\n', '\n');
        const tokens: Token[] = [];
        let lineNumber = 0;
        let column = 0;
        let onCommentBlock = false;
        let onCommentLine = false;
        let onText = false;
        let onQuery = false;
        let onSObjectInstance = false;
        let onAnnotation = false;
        let sqBracketIndent = 0;
        let aBracketsIndex: number[] = [];
        const parentIndex: number[] = [];
        const bracketIndex: number[] = [];
        let auxBracketIndex: number[] = [];
        const classDeclarationIndex: number[] = [];
        const classDeclarationNames: string[] = [];
        const enumDeclarationIndex: number[] = [];
        const sqBracketIndex: number[] = [];
        const quottesIndex: number[] = [];
        const commentBlockIndex: number[] = [];
        for (let charIndex = 0, len = content.length; charIndex < len; charIndex++) {
            const fourChars = content.substring(charIndex, charIndex + 4);
            const threeChars = content.substring(charIndex, charIndex + 3);
            const twoChars = content.substring(charIndex, charIndex + 2);
            let char = content.charAt(charIndex);
            let token: Token | undefined;
            let lastToken = (tokens.length > 0) ? tokens[tokens.length - 1] : undefined;
            const twoLastToken = (tokens.length > 1) ? tokens[tokens.length - 2] : undefined;
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
                    column++;
                }
            } else if (symbolTokens[char]) {
                token = new Token(symbolTokens[char], char, lineNumber, column);
                if (mustResetABracketIndex(token)) {
                    aBracketsIndex = [];
                }
                column++;
            } else if (NUM_FORMAT.test(char)) {
                var numContent = '';
                while (NUM_FORMAT.test(char) || char === '.' || char === ':' || char === '+' || char === '-' || char.toLowerCase() === 't' || char.toLowerCase() === 'z') {
                    numContent += char;
                    char = content.charAt(++charIndex);
                }
                if (numContent.indexOf(':') !== -1 && numContent.indexOf('-') !== -1) {
                    token = new Token(ApexTokenTypes.LITERAL.DATETIME, numContent, lineNumber, column);
                } else if (numContent.indexOf('-') !== -1) {
                    token = new Token(ApexTokenTypes.LITERAL.DATE, numContent, lineNumber, column);
                } else if (numContent.indexOf(':') !== -1) {
                    token = new Token(ApexTokenTypes.LITERAL.TIME, numContent, lineNumber, column);
                } else if (numContent.indexOf('.') !== -1) {
                    token = new Token(ApexTokenTypes.LITERAL.DOUBLE, numContent, lineNumber, column);
                } else {
                    token = new Token(ApexTokenTypes.LITERAL.INTEGER, numContent, lineNumber, column);
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
                token = new Token(ApexTokenTypes.IDENTIFIER, idContent, lineNumber, column);
                column += idContent.length;
            } else if (char === "\n") {
                if (onCommentLine) {
                    onCommentLine = false;
                }
                lineNumber++;
                column = 0;
            } else if (char !== "\t" && char !== " " && char.trim().length !== 0) {
                token = new Token(ApexTokenTypes.UNKNOWN, char, lineNumber, column);
                column++;
            } else if (char === "\t") {
                column += tabSize;
            } else {
                column++;
            }

            if (token !== undefined) {
                if (!onText && !onCommentBlock && !onCommentLine && token.type === ApexTokenTypes.PUNCTUATION.QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    if (onAnnotation) {
                        token.type = ApexTokenTypes.ANNOTATION.CONTENT;
                    } else {
                        token.type = ApexTokenTypes.PUNCTUATION.QUOTTES_START;
                        quottesIndex.push(tokens.length);
                    }
                    onText = true;
                    token.parentToken = tokens.length - 1;
                } else if (onText && token.type === ApexTokenTypes.PUNCTUATION.QUOTTES && (!lastToken || lastToken.text !== '\\')) {
                    if (onAnnotation && lastToken) {
                        token.type = ApexTokenTypes.ANNOTATION.CONTENT;
                        const whitespaces: number = (lastToken.range.start.line !== token.range.start.line) ? 0 : token.range.start.character - lastToken.range.end.character;
                        token = new Token(ApexTokenTypes.ANNOTATION.CONTENT, lastToken.text + StrUtils.getWhitespaces(whitespaces) + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else {
                        token.type = ApexTokenTypes.PUNCTUATION.QUOTTES_END;
                        if (quottesIndex.length > 0) {
                            const index = quottesIndex.pop();
                            if (index !== undefined) {
                                token.pairToken = index;
                                tokens[index].pairToken = tokens.length;
                                token.parentToken = tokens[index].parentToken;
                            }
                        }
                    }
                    onText = false;
                } else if (!onAnnotation && !onText && !onCommentBlock && !onCommentLine && token.type === ApexTokenTypes.COMMENT.BLOCK_START) {
                    onCommentBlock = true;
                    token.parentToken = tokens.length - 1;
                    commentBlockIndex.push(tokens.length);
                } else if (onCommentBlock && token.type === ApexTokenTypes.COMMENT.BLOCK_END) {
                    onCommentBlock = false;
                    if (commentBlockIndex.length > 0) {
                        const index = commentBlockIndex.pop();
                        if (index !== undefined) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                            token.parentToken = tokens[index].parentToken;
                        }
                    }
                } else if (!onAnnotation && !onText && !onCommentBlock && !onCommentLine && (token.type === ApexTokenTypes.COMMENT.LINE || token.type === ApexTokenTypes.COMMENT.LINE_DOC)) {
                    token.parentToken = tokens.length - 1;
                    onCommentLine = true;
                } else if (onText) {
                    if (onAnnotation && lastToken) {
                        token.type = ApexTokenTypes.ANNOTATION.CONTENT;
                        const whitespaces: number = (lastToken.range.start.line !== token.range.start.line) ? 0 : token.range.start.character - lastToken.range.end.character;
                        token = new Token(ApexTokenTypes.ANNOTATION.CONTENT, lastToken.text + StrUtils.getWhitespaces(whitespaces) + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else {
                        token.type = ApexTokenTypes.LITERAL.STRING;
                        if (quottesIndex.length > 0) {
                            token.parentToken = quottesIndex[quottesIndex.length - 1];
                        }
                    }
                } else if (onCommentBlock || onCommentLine) {
                    if (onCommentBlock && token.text === '/' && lastToken && lastToken.text === '/**') {
                        tokens[tokens.length - 1].text = '/*';
                        token.text = '*/';
                        token.type = ApexTokenTypes.COMMENT.BLOCK_END;
                        onCommentBlock = false;
                    } else {
                        token.type = ApexTokenTypes.COMMENT.CONTENT;
                        if (commentBlockIndex.length > 0) {
                            token.parentToken = commentBlockIndex[commentBlockIndex.length - 1];
                        }
                    }
                } else if (lastToken && (isOperator(lastToken) || isBracket(lastToken)) && token.type === ApexTokenTypes.OPERATOR.ARITHMETIC.ADD) {
                    token.type = ApexTokenTypes.OPERATOR.ARITHMETIC.POSITIVE;
                } else if (lastToken && (isOperator(lastToken) || isBracket(lastToken)) && token.type === ApexTokenTypes.OPERATOR.ARITHMETIC.SUBSTRACT) {
                    token.type = ApexTokenTypes.OPERATOR.ARITHMETIC.NEGATIVE;
                } else if (onAnnotation && token.type !== ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_CLOSE) {
                    token.type = ApexTokenTypes.ANNOTATION.CONTENT;
                } else if (token.type === ApexTokenTypes.OPERATOR.LOGICAL.LESS_THAN) {
                    aBracketsIndex.push(tokens.length);
                } else if (token.type === ApexTokenTypes.OPERATOR.LOGICAL.GREATER_THAN) {
                    if (aBracketsIndex.length > 0) {
                        let index = aBracketsIndex.pop();
                        if (index !== undefined && tokens[index] && tokens[index].type === ApexTokenTypes.OPERATOR.LOGICAL.LESS_THAN) {
                            tokens[index].type = ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_OPEN;
                            if (tokens[index + 1] && tokens[index + 1].type === ApexTokenTypes.ENTITY.VARIABLE) {
                                tokens[index + 1].type = ApexTokenTypes.DATATYPE.CUSTOM_CLASS;
                            }
                            if (tokens[tokens.length - 1] && tokens[tokens.length - 1].type === ApexTokenTypes.ENTITY.VARIABLE) {
                                tokens[tokens.length - 1].type = ApexTokenTypes.DATATYPE.CUSTOM_CLASS;
                            }
                            token.type = ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE;
                        }
                        if (index !== undefined) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (lastToken && lastToken.type === ApexTokenTypes.BRACKET.CASTING_CLOSE && token.textToLower === ';') {
                    const pairIndex = tokens[tokens.length - 1]?.pairToken;
                    if (pairIndex) {
                        tokens[tokens.length - 1].type = ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_OPEN;
                        tokens[pairIndex].type = ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_CLOSE;
                    }
                } else if (token.type === ApexTokenTypes.BRACKET.CURLY_OPEN && lastToken) {
                    if ((lastToken.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === ApexTokenTypes.BRACKET.SQUARE_CLOSE) && bracketIndex.length > 0 && classDeclarationIndex.length === 0) {
                        token.type = ApexTokenTypes.BRACKET.INIT_VALUES_OPEN;
                    } else if (lastToken.type === ApexTokenTypes.KEYWORD.MODIFIER.STATIC) {
                        tokens[tokens.length - 1].type = ApexTokenTypes.KEYWORD.DECLARATION.STATIC_CONSTRUCTOR;
                    } else if (lastToken.textToLower === 'get') {
                        tokens[tokens.length - 1].type = ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_GETTER;
                    } else if (lastToken.textToLower === 'set') {
                        tokens[tokens.length - 1].type = ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_SETTER;
                    } else if (lastToken.type === ApexTokenTypes.DECLARATION.ENTITY.VARIABLE) {
                        tokens[tokens.length - 1].type = ApexTokenTypes.DECLARATION.ENTITY.PROPERTY;
                    } else if (lastToken.type === ApexTokenTypes.BRACKET.CURLY_OPEN || lastToken.type === ApexTokenTypes.BRACKET.CURLY_CLOSE || lastToken.type === ApexTokenTypes.PUNCTUATION.SEMICOLON) {
                        token.type = ApexTokenTypes.BRACKET.INITIALIZER_OPEN;
                    } else if (lastToken.type === ApexTokenTypes.COMMENT.CONTENT || lastToken.type === ApexTokenTypes.COMMENT.LINE || lastToken.type === ApexTokenTypes.COMMENT.LINE_DOC || lastToken.type === ApexTokenTypes.COMMENT.BLOCK_END) {
                        let auxToken = lastToken;
                        let finish = false;
                        while (!finish) {
                            if (auxToken.parentToken !== undefined && auxToken.parentToken !== -1) {
                                auxToken = tokens[auxToken.parentToken];
                            } else {
                                finish = true;
                            }
                            if (auxToken.type === ApexTokenTypes.BRACKET.CURLY_OPEN || auxToken.type === ApexTokenTypes.BRACKET.CURLY_CLOSE || auxToken.type === ApexTokenTypes.PUNCTUATION.SEMICOLON) {
                                finish = true;
                                token.type = ApexTokenTypes.BRACKET.INITIALIZER_OPEN;
                            } else if (auxToken.type !== ApexTokenTypes.COMMENT.CONTENT && auxToken.type !== ApexTokenTypes.COMMENT.LINE && auxToken.type !== ApexTokenTypes.COMMENT.LINE_DOC && auxToken.type !== ApexTokenTypes.COMMENT.BLOCK_END) {
                                finish = true;
                            }
                        }
                    }
                    if (lastToken.parentToken !== undefined) {
                        token.parentToken = lastToken.parentToken;
                    } else {
                        token.parentToken = tokens.length - 1;
                    }
                    if (lastToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE || lastToken.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.ELSE || lastToken.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.TRY || lastToken.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.FINALLY || lastToken.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.DO) {
                        if (lastToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE && lastToken.parentToken !== undefined) {
                            token.parentToken = lastToken.parentToken;
                        } else {
                            token.parentToken = tokens.length - 1;
                        }
                    }
                    if (classDeclarationIndex.length > 0) {
                        token.parentToken = classDeclarationIndex.pop();
                    }
                    bracketIndex.push(tokens.length);
                } else if (token.type === ApexTokenTypes.BRACKET.CURLY_CLOSE) {
                    if (bracketIndex.length > 0) {
                        let index = bracketIndex.pop();
                        if (index !== undefined) {
                            if (tokens[index] && tokens[index].type === ApexTokenTypes.BRACKET.INIT_VALUES_OPEN) {
                                token.type = ApexTokenTypes.BRACKET.INIT_VALUES_CLOSE;
                            } else if (tokens[index] && tokens[index].type === ApexTokenTypes.BRACKET.INITIALIZER_OPEN) {
                                token.type = ApexTokenTypes.BRACKET.INITIALIZER_CLOSE;
                            }
                            if (tokens[index].parentToken) {
                                token.parentToken = tokens[index].parentToken;
                            } else {
                                token.parentToken = index;
                            }
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                    if (enumDeclarationIndex.length > 0) {
                        enumDeclarationIndex.pop();
                    }
                } else if (token.type === ApexTokenTypes.OPERATOR.ASSIGN.ASSIGN && onQuery) {
                    token.type = ApexTokenTypes.OPERATOR.LOGICAL.EQUALITY;
                } else if (token.type === ApexTokenTypes.BRACKET.SQUARE_OPEN) {
                    sqBracketIndex.push(tokens.length);
                    sqBracketIndent++;
                } else if (token.type === ApexTokenTypes.BRACKET.SQUARE_CLOSE) {
                    sqBracketIndent--;
                    if (sqBracketIndent === 0) {
                        if (onQuery) {
                            onQuery = false;
                            token.type = ApexTokenTypes.BRACKET.QUERY_END;
                        } else if (twoLastToken && lastToken && twoLastToken.type === ApexTokenTypes.ENTITY.VARIABLE && lastToken.type === ApexTokenTypes.BRACKET.SQUARE_OPEN) {
                            tokens[tokens.length - 2].type = ApexTokenTypes.DATATYPE.CUSTOM_CLASS;
                        }
                    }
                    if (sqBracketIndex.length > 0) {
                        let index = sqBracketIndex.pop();
                        if (index !== undefined) {
                            token.pairToken = index;
                            tokens[index].pairToken = tokens.length;
                        }
                    }
                } else if (token.type === ApexTokenTypes.PUNCTUATION.SEMICOLON) {
                    if (lastToken && lastToken.textToLower === 'get') {
                        tokens[tokens.length - 1].type = ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_GETTER;
                    } else if (lastToken && lastToken.textToLower === 'set') {
                        tokens[tokens.length - 1].type = ApexTokenTypes.KEYWORD.DECLARATION.PROPERTY_SETTER;
                    }
                } else if (isObjectAccessor(token)) {
                    if (lastToken && lastToken.type === ApexTokenTypes.KEYWORD.DECLARATION.TRIGGER) {
                        tokens[tokens.length - 1].type = ApexTokenTypes.DATATYPE.SUPPORT_CLASS;
                    }
                    if (lastToken && lastToken.type === ApexTokenTypes.KEYWORD.DECLARATION.CLASS) {
                        tokens[tokens.length - 1].type = ApexTokenTypes.DATATYPE.SUPPORT_CLASS;
                    }
                } else if (onSObjectInstance && token.type === ApexTokenTypes.OPERATOR.ASSIGN.ASSIGN && twoLastToken && (twoLastToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_SOBJECT_OPEN || twoLastToken.type === ApexTokenTypes.PUNCTUATION.COMMA)) {
                    tokens[tokens.length - 1].type = ApexTokenTypes.ENTITY.SOBJECT_FIELD;
                } else if (token.type === ApexTokenTypes.OPERATOR.ASSIGN.ASSIGN && twoLastToken && twoLastToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_OPEN) {
                    onSObjectInstance = true;
                    tokens[tokens.length - 2].type = ApexTokenTypes.BRACKET.PARENTHESIS_SOBJECT_OPEN;
                    tokens[tokens.length - 1].type = ApexTokenTypes.ENTITY.SOBJECT_FIELD;
                } else if (token.type === ApexTokenTypes.IDENTIFIER) {
                    if (token.textToLower !== 'constructor' && reservedKeywords[token.textToLower] && reservedKeywords[token.textToLower] !== ApexTokenTypes.KEYWORD.FOR_FUTURE) {
                        if (!onQuery || (onQuery && lastToken && lastToken.type !== ApexTokenTypes.QUERY.VALUE_BIND)) {
                            token.type = reservedKeywords[token.textToLower];
                            if (lastToken && isDatatypeToken(lastToken) && token.type !== ApexTokenTypes.KEYWORD.DECLARATION.IMPLEMENTS) {
                                token.type = ApexTokenTypes.DECLARATION.ENTITY.VARIABLE;
                            }
                        }
                        if (lastToken && isObjectAccessor(lastToken) && token.type === ApexTokenTypes.KEYWORD.DECLARATION.CLASS) {
                            token.type = ApexTokenTypes.DATATYPE.SUPPORT_CLASS;
                        }
                        if (token.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.IF && lastToken && lastToken.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.ELSE) {
                            token = new Token(ApexTokenTypes.KEYWORD.FLOW_CONTROL.ELSE_IF, lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                            tokens.pop();
                            lastToken = tokens[tokens.length - 1];
                        }
                    }
                    if (!onQuery && !onAnnotation && lastToken && lastToken.type === ApexTokenTypes.PUNCTUATION.AT && annotations[token.textToLower]) {
                        token = new Token(ApexTokenTypes.ANNOTATION.ENTITY, lastToken.text + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (!onQuery && (token.type === ApexTokenTypes.QUERY.CLAUSE.SELECT || token.type === ApexTokenTypes.QUERY.CLAUSE.FIND) && lastToken && lastToken.type === ApexTokenTypes.BRACKET.SQUARE_OPEN && sqBracketIndent === 1) {
                        onQuery = true;
                        tokens[tokens.length - 1].type = ApexTokenTypes.BRACKET.QUERY_START;
                    } else if (onQuery && token.type === ApexTokenTypes.QUERY.CLAUSE.SELECT && lastToken && lastToken.type === ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN) {
                        tokens[tokens.length - 1].type = ApexTokenTypes.BRACKET.INNER_QUERY_START;
                    } else if (onQuery && token.textToLower !== 'constructor' && soqlFunctions[token.textToLower] && lastToken && lastToken.type !== ApexTokenTypes.QUERY.VALUE_BIND && !isObjectAccessor(lastToken)) {
                        token.type = soqlFunctions[token.textToLower];
                    } else if (onQuery && token.textToLower !== 'constructor' && soqlOperators[token.textToLower] && lastToken && lastToken.type !== ApexTokenTypes.QUERY.VALUE_BIND && !isObjectAccessor(lastToken)) {
                        token.type = soqlOperators[token.textToLower];
                    } else if (onQuery && token.textToLower !== 'constructor' && queryClauses[token.textToLower] && lastToken && lastToken.type !== ApexTokenTypes.QUERY.VALUE_BIND && !isObjectAccessor(lastToken)) {
                        token.type = queryClauses[token.textToLower];
                    } else if (onQuery && token.textToLower === 'scope' && lastToken && lastToken.textToLower === 'using') {
                        token = new Token(queryClauses['using scope'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'by' && lastToken && lastToken.textToLower === 'order') {
                        token = new Token(queryClauses['order by'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'by' && lastToken && lastToken.textToLower === 'group') {
                        token = new Token(queryClauses['group by'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'cube' && lastToken && lastToken.type === ApexTokenTypes.QUERY.CLAUSE.GROUP_BY) {
                        token = new Token(soqlFunctions['group by cube'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'rollup' && lastToken && lastToken.type === ApexTokenTypes.QUERY.CLAUSE.GROUP_BY) {
                        token = new Token(soqlFunctions['group by rollup'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'category' && lastToken && lastToken.textToLower === 'data') {
                        token = new Token(soqlFunctions['data category'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'update' && lastToken && lastToken.textToLower === 'tracking') {
                        token = new Token(soqlFunctions['update tracking'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'update' && lastToken && lastToken.textToLower === 'tracking') {
                        token = new Token(soqlFunctions['update viewstat'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (onQuery && token.textToLower === 'listview' && lastToken && lastToken.textToLower === 'using') {
                        token = new Token(soqlFunctions['using listview'], lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (token.textToLower === 'sharing' && lastToken && (lastToken.textToLower === 'with' || lastToken.textToLower === 'without' || lastToken.textToLower === 'inherited')) {
                        token = new Token(ApexTokenTypes.KEYWORD.MODIFIER.SHARING, lastToken.text + ' ' + token.text, lastToken.range.start.line, lastToken.range.start.character);
                        tokens.pop();
                        lastToken = tokens[tokens.length - 1];
                    } else if (lastToken && lastToken.type === ApexTokenTypes.LITERAL.DATE_PARAMETRIZED_START_PARAM) {
                        token.type = ApexTokenTypes.LITERAL.DATE_PARAMETRIZED_PARAM_VARIABLE;
                    } else if (lastToken && lastToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_SOBJECT_OPEN) {
                        token.type = ApexTokenTypes.ENTITY.SOBJECT_FIELD;
                    } else if (token.textToLower !== 'constructor' && primitiveDatatypes[token.textToLower]) {
                        if (!onQuery) {
                            token.type = primitiveDatatypes[token.textToLower];
                            if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === ApexTokenTypes.BRACKET.SQUARE_CLOSE || lastToken.type === ApexTokenTypes.ENTITY.ENUM_VALUE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                                token.type = ApexTokenTypes.DECLARATION.ENTITY.VARIABLE;
                            } else if (lastToken && isObjectAccessor(lastToken)) {
                                token.type = ApexTokenTypes.ENTITY.CLASS_MEMBER;
                            }
                        }
                        else {
                            token.type = ApexTokenTypes.ENTITY.SOBJECT_PROJECTION_FIELD;
                        }
                    } else if (token.textToLower !== 'constructor' && collectionsDatatypes[token.textToLower]) {
                        token.type = collectionsDatatypes[token.textToLower];
                        if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === ApexTokenTypes.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                            token.type = ApexTokenTypes.DECLARATION.ENTITY.VARIABLE;
                        }
                    } else if (token.textToLower !== 'constructor' && dateLiterals[token.textToLower] && onQuery && lastToken && lastToken.text !== ':') {
                        token.type = dateLiterals[token.textToLower];
                    } else if (sObjects && sObjects.includes(token.textToLower) && (token.textToLower !== 'constructor' && token.textToLower !== 'name')) {
                        token.type = ApexTokenTypes.DATATYPE.SOBJECT;
                        if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === ApexTokenTypes.ENTITY.VARIABLE || lastToken.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === ApexTokenTypes.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                            tokens[tokens.length - 1].type = ApexTokenTypes.DATATYPE.CUSTOM_CLASS;
                            token.type = ApexTokenTypes.DECLARATION.ENTITY.VARIABLE;
                        }
                        if (onQuery && lastToken && lastToken.type === ApexTokenTypes.QUERY.CLAUSE.SELECT) {
                            token.type = ApexTokenTypes.ENTITY.SOBJECT_PROJECTION_FIELD;
                        } else if (onQuery && twoLastToken && twoLastToken.type === ApexTokenTypes.ENTITY.SOBJECT_PROJECTION_FIELD) {
                            token.type = ApexTokenTypes.ENTITY.SOBJECT_PROJECTION_FIELD;
                        }
                    } else if (lastToken && lastToken.type === ApexTokenTypes.KEYWORD.DECLARATION.CLASS) {
                        token.type = ApexTokenTypes.DECLARATION.ENTITY.CLASS;
                        classDeclarationIndex.push(tokens.length);
                        classDeclarationNames.push(token.textToLower);
                    } else if (lastToken && lastToken.type === ApexTokenTypes.KEYWORD.DECLARATION.ENUM) {
                        token.type = ApexTokenTypes.DECLARATION.ENTITY.ENUM;
                        classDeclarationIndex.push(tokens.length);
                        enumDeclarationIndex.push(tokens.length);
                    } else if (lastToken && lastToken.type === ApexTokenTypes.KEYWORD.DECLARATION.INTERFACE) {
                        token.type = ApexTokenTypes.DECLARATION.ENTITY.INTERFACE;
                        classDeclarationIndex.push(tokens.length);
                        classDeclarationNames.push(token.textToLower);
                    } else if (userClasses && userClasses.includes(token.textToLower)) {
                        token.type = ApexTokenTypes.DATATYPE.CUSTOM_CLASS;
                        if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === ApexTokenTypes.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                            token.type = ApexTokenTypes.DECLARATION.ENTITY.VARIABLE;
                        }
                        if (lastToken && lastToken.type === ApexTokenTypes.KEYWORD.DECLARATION.TRIGGER) {
                            token.type = ApexTokenTypes.DECLARATION.ENTITY.TRIGGER;
                        }
                    } else if (token.textToLower === 'system') {
                        token.type = ApexTokenTypes.DATATYPE.SUPPORT_CLASS;
                        if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === ApexTokenTypes.DATATYPE.SUPPORT_CLASS) {
                            tokens[tokens.length - 2].type = ApexTokenTypes.DATATYPE.SUPPORT_NAMESPACE;
                        }
                        if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === ApexTokenTypes.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                            token.type = ApexTokenTypes.DECLARATION.ENTITY.VARIABLE;
                        }
                    } else if (token.textToLower !== 'constructor' && systemNamespace && systemNamespace[token.textToLower] && (lastToken && lastToken.type !== ApexTokenTypes.KEYWORD.MODIFIER.ACCESS)) {
                        token.type = ApexTokenTypes.DATATYPE.SUPPORT_CLASS;
                        if (token.textToLower === 'trigger') {
                            token.type = ApexTokenTypes.KEYWORD.DECLARATION.TRIGGER;
                        }
                        if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === ApexTokenTypes.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                            token.type = ApexTokenTypes.DECLARATION.ENTITY.VARIABLE;
                        }
                    } else if (token.textToLower !== 'constructor' && nsSummary[token.textToLower] && token.textToLower !== 'system') {
                        token.type = ApexTokenTypes.DATATYPE.SUPPORT_NAMESPACE;
                        if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === ApexTokenTypes.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                            token.type = ApexTokenTypes.DECLARATION.ENTITY.VARIABLE;
                        }
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && nsSummary[twoLastToken.textToLower] && nsSummary[twoLastToken.textToLower][token.textToLower] && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                        token.type = ApexTokenTypes.DATATYPE.SUPPORT_CLASS;
                        tokens[tokens.length - 2].type = ApexTokenTypes.DATATYPE.SUPPORT_NAMESPACE;
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === ApexTokenTypes.DATATYPE.SUPPORT_CLASS && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                        token.type = ApexTokenTypes.ENTITY.SUPPORT_CLASS_MEMBER;
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === ApexTokenTypes.DATATYPE.SOBJECT && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                        token.type = ApexTokenTypes.ENTITY.SOBJECT_FIELD;
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === ApexTokenTypes.ENTITY.SOBJECT_FIELD && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                        token.type = ApexTokenTypes.ENTITY.SOBJECT_FIELD;
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === ApexTokenTypes.ENTITY.SOBJECT_PROJECTION_FIELD && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                        token.type = ApexTokenTypes.ENTITY.SOBJECT_PROJECTION_FIELD;
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === ApexTokenTypes.DATATYPE.CUSTOM_CLASS && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                        token.type = ApexTokenTypes.ENTITY.CLASS_MEMBER;
                    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type === ApexTokenTypes.ENTITY.CLASS_MEMBER && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                        token.type = ApexTokenTypes.ENTITY.CLASS_MEMBER;
                    } else if (lastToken && (isDatatypeToken(lastToken) || lastToken.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE || lastToken.type === ApexTokenTypes.BRACKET.SQUARE_CLOSE) && (!reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                        token.type = ApexTokenTypes.DECLARATION.ENTITY.VARIABLE;
                    } else if (onQuery && isQueryField(token, lastToken, twoLastToken) && token.textToLower !== 'constructor' && !reservedKeywords[token.textToLower]) {
                        if (lastToken && lastToken.type === ApexTokenTypes.ENTITY.SOBJECT_PROJECTION_FIELD) {
                            token.type = ApexTokenTypes.ENTITY.ALIAS_FIELD;
                        } else {
                            token.type = ApexTokenTypes.ENTITY.SOBJECT_PROJECTION_FIELD;
                        }
                    } else if (token.type === ApexTokenTypes.DATABASE.TRIGGER_EXEC && lastToken && lastToken.type === ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN) {
                        tokens[tokens.length - 1].type = ApexTokenTypes.BRACKET.TRIGGER_GUARD_OPEN;
                    } else if (token.textToLower === 'constructor' || !reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE) {
                        if (lastToken && lastToken.type === ApexTokenTypes.QUERY.CLAUSE.USING_SCOPE) {
                            token.type = ApexTokenTypes.QUERY.SCOPE_VALUE;
                        } else if (lastToken && lastToken.type === ApexTokenTypes.QUERY.CLAUSE.NULLS) {
                            token.type = ApexTokenTypes.QUERY.NULLS_VALUE;
                        } else {
                            if (lastToken && lastToken.type === ApexTokenTypes.ENTITY.CLASS_MEMBER) {
                                tokens[tokens.length - 1].type = ApexTokenTypes.DATATYPE.CUSTOM_CLASS;
                            }
                            if (lastToken && isObjectAccessor(lastToken) && twoLastToken && isDatatypeToken(twoLastToken)) {
                                token.type = ApexTokenTypes.ENTITY.CLASS_MEMBER;
                            } else if (token.type !== ApexTokenTypes.KEYWORD.FLOW_CONTROL.ELSE_IF) {
                                if (!lastToken || (lastToken.type !== ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_OPEN && lastToken.type !== ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE)) {
                                    if (lastToken && isObjectAccessor(lastToken)) {
                                        token.type = ApexTokenTypes.ENTITY.VARIABLE;
                                    } else if (lastToken && (lastToken.type === ApexTokenTypes.KEYWORD.DECLARATION.IMPLEMENTS || lastToken.type === ApexTokenTypes.KEYWORD.DECLARATION.EXTENDS)) {
                                        token.type = ApexTokenTypes.DATATYPE.CUSTOM_CLASS;
                                    } else {
                                        token.type = ApexTokenTypes.ENTITY.VARIABLE;
                                    }
                                } else {
                                    token.type = ApexTokenTypes.DATATYPE.CUSTOM_CLASS;
                                }
                                if (lastToken && lastToken.type === ApexTokenTypes.KEYWORD.DECLARATION.TRIGGER) {
                                    token.type = ApexTokenTypes.DECLARATION.ENTITY.TRIGGER;
                                }
                                if (enumDeclarationIndex.length > 0) {
                                    token.type = ApexTokenTypes.ENTITY.ENUM_VALUE;
                                } else if (lastToken && (lastToken.type === ApexTokenTypes.ENTITY.VARIABLE || lastToken.type === ApexTokenTypes.ENTITY.ENUM_VALUE)) {
                                    token.type = ApexTokenTypes.DECLARATION.ENTITY.VARIABLE;
                                    tokens[tokens.length - 1].type = ApexTokenTypes.DATATYPE.CUSTOM_CLASS;
                                }
                            }
                        }
                    } else {
                        if (lastToken && isObjectAccessor(lastToken) && (!lastToken || !reservedKeywords[token.textToLower] || reservedKeywords[token.textToLower] === ApexTokenTypes.KEYWORD.FOR_FUTURE)) {
                            token.type = ApexTokenTypes.ENTITY.VARIABLE;
                        }
                    }
                } else if (lastToken && lastToken.type === ApexTokenTypes.LITERAL.INTEGER && token.textToLower === 'l') {
                    tokens[tokens.length - 1].type = ApexTokenTypes.LITERAL.LONG;
                    token.type = ApexTokenTypes.LITERAL.LONG_INDICATOR;
                } else if (lastToken && lastToken.type === ApexTokenTypes.LITERAL.DOUBLE && token.textToLower === 'd') {
                    tokens[tokens.length - 1].type = ApexTokenTypes.LITERAL.DOUBLE;
                    token.type = ApexTokenTypes.LITERAL.DOUBLE_INDICATOR;
                } else {
                    if (token.type !== ApexTokenTypes.PUNCTUATION.COMMA && !isDatatypeToken(token)) {
                        if (aBracketsIndex.length > 0) {
                            aBracketsIndex = [];
                        }
                    }
                    if (lastToken && lastToken.type === ApexTokenTypes.LITERAL.DATE_PARAMETRIZED && token.type === ApexTokenTypes.PUNCTUATION.COLON) {
                        token.type = ApexTokenTypes.LITERAL.DATE_PARAMETRIZED_START_PARAM;
                    } else if (onQuery && token.type === ApexTokenTypes.PUNCTUATION.COLON) {
                        token.type = ApexTokenTypes.QUERY.VALUE_BIND;
                    } else if (token.type === ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_OPEN) {
                        if (lastToken && lastToken.type === ApexTokenTypes.ANNOTATION.ENTITY) {
                            token.type = ApexTokenTypes.BRACKET.ANNOTATION_PARAM_OPEN;
                            onAnnotation = true;
                        } else if (lastToken && lastToken.type === ApexTokenTypes.DATATYPE.SOBJECT) {
                            token.type = ApexTokenTypes.BRACKET.PARENTHESIS_SOBJECT_OPEN;
                            onSObjectInstance = true;
                        } else if (lastToken && lastToken.type === ApexTokenTypes.ENTITY.SUPPORT_CLASS_MEMBER) {
                            tokens[tokens.length - 1].type = ApexTokenTypes.ENTITY.SUPPORT_CLASS_FUNCTION;
                            token.type = ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_OPEN;
                        } else if (lastToken && lastToken.type === ApexTokenTypes.DECLARATION.ENTITY.VARIABLE) {
                            tokens[tokens.length - 1].type = ApexTokenTypes.DECLARATION.ENTITY.FUNCTION;
                            token.type = ApexTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                        } else if (lastToken && lastToken.type === ApexTokenTypes.DATATYPE.CUSTOM_CLASS) {
                            if (classDeclarationNames.includes(lastToken.textToLower) && twoLastToken && twoLastToken.type !== ApexTokenTypes.KEYWORD.OBJECT.NEW) {
                                tokens[tokens.length - 1].type = ApexTokenTypes.DECLARATION.ENTITY.CONSTRUCTOR;
                                token.type = ApexTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                            } else {
                                tokens[tokens.length - 1].type = ApexTokenTypes.ENTITY.FUNCTION;
                                token.type = ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_OPEN;
                            }
                        } else if (lastToken && lastToken.type === ApexTokenTypes.ENTITY.CLASS_MEMBER) {
                            tokens[tokens.length - 1].type = ApexTokenTypes.ENTITY.CLASS_FUNCTION;
                            token.type = ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_OPEN;
                        } else if (lastToken && lastToken.type === ApexTokenTypes.ENTITY.VARIABLE) {
                            if (classDeclarationNames.includes(lastToken.textToLower) && twoLastToken && twoLastToken.type !== ApexTokenTypes.KEYWORD.OBJECT.NEW) {
                                tokens[tokens.length - 1].type = ApexTokenTypes.DECLARATION.ENTITY.CONSTRUCTOR;
                                token.type = ApexTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                            } else {
                                tokens[tokens.length - 1].type = ApexTokenTypes.ENTITY.FUNCTION;
                                token.type = ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_OPEN;
                            }
                        } else if (lastToken && lastToken.type === ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE) {
                            if (classDeclarationNames.includes(lastToken.textToLower) && twoLastToken && twoLastToken.type !== ApexTokenTypes.KEYWORD.OBJECT.NEW) {
                                tokens[tokens.length - 1].type = ApexTokenTypes.DECLARATION.ENTITY.CONSTRUCTOR;
                                token.type = ApexTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN;
                            } else {
                                token.type = ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_OPEN;
                            }
                        } else if (lastToken && (lastToken.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.IF || lastToken.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.ELSE_IF || lastToken.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.CATCH || lastToken.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.WHILE || lastToken.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.FOR)) {
                            token.type = ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_OPEN;
                        }
                        token.parentToken = tokens.length - 1;
                        parentIndex.push(tokens.length);
                    } else if (token.type === ApexTokenTypes.OPERATOR.PRIORITY.PARENTHESIS_CLOSE) {
                        if (parentIndex.length > 0) {
                            let index = parentIndex.pop();
                            if (index !== undefined) {
                                if (tokens[index]) {
                                    if (tokens[index].type === ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_OPEN) {
                                        token.type = ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_CLOSE;
                                    } else if (tokens[index].type === ApexTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN) {
                                        token.type = ApexTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE;
                                    } else if (tokens[index].type === ApexTokenTypes.BRACKET.ANNOTATION_PARAM_OPEN) {
                                        onAnnotation = false;
                                        token.type = ApexTokenTypes.BRACKET.ANNOTATION_PARAM_CLOSE;
                                    } else if (tokens[index].type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_OPEN) {
                                        token.type = ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE;
                                    } else if (tokens[index].type === ApexTokenTypes.BRACKET.TRIGGER_GUARD_OPEN) {
                                        token.type = ApexTokenTypes.BRACKET.TRIGGER_GUARD_CLOSE;
                                    } else if (tokens[index].type === ApexTokenTypes.BRACKET.INNER_QUERY_START) {
                                        token.type = ApexTokenTypes.BRACKET.INNER_QUERY_END;
                                    } else if (tokens[index].type === ApexTokenTypes.BRACKET.PARENTHESIS_SOBJECT_OPEN) {
                                        token.type = ApexTokenTypes.BRACKET.PARENTHESIS_SOBJECT_CLOSE;
                                        onSObjectInstance = false;
                                    }
                                    token.parentToken = tokens[index].parentToken;
                                    token.pairToken = index;
                                    tokens[index].pairToken = tokens.length;
                                }
                                if (twoLastToken && twoLastToken.text === '(' && lastToken && isDatatypeToken(lastToken)) {
                                    tokens[index].type = ApexTokenTypes.BRACKET.CASTING_OPEN;
                                    token.type = ApexTokenTypes.BRACKET.CASTING_CLOSE;
                                    token.pairToken = index;
                                    tokens[index].pairToken = tokens.length;
                                }
                            }
                        }
                    }
                }
                if (lastToken && (lastToken.type === ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE || lastToken.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.ELSE)) {
                    if (token.type !== ApexTokenTypes.BRACKET.CURLY_OPEN && token.type !== ApexTokenTypes.PUNCTUATION.SEMICOLON) {
                        let newToken = new Token(ApexTokenTypes.BRACKET.CURLY_OPEN, '{', lastToken.range.start.line, lastToken.range.start.character + 1);
                        newToken.isAux = true;
                        newToken.parentToken = (lastToken.parentToken) ? lastToken.parentToken : tokens.length - 1;
                        auxBracketIndex.push(tokens.length);
                        tokens.push(newToken);
                    }
                } else if (token.type === ApexTokenTypes.BRACKET.CURLY_CLOSE && !token.isAux && auxBracketIndex.length > 0) {
                    for (const index of auxBracketIndex) {
                        let tokenAux = tokens[index];
                        let newToken = new Token(ApexTokenTypes.BRACKET.CURLY_CLOSE, '}', 0, 0);
                        newToken.parentToken = (tokenAux.parentToken) ? tokenAux.parentToken : token.parentToken;
                        newToken.isAux = true;
                        newToken.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                        tokens.push(newToken);
                    }
                    auxBracketIndex = [];
                }
                tokens.push(token);
                if ((token.type === ApexTokenTypes.PUNCTUATION.SEMICOLON) && auxBracketIndex.length > 0) {
                    let index = auxBracketIndex.pop();
                    if (index !== undefined) {
                        let tokenAux = tokens[index];
                        let newToken = new Token(ApexTokenTypes.BRACKET.CURLY_CLOSE, '}', token.range.start.line + 1, token.range.start.character - 4);
                        newToken.isAux = true;
                        newToken.parentToken = tokenAux.parentToken;
                        newToken.pairToken = index;
                        tokens[index].pairToken = tokens.length;
                        tokens.push(newToken);
                        let tokentmp = tokens[index - 1];
                        if (tokentmp.type === ApexTokenTypes.KEYWORD.FLOW_CONTROL.ELSE && auxBracketIndex.length > 0) {
                            index = auxBracketIndex.pop();
                            if (index !== undefined) {
                                tokenAux = tokens[index];
                                newToken = new Token(ApexTokenTypes.BRACKET.CURLY_CLOSE, '}', 0, 0);
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

function isBracket(token: Token): boolean {
    switch (token.type) {
        case ApexTokenTypes.BRACKET.ANNOTATION_PARAM_CLOSE:
        case ApexTokenTypes.BRACKET.ANNOTATION_PARAM_OPEN:
        case ApexTokenTypes.BRACKET.CURLY_CLOSE:
        case ApexTokenTypes.BRACKET.CURLY_OPEN:
        case ApexTokenTypes.BRACKET.INITIALIZER_OPEN:
        case ApexTokenTypes.BRACKET.INITIALIZER_CLOSE:
        case ApexTokenTypes.BRACKET.INIT_VALUES_CLOSE:
        case ApexTokenTypes.BRACKET.INIT_VALUES_OPEN:
        case ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_CLOSE:
        case ApexTokenTypes.BRACKET.PARAMETRIZED_TYPE_OPEN:
        case ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE:
        case ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_OPEN:
        case ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_OPEN:
        case ApexTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE:
        case ApexTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN:
        case ApexTokenTypes.BRACKET.CASTING_OPEN:
        case ApexTokenTypes.BRACKET.CASTING_CLOSE:
        case ApexTokenTypes.BRACKET.TRIGGER_GUARD_CLOSE:
        case ApexTokenTypes.BRACKET.TRIGGER_GUARD_OPEN:
            return true;
        default:
            return false;
    }
}

function isLogicalOperator(symbol: string): boolean {
    return symbol === ApexTokenTypes.OPERATOR.LOGICAL.INEQUALITY || symbol === ApexTokenTypes.OPERATOR.LOGICAL.EQUALITY || symbol === ApexTokenTypes.OPERATOR.LOGICAL.OR || symbol === ApexTokenTypes.OPERATOR.LOGICAL.OR_ASSIGN || symbol === ApexTokenTypes.OPERATOR.LOGICAL.AND || symbol === ApexTokenTypes.OPERATOR.LOGICAL.AND_ASSIGN;
}

function isDatatypeToken(token: Token): boolean {
    return token.type === ApexTokenTypes.DATATYPE.SUPPORT_CLASS || token.type === ApexTokenTypes.DATATYPE.SUPPORT_NAMESPACE || token.type === ApexTokenTypes.DATATYPE.CUSTOM_CLASS || token.type === ApexTokenTypes.DATATYPE.PRIMITIVE || token.type === ApexTokenTypes.DATATYPE.COLLECTION || token.type === ApexTokenTypes.DATATYPE.SOBJECT || token.type === ApexTokenTypes.ENTITY.CLASS_MEMBER || token.type === ApexTokenTypes.ENTITY.SUPPORT_CLASS_MEMBER;
}

function isObjectAccessor(token: Token): boolean {
    return token.type === ApexTokenTypes.PUNCTUATION.OBJECT_ACCESSOR || token.type === ApexTokenTypes.PUNCTUATION.SAFE_OBJECT_ACCESSOR;
}

function isQueryField(_token: Token, lastToken?: Token, twoLastToken?: Token): boolean {
    let isQueryField = true;
    if (lastToken && lastToken.type === ApexTokenTypes.QUERY.VALUE_BIND) {
        isQueryField = false;
    } else if (lastToken && isObjectAccessor(lastToken) && twoLastToken && twoLastToken.type !== ApexTokenTypes.ENTITY.SOBJECT_FIELD) {
        isQueryField = false;
    } else if (lastToken && lastToken.type === ApexTokenTypes.QUERY.CLAUSE.USING_SCOPE) {
        isQueryField = false;
    }
    return isQueryField;
}

function mustResetABracketIndex(token: Token): boolean {
    switch (token.type) {
        case ApexTokenTypes.PUNCTUATION.SEMICOLON:
        case ApexTokenTypes.BRACKET.CURLY_OPEN:
        case ApexTokenTypes.BRACKET.CURLY_CLOSE:
        case ApexTokenTypes.BRACKET.INITIALIZER_OPEN:
        case ApexTokenTypes.BRACKET.INITIALIZER_CLOSE:
        case ApexTokenTypes.BRACKET.ANNOTATION_PARAM_OPEN:
        case ApexTokenTypes.BRACKET.ANNOTATION_PARAM_CLOSE:
        case ApexTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_OPEN:
        case ApexTokenTypes.BRACKET.PARENTHESIS_DECLARATION_PARAM_CLOSE:
        case ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_OPEN:
        case ApexTokenTypes.BRACKET.PARENTHESIS_GUARD_CLOSE:
        case ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_OPEN:
        case ApexTokenTypes.BRACKET.PARENTHESIS_PARAM_CLOSE:
        case ApexTokenTypes.BRACKET.QUERY_START:
        case ApexTokenTypes.BRACKET.QUERY_END:
        case ApexTokenTypes.BRACKET.INNER_QUERY_START:
        case ApexTokenTypes.BRACKET.INNER_QUERY_END:
            return true;
    }
    return false;
}