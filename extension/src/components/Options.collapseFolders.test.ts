import { describe, expect, it } from 'vitest';
import { collapseFolders } from './Options';
import type { MenuItem } from './MenuLogic';

/**
 * collapseFolders is the shared helper used by BOTH the initial mount path
 * AND handleReset. Before extraction, it was inlined inside the mount
 * useEffect and Reset's `loadItems().then(setItems)` skipped it — items.json
 * ships zero `collapsed` keys, so Reset rendered every folder fully expanded.
 *
 * These tests pin the contract so Reset and mount stay in sync.
 */
describe('collapseFolders', () => {
    it('forces every top-level folder to collapsed=true when undefined', () => {
        const input: MenuItem[] = [
            { type: 'folder', label: 'Favorites', children: [] },
            { type: 'folder', label: 'Tools', children: [] },
        ];
        const result = collapseFolders(input);
        expect(result[0].collapsed).toBe(true);
        expect(result[1].collapsed).toBe(true);
    });

    it('recursively collapses nested folders', () => {
        const input: MenuItem[] = [
            {
                type: 'folder',
                label: 'Outer',
                children: [
                    { type: 'folder', label: 'Inner', children: [] },
                ],
            },
        ];
        const result = collapseFolders(input);
        expect(result[0].collapsed).toBe(true);
        expect(result[0].children![0].collapsed).toBe(true);
    });

    it('preserves explicit collapsed=false (user already expanded the folder)', () => {
        const input: MenuItem[] = [
            { type: 'folder', label: 'OpenedByUser', collapsed: false, children: [] },
        ];
        const result = collapseFolders(input);
        expect(result[0].collapsed).toBe(false);
    });

    it('leaves non-folder items untouched', () => {
        const input: MenuItem[] = [
            { type: 'link', label: 'Docs', url: 'https://example.com' },
        ];
        const result = collapseFolders(input);
        expect(result[0]).toEqual(input[0]);
        expect((result[0] as any).collapsed).toBeUndefined();
    });

    it('matches the items.json default shape (regression: Reset must not render expanded)', () => {
        // Mirror of the 7-root default tree shipped in extension/dist/items.json
        // — every folder has NO `collapsed` key, which is what tripped Reset.
        const defaultShape: MenuItem[] = [
            { type: 'folder', label: 'Favorites', children: [{ type: 'link', label: 'X', url: 'https://x' }] },
            { type: 'folder', label: 'Case Review', children: [] },
            { type: 'folder', label: 'Tools', children: [] },
            { type: 'folder', label: 'Dashboard', children: [] },
            { type: 'folder', label: 'IcM', children: [] },
            { type: 'link', label: 'Dynamics 365 Docs', url: 'https://docs' },
            { type: 'link', label: 'About', url: 'https://about' },
        ];
        const result = collapseFolders(defaultShape);
        const folders = result.filter(i => i.type === 'folder');
        expect(folders.length).toBe(5);
        for (const f of folders) {
            expect(f.collapsed).toBe(true);
        }
    });
});
