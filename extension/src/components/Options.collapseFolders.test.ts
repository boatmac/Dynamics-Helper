import { describe, expect, it } from 'vitest';
import { collapseFolders } from './Options';
import type { MenuItem } from './MenuLogic';

/**
 * collapseFolders is the shared helper used by BOTH the initial mount path
 * AND handleReset. The tracked public default intentionally omits `collapsed`,
 * so both paths must apply the same recursive runtime transformation.
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

    it('collapses every folder in a mixed default-like tree', () => {
        const defaultShape: MenuItem[] = [
            {
                type: 'folder',
                label: 'Resources',
                children: [{ type: 'link', label: 'Guide', url: 'https://example.com' }],
            },
            { type: 'link', label: 'Release Notes', url: 'https://example.com/releases' },
            { type: 'markdown', label: 'About', content: '# About' },
        ];
        const result = collapseFolders(defaultShape);
        const folders = result.filter(i => i.type === 'folder');
        expect(folders).toHaveLength(1);
        expect(folders[0].collapsed).toBe(true);
    });
});
