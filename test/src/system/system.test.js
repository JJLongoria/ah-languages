const System = require('../../../src/system/system');

describe('Testing ./src/system/system.js', () => {
    test('Testing getAllNamespacesData()', () => {
        const nsData = System.getAllNamespacesData();
    });

    test('Testing getNamespaceData()', () => {
        const nsData = System.getNamespaceData('System');
    });

    test('Testing getAllNamespacesSummary()', () => {
        const nsSummary = System.getAllNamespacesSummary();
    });

    test('Testing getAllNamespacesSummary()', () => {
        const nsSummary = System.getNamespaceSummary('System');
    });

    test('Testing getClass()', () => {
        const cls = System.getClass('System', 'System');
    });

    test('Testing getAuraComponentDetails()', () => {
        const cmpDetails = System.getAuraComponentDetails('System', 'System');
    });
});