import { System } from "../../system/system";

describe('Testing ./src/system/system.js', () => {
    test('Testing getAllNamespacesData()', () => {
        const nsData = System.getAllNamespacesData();
    });

    test('Testing getNamespaceData()', () => {
        let nsData = System.getNamespaceData('System');
        expect(nsData).toBeDefined();
        nsData = System.getNamespaceData('Systems');
        expect(nsData).toBeUndefined();
    });

    test('Testing getAllNamespaces()', () => {
        const nsData = System.getAllNamespaces();
        expect(nsData).toBeDefined();
    });
    test('Testing getAllNamespacesSummary()', () => {
        const nsSummary = System.getAllNamespacesSummary();
        expect(nsSummary).toBeDefined();
    });

    test('Testing getAllNamespacesSummary()', () => {
        let nsSummary = System.getNamespaceSummary('System');
        expect(nsSummary).toBeDefined();
        nsSummary = System.getNamespaceSummary('Systems');
        expect(nsSummary).toBeUndefined();
    });

    test('Testing getClass()', () => {
        let cls = System.getClass('System', 'System');
        cls = System.getClass('System', 'AccessType');
        cls = System.getClass('Database', 'Batchable');
        cls = System.getClass('Database', 'Batchable2');
        cls = System.getClass('Database2', 'Batchable2');
    });

    test('Testing getAuraComponentDetails()', () => {
        const cmpDetails = System.getAuraComponentDetails();
    });
});