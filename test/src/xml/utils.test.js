const XMLUtils = require('../../../src/xml/utils');
const { DataTypes } = require('@ah/core').Values;

describe('Testing ./src/utils/utils.js', () => {
    test('Testing createXMLFile()', () => {
        const typeDefinition = {
            field1: {
                datatype: DataTypes.ARRAY
            },
            field2: {
                datatype: DataTypes.OBJECT
            },
            field3: {
                datatype: DataTypes.STRING
            }
        };
        let fileSchema = XMLUtils.createXMLFile(typeDefinition);
        expect(fileSchema.field1).toEqual([]);
        expect(fileSchema.field2).toEqual({});
        expect(fileSchema.field3).toEqual(undefined);
    });
    test('Testing forceArray()', () => {
        let result = XMLUtils.forceArray('hi');
        expect(result).toEqual(['hi']);
        result = XMLUtils.forceArray(['hi']);
        expect(result).toEqual(['hi']);
        result = XMLUtils.forceArray(undefined);
        expect(result).toEqual([]);
    });
    test('Testing sort()', () => {
        let arrayToOrder = ['c', 'b', 'a'];
        XMLUtils.sort(arrayToOrder);
        expect(arrayToOrder).toEqual(['a', 'b', 'c']);
        arrayToOrder = [{ name: 'testC', value: 'valueC' }, { name: 'testB', value: 'valueB' }];
        XMLUtils.sort(arrayToOrder, ['name', 'value']);
        expect(arrayToOrder).toEqual([{ name: 'testB', value: 'valueB' }, { name: 'testC', value: 'valueC' }]);
        arrayToOrder = [{ name: 'testC', value: 'valueC' }, { name: 'testB', value: 'valueB' }];
        XMLUtils.sort(arrayToOrder, ['name', 'values']);
        expect(arrayToOrder).toEqual([{ name: 'testB', value: 'valueB' }, { name: 'testC', value: 'valueC' }]);
        let notArrayToOrder = { name: 'testB', value: 'valueB' };
        XMLUtils.sort(notArrayToOrder);
        expect(notArrayToOrder).toEqual({ name: 'testB', value: 'valueB' });
    });
    test('Testing getAttributes()', () => {
        let obj = {
            '@attrs': {
                name: 'value'
            }
        };
        let result = XMLUtils.getAttributes(obj);
        expect(result).toEqual(['name="value"']);
    });
    test('Testing getText()', () => {
        let obj = {
            '#text': 'value'
        };
        let result = XMLUtils.getText(obj);
        expect(result).toEqual('value');
        delete obj['#text'];
        result = XMLUtils.getText(obj);
        expect(result).toEqual(undefined);
    });
    test('Testing getTabs()', () => {
        let result = XMLUtils.getTabs(2);
        expect(result).toEqual('\t\t');
    });
    test('Testing cleanXMLFile()', () => {
        const xmlDefinition = {
            field1: {
                datatype: DataTypes.ARRAY
            },
            field2: {
                datatype: DataTypes.OBJECT
            },
            field3: {
                datatype: DataTypes.STRING
            }
        };
        const xmlData = {
            field1:["value"],
            field2: {"obj": "value"},
            field3: "value",
            "@attrs": ""
        };
        let result1 = XMLUtils.cleanXMLFile(xmlDefinition, xmlData);
        let result2 = XMLUtils.cleanXMLFile(xmlDefinition);
        //expect(result).toEqual('\t\t');
    });
});