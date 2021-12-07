import { Datatypes } from "@aurahelper/core";
import { XMLUtils } from "../../xml/utils";

describe('Testing ./src/utils/utils.js', () => {
    test('Testing createXMLFile()', () => {
        const typeDefinition = {
            field1: {
                datatype: Datatypes.ARRAY
            },
            field2: {
                datatype: Datatypes.OBJECT
            },
            field3: {
                datatype: Datatypes.STRING
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
        let arrayToOrder: any[] = ['c', 'b', 'a'];
        XMLUtils.sort(arrayToOrder);
        expect(arrayToOrder).toEqual(['a', 'b', 'c']);
        arrayToOrder = [3, 2, 1];
        XMLUtils.sort(arrayToOrder);
        expect(arrayToOrder).toEqual([1, 2, 3]);
        arrayToOrder = [{ name: 'testC', value: 'valueC' }, { name: 'testB', value: 'valueB' }];
        XMLUtils.sort(arrayToOrder, ['name', 'value']);
        expect(arrayToOrder).toEqual([{ name: 'testB', value: 'valueB' }, { name: 'testC', value: 'valueC' }]);
        arrayToOrder = [{ name: 'testC', value: 'valueC' }, { name: 'testB', value: 'valueB' }];
        XMLUtils.sort(arrayToOrder, ['name', 'values']);
        expect(arrayToOrder).toEqual([{ name: 'testB', value: 'valueB' }, { name: 'testC', value: 'valueC' }]);
        arrayToOrder = [{ name: 2, value: 2 }, { name: 1, value: 1 }];
        XMLUtils.sort(arrayToOrder, ['name']);
        expect(arrayToOrder).toEqual([{ name: 1, value: 1 }, { name: 2, value: 2 }]);
        arrayToOrder = [{ name: 1, value: 2 }, { name: 2, value: 2 }];
        XMLUtils.sort(arrayToOrder, ['name']);
        expect(arrayToOrder).toEqual([{ name: 1, value: 2 }, { name: 2, value: 2 }]);
        arrayToOrder = [{ name: 1, value: 1 }, { name: 1, value: 1 }];
        XMLUtils.sort(arrayToOrder, ['name']);
        expect(arrayToOrder).toEqual([{ name: 1, value: 1 }, { name: 1, value: 1 }]);
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
                datatype: Datatypes.ARRAY
            },
            field2: {
                datatype: Datatypes.OBJECT
            },
            field3: {
                datatype: Datatypes.STRING
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