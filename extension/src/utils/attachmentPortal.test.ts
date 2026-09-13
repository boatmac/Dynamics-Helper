// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://client.dtmnebula.microsoft.com/Home"}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readAttachmentPortal, type AttachmentPortalAction } from './attachmentPortal';

const caseNumber = '1234567890123456';
const workspace = '12345678-1234-1234-1234-123456789abc';
const filename = 'synthetic.txt';
const baseFor = (name: string) => `https://api.dtmnebula.microsoft.com/api/workspaces/${workspace}/files/download?filename=${encodeURIComponent(name)}`;
const baseUrl = baseFor(filename);
const download: AttachmentPortalAction = { kind: 'download', baseUrl, filename };
let link: HTMLAnchorElement;
let click: ReturnType<typeof vi.fn>;
let tabClick: ReturnType<typeof vi.fn>;
let contextFor: ReturnType<typeof vi.fn>;
let data: Record<string, unknown>;
let contexts: Map<Element, { $data: Record<string, unknown> }>;

function addRow(name: string, size = '12 B') {
    const row = document.createElement('tr');
    const anchor = document.createElement('a');
    anchor.textContent = name;
    anchor.setAttribute('data-bind', 'text: fileName, click: $root.downloadFileClicked');
    row.insertCell().append(anchor);
    row.insertCell().textContent = size;
    document.querySelector('tbody')!.append(row);
    contexts.set(anchor, { $data: { filePathUri: baseFor(name) } });
    vi.spyOn(anchor, 'click').mockImplementation(click);
    return anchor;
}

function ready(names = [filename], skipped = 0, inventoryComplete = true) {
    return { status: 'ready', files: names.map(name => ({ baseUrl: baseFor(name), filename: name, workspace })), skipped, inventoryComplete };
}

function workspaceDialog(number = caseNumber) {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.innerHTML = `<div><p>No workspace exists for case ${number}. Create a workspace for this case?</p></div><footer><button>Cancel</button><button>Create</button></footer>`;
    document.body.append(dialog);
    const clicks = Array.from(dialog.querySelectorAll('button')).map(button => vi.spyOn(button, 'click').mockImplementation(() => {}));
    return { dialog, clicks };
}

beforeEach(() => {
    document.body.innerHTML = `
        <div id="case"><div><span>SR Number:</span> <span>${caseNumber}</span> <span>(Active)</span></div></div>
        <ul><li class="ui-tabs-active"><a href="#external">External</a></li><li><a>Internal</a></li></ul>
        <section id="external"><table><thead><tr><th>File name <span>\u2191</span></th><th>Size</th></tr></thead>
        <tbody></tbody></table></section>`;
    // Synthetic layout only; ancestor visibility checks remain active. No Chrome APIs.
    vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList);
    contexts = new Map();
    click = vi.fn();
    tabClick = vi.fn();
    vi.spyOn(document.querySelector('li a') as HTMLAnchorElement, 'click').mockImplementation(tabClick);
    link = addRow(filename);
    data = contexts.get(link)!.$data;
    contextFor = vi.fn((element: Element) => contexts.get(element));
    vi.stubGlobal('ko', { contextFor });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
    window.history.replaceState(null, '', '/Home');
});

describe('readAttachmentPortal MAIN snapshot', () => {
    it.each(['panel', 'unlinked', 'task'])('inspects folder_unavailable with %s identity without inferring zero or taking actions', kind => {
        const number = kind === 'task' ? `${caseNumber}123` : caseNumber;
        document.getElementById('case')!.textContent = `SR Number: ${number} (Active)`;
        if (kind === 'unlinked') document.querySelector('li a')!.setAttribute('href', '#');
        document.getElementById('external')!.innerHTML = '<div><p>No files under this folder. You may not have permission to access this folder.</p></div>';
        vi.stubGlobal('ko', undefined);
        const before = document.body.innerHTML;
        expect(readAttachmentPortal(number)).toEqual({ status: 'folder_unavailable' });
        expect(readAttachmentPortal(number, { kind: 'inspect' }, true)).toEqual({ status: 'folder_unavailable' });
        expect(readAttachmentPortal(number, { kind: 'select_external' })).toEqual({ status: 'unavailable' });
        expect(readAttachmentPortal(number, download)).toEqual({ status: 'unavailable' });
        expect(document.body.innerHTML).toBe(before);
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
        expect(tabClick).not.toHaveBeenCalled();
    });

    it.each(['hidden', 'hidden-part', 'outside-panel', 'duplicate', 'unlinked-duplicate', 'generic-empty', 'permission-only',
        'extra-text', 'wrong-case', 'task-suffix', 'missing-header', 'duplicate-header', 'missing-tab', 'unselected',
        'hidden-panel', 'missing-panel', 'dialog', 'table', 'file-row', 'file-link', 'text-budget', 'node-budget', 'origin', 'frame'])(
        'does not infer folder_unavailable from %s evidence', kind => {
            const panel = document.getElementById('external')!;
            panel.innerHTML = '<p>No files under this folder. You may not have permission to access this folder.</p>';
            const message = panel.querySelector('p')!;
            if (kind === 'hidden') message.hidden = true;
            if (kind === 'hidden-part') message.innerHTML = 'No files under this folder. <span hidden>You may not have permission to access this folder.</span>';
            if (kind === 'outside-panel') document.body.append(message);
            if (kind === 'duplicate' || kind === 'unlinked-duplicate') message.after(message.cloneNode(true));
            if (kind === 'unlinked-duplicate') document.querySelector('li a')!.setAttribute('href', '#');
            if (kind === 'generic-empty') message.textContent = 'No files under this folder.';
            if (kind === 'permission-only') message.textContent = 'You may not have permission to access this folder.';
            if (kind === 'extra-text') message.append(' Please retry.');
            if (kind === 'wrong-case') document.getElementById('case')!.textContent = 'SR Number: 2234567890123456';
            if (kind === 'task-suffix') document.getElementById('case')!.textContent = `SR Number: ${caseNumber}123`;
            if (kind === 'missing-header') document.getElementById('case')!.remove();
            if (kind === 'duplicate-header') document.getElementById('case')!.after(document.getElementById('case')!.cloneNode(true));
            if (kind === 'missing-tab') document.querySelector('ul')!.remove();
            if (kind === 'unselected') document.querySelector('li')!.className = '';
            if (kind === 'hidden-panel') panel.hidden = true;
            if (kind === 'missing-panel') panel.removeAttribute('id');
            if (kind === 'dialog') document.body.insertAdjacentHTML('beforeend', '<div role="dialog">Permission denied</div>');
            if (kind === 'table') panel.insertAdjacentHTML('beforeend', '<table><tr><td>Unknown header</td></tr></table>');
            if (kind === 'file-row') panel.insertAdjacentHTML('beforeend', '<div role="row">synthetic.txt</div>');
            if (kind === 'file-link') panel.append(link);
            if (kind === 'text-budget') message.prepend(' '.repeat(8193));
            if (kind === 'node-budget') message.append(...Array.from({ length: 129 }, () => document.createElement('span')));
            if (kind === 'origin' || kind === 'frame') {
                const fake: { top?: unknown; location: URL } = { location: new URL(kind === 'origin'
                    ? 'https://example.invalid/' : 'https://client.dtmnebula.microsoft.com/Home') };
                fake.top = kind === 'frame' ? {} : fake;
                vi.stubGlobal('window', fake);
            }
            expect(readAttachmentPortal(caseNumber)).toEqual({ status: kind === 'unselected' ? 'external_selectable' : 'unavailable' });
            expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
            expect(contextFor).not.toHaveBeenCalled();
            expect(click).not.toHaveBeenCalled();
            expect(tabClick).not.toHaveBeenCalled();
        },
    );

    it.each([true, false])('keeps table inventory ahead of a folder_unavailable side message; files=%s', hasFiles => {
        if (!hasFiles) link.closest('tr')!.remove();
        document.getElementById('external')!.insertAdjacentHTML('beforeend', '<p>No files under this folder. You may not have permission to access this folder.</p>');
        expect(readAttachmentPortal(caseNumber)).toEqual(ready(hasFiles ? [filename] : []));
        expect(click).not.toHaveBeenCalled();
        expect(tabClick).not.toHaveBeenCalled();
    });

    it.each([caseNumber, `${caseNumber}123`])('inspects the exact workspace-missing dialog for full case %s without KO or any action', number => {
        document.getElementById('case')!.textContent = `SR Number: ${number} (Active)`;
        document.querySelector('ul')!.remove();
        document.getElementById('external')!.remove();
        vi.stubGlobal('ko', undefined);
        const { dialog, clicks } = workspaceDialog(number);
        dialog.querySelector('p')!.innerHTML = ` No workspace exists for case <span>${number}</span>.\n Create a workspace for this case? `;
        const before = document.body.innerHTML;
        expect(readAttachmentPortal(number)).toEqual({ status: 'workspace_missing' });
        expect(readAttachmentPortal(number, { kind: 'inspect' }, true)).toEqual({ status: 'workspace_missing' });
        expect(readAttachmentPortal(number, { kind: 'select_external' })).toEqual({ status: 'unavailable' });
        expect(readAttachmentPortal(number, download)).toEqual({ status: 'unavailable' });
        expect(document.body.innerHTML).toBe(before);
        for (const spy of clicks) expect(spy).not.toHaveBeenCalled();
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
        expect(tabClick).not.toHaveBeenCalled();
    });

    it.each([
        'wrong-case', 'task-suffix', 'wrong-header',
        'duplicate-header', 'hidden-dialog', 'no-dialog-role', 'extra-dialog', 'duplicate-message',
        'hidden-message', 'hidden-message-part', 'no-files', 'permission', 'generic-create', 'extra-error',
        'missing-button', 'hidden-button', 'hidden-button-label', 'duplicate-button', 'wrong-button', 'origin', 'frame',
    ])('does not infer workspace_missing from %s evidence', kind => {
        const { dialog, clicks } = workspaceDialog();
        const message = dialog.querySelector('p')!;
        if (kind === 'wrong-case') message.textContent = 'No workspace exists for case 2234567890123456. Create a workspace for this case?';
        if (kind === 'task-suffix') message.textContent = `No workspace exists for case ${caseNumber}123. Create a workspace for this case?`;
        if (kind === 'wrong-header') document.getElementById('case')!.textContent = 'SR Number: 2234567890123456';
        if (kind === 'duplicate-header') document.getElementById('case')!.after(document.getElementById('case')!.cloneNode(true));
        if (kind === 'hidden-dialog') dialog.hidden = true;
        if (kind === 'no-dialog-role') dialog.removeAttribute('role');
        if (kind === 'extra-dialog') document.body.insertAdjacentHTML('beforeend', '<div role="alertdialog">Permission required</div>');
        if (kind === 'duplicate-message') message.after(message.cloneNode(true));
        if (kind === 'hidden-message') message.hidden = true;
        if (kind === 'hidden-message-part') message.innerHTML = `No workspace exists for case <span hidden>${caseNumber}</span>. Create a workspace for this case?`;
        if (kind === 'no-files') message.textContent = 'No files exist for this case.';
        if (kind === 'permission') message.textContent = 'You do not have permission to access this workspace.';
        if (kind === 'generic-create') message.textContent = 'Create a workspace for this case?';
        if (kind === 'extra-error') dialog.insertAdjacentHTML('afterbegin', '<p>Permission denied</p>');
        if (kind === 'missing-button') dialog.querySelector('button')!.remove();
        if (kind === 'hidden-button') dialog.querySelector('button')!.hidden = true;
        if (kind === 'hidden-button-label') dialog.querySelector('button')!.innerHTML = '<span hidden>Cancel</span>';
        if (kind === 'duplicate-button') dialog.querySelector('footer')!.insertAdjacentHTML('beforeend', '<button>Create</button>');
        if (kind === 'wrong-button') dialog.querySelector('button')!.textContent = 'Dismiss';
        if (kind === 'origin' || kind === 'frame') {
            const fake: { top?: unknown; location: URL } = { location: new URL(kind === 'origin'
                ? 'https://example.invalid/' : 'https://client.dtmnebula.microsoft.com/Home') };
            fake.top = kind === 'frame' ? {} : fake;
            vi.stubGlobal('window', fake);
        }
        // Without a recognized visible dialog, missing inventory is still unknown.
        document.querySelector('table')!.remove();
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'unavailable' });
        expect(readAttachmentPortal(caseNumber, { kind: 'select_external' })).toEqual({ status: 'unavailable' });
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        for (const spy of clicks) expect(spy).not.toHaveBeenCalled();
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
        expect(tabClick).not.toHaveBeenCalled();
    });

    it.each(['missing', 'hidden', 'aria-hidden-background'])('uses the exact modal identity with %s header, but still requires a header without the modal', kind => {
        const header = document.getElementById('case')!;
        if (kind === 'missing') header.remove();
        if (kind === 'hidden') header.hidden = true;
        if (kind === 'aria-hidden-background') {
            const background = document.createElement('main');
            background.setAttribute('aria-hidden', 'true');
            background.append(...Array.from(document.body.childNodes));
            document.body.append(background);
        }
        const { dialog, clicks } = workspaceDialog();
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'workspace_missing' });
        expect(readAttachmentPortal(caseNumber, { kind: 'inspect' }, true)).toEqual({ status: 'workspace_missing' });
        expect(readAttachmentPortal(caseNumber, { kind: 'select_external' })).toEqual({ status: 'unavailable' });
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        dialog.querySelector('p')!.textContent = `No workspace exists for case ${caseNumber}123. Create a workspace for this case?`;
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'unavailable' });
        dialog.remove();
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'unavailable' });
        expect(readAttachmentPortal(caseNumber, { kind: 'select_external' })).toEqual({ status: 'unavailable' });
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        for (const spy of clicks) expect(spy).not.toHaveBeenCalled();
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
        expect(tabClick).not.toHaveBeenCalled();
    });

    it.each(['same-content', 'multiple-wrappers', 'extra-text', 'extra-button', 'empty-link', 'text-budget', 'node-budget', 'independent-dialog'])(
        'collapses only equivalent nested semantic modal wrappers: %s', kind => {
            const { dialog, clicks } = workspaceDialog();
            const outer = document.createElement('div');
            outer.setAttribute('aria-modal', 'true');
            dialog.before(outer);
            outer.append(dialog);
            if (kind === 'multiple-wrappers') {
                const middle = document.createElement('div');
                middle.setAttribute('role', 'dialog');
                outer.append(middle);
                middle.append(dialog);
            }
            if (kind === 'extra-text') outer.append('Permission denied');
            if (kind === 'extra-button') outer.insertAdjacentHTML('beforeend', '<button aria-label="Close"></button>');
            if (kind === 'empty-link') outer.insertAdjacentHTML('beforeend', '<a href="#other" aria-label="Other"></a>');
            if (kind === 'text-budget') outer.append(' '.repeat(8193));
            if (kind === 'node-budget') outer.append(...Array.from({ length: 129 }, () => document.createElement('span')));
            if (kind === 'independent-dialog') outer.after(dialog.cloneNode(true));
            const accepted = kind === 'same-content' || kind === 'multiple-wrappers';
            const before = document.body.innerHTML;
            expect(readAttachmentPortal(caseNumber)).toEqual({ status: accepted ? 'workspace_missing' : 'unavailable' });
            expect(readAttachmentPortal(caseNumber, { kind: 'select_external' })).toEqual({ status: 'unavailable' });
            expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
            expect(document.body.innerHTML).toBe(before);
            for (const spy of clicks) expect(spy).not.toHaveBeenCalled();
            expect(contextFor).not.toHaveBeenCalled();
            expect(click).not.toHaveBeenCalled();
            expect(tabClick).not.toHaveBeenCalled();
        },
    );

    it.each(['context', 'document_limit', 'dialog', 'case_identity', 'external_control', 'inventory', 'file_metadata', 'page_changed'] as const)(
        'adds only opt-in inspect diagnostic %s without changing default/action failures', detail => {
            let expectedCase = caseNumber;
            if (detail === 'context') expectedCase = 'invalid';
            if (detail === 'document_limit') document.body.append(...Array.from({ length: 6001 }, () => document.createElement('i')));
            if (detail === 'dialog') document.body.insertAdjacentHTML('beforeend', '<div role="dialog">Synthetic</div>');
            if (detail === 'case_identity') document.getElementById('case')!.remove();
            if (detail === 'external_control') document.querySelector('ul')!.remove();
            if (detail === 'inventory') document.querySelector('table')!.remove();
            if (detail === 'file_metadata') vi.stubGlobal('ko', {});
            if (detail === 'page_changed') contextFor.mockImplementation(() => {
                link.setAttribute('data-synthetic-change', String(link.getAttribute('data-synthetic-change')) + 'x');
                return { $data: data };
            });
            expect(readAttachmentPortal(expectedCase)).toEqual({ status: 'unavailable' });
            expect(readAttachmentPortal(expectedCase, { kind: 'inspect' }, true)).toEqual({ status: 'unavailable', detail });
            expect(readAttachmentPortal(expectedCase, download, true)).toEqual({ status: 'unavailable' });
            expect(click).not.toHaveBeenCalled();
            expect(tabClick).not.toHaveBeenCalled();
        },
    );

    it('reports only exception for opt-in inspection without exposing thrown text or logging', () => {
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(document, 'createTreeWalker').mockImplementation(() => { throw new Error('https://example.invalid/?sig=synthetic'); });
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'unavailable' });
        expect(readAttachmentPortal(caseNumber, { kind: 'inspect' }, true)).toEqual({ status: 'unavailable', detail: 'exception' });
        expect(readAttachmentPortal(caseNumber, download, true)).toEqual({ status: 'unavailable' });
        expect(warning).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('keeps ready, external_selectable and action acknowledgment schemas unchanged with diagnostics enabled', () => {
        expect(readAttachmentPortal(caseNumber, { kind: 'inspect' }, true)).toEqual(ready());
        expect(readAttachmentPortal(caseNumber, download, true)).toEqual({ status: 'clicked' });
        expect(readAttachmentPortal(caseNumber, { kind: 'select_external' }, true)).toEqual({ status: 'unavailable' });
        document.querySelector('li')!.className = '';
        expect(readAttachmentPortal(caseNumber, { kind: 'inspect' }, true)).toEqual({ status: 'external_selectable' });
        expect(readAttachmentPortal(caseNumber, { kind: 'select_external' }, true)).toEqual({ status: 'clicked' });
        expect(click).toHaveBeenCalledTimes(1);
        expect(tabClick).toHaveBeenCalledTimes(1);
    });

    it('returns only credential-free file identities and leaves inspection read-only', () => {
        data.unrelated = 'not returned';
        const before = document.body.innerHTML;
        expect(readAttachmentPortal(caseNumber)).toEqual(ready());
        expect(contextFor).toHaveBeenCalledExactlyOnceWith(link);
        expect(document.body.innerHTML).toBe(before);
        expect(click).not.toHaveBeenCalled();
        expect(tabClick).not.toHaveBeenCalled();
    });

    it('re-reads the snapshot and clicks only the exact current identity once', () => {
        expect(readAttachmentPortal(caseNumber)).toEqual(ready());
        contextFor.mockClear();
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'clicked' });
        expect(contextFor).toHaveBeenCalledExactlyOnceWith(link);
        expect(click).toHaveBeenCalledTimes(1);
        expect(tabClick).not.toHaveBeenCalled();
    });

    it.each(['case', 'uri', 'encoding', 'filename'])('rejects changed %s identity before clicking', change => {
        expect(readAttachmentPortal(caseNumber)).toEqual(ready());
        if (change === 'case') document.getElementById('case')!.textContent = 'SR Number: 2234567890123456 (Active)';
        if (change === 'uri') data.filePathUri = baseUrl.replace('/download?', '/replacement?');
        if (change === 'encoding') data.filePathUri = baseUrl.replace('synthetic', '%73ynthetic');
        if (change === 'filename') link.textContent = 'other.txt';
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it.each(['case', 'tab', 'row', 'navigation', 'duplicate'])('rejects %s mutation inside the known locator', change => {
        contextFor.mockImplementation((element: Element) => {
            if (change === 'case') document.getElementById('case')!.textContent = 'SR Number: 2234567890123456';
            if (change === 'tab') document.querySelector('li')!.className = '';
            if (change === 'row') link.remove();
            if (change === 'navigation') window.history.replaceState(null, '', '/Other');
            if (change === 'duplicate') document.getElementById('case')!.after(document.getElementById('case')!.cloneNode(true));
            return contexts.get(element);
        });
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it('preserves the full 19-digit task identity', () => {
        document.getElementById('case')!.textContent = `SR Number: ${caseNumber}123 (Active)`;
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'unavailable' });
        expect(readAttachmentPortal(`${caseNumber}123`)).toEqual(ready());
    });

    it.each(['', ' (Active)', '\t(Active)\n'])('accepts the fixed optional Active suffix %j', suffix => {
        document.getElementById('case')!.textContent = `SR Number: ${caseNumber}${suffix}`;
        expect(readAttachmentPortal(caseNumber)).toEqual(ready());
    });

    it.each([' (Inactive)', ' (active)', ' (Active) extra', ' (Active)(Active)'])('rejects case suffix %j', suffix => {
        document.getElementById('case')!.textContent = `SR Number: ${caseNumber}${suffix}`;
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it.each(['case', 'table', 'tab'])('rejects independent duplicate %s identity', kind => {
        const target = document.querySelector(kind === 'case' ? '#case' : kind === 'table' ? 'table' : 'li')!;
        target.after(target.cloneNode(true));
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it('counts invalid twins before binding validation and omits both rows', () => {
        const twin = addRow(filename);
        twin.setAttribute('data-bind', 'click: unknown');
        expect(readAttachmentPortal(caseNumber)).toEqual(ready([], 2));
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('accepts only the narrow presentation-wrapper/first-tab-link duplicate', () => {
        document.querySelector('ul')!.innerHTML = '<li role="presentation" class="active"><a role="tab" aria-selected="true" href="#">External</a></li>';
        expect(readAttachmentPortal(caseNumber)).toEqual(ready());
        document.querySelector('li')!.prepend(document.createElement('a'));
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'unavailable' });
    });

    it('reports external_selectable read-only; explicit selection returns clicked, not inventory', () => {
        document.querySelector('li')!.className = '';
        document.getElementById('external')!.hidden = true;
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'external_selectable' });
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        expect(tabClick).not.toHaveBeenCalled();
        expect(readAttachmentPortal(caseNumber, { kind: 'select_external' })).toEqual({ status: 'clicked' });
        expect(tabClick).toHaveBeenCalledTimes(1);
        expect(click).not.toHaveBeenCalled();
        expect(contextFor).not.toHaveBeenCalled();
    });

    it('does not click an already selected External tab', () => {
        expect(readAttachmentPortal(caseNumber, { kind: 'select_external' })).toEqual({ status: 'unavailable' });
        expect(tabClick).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('does not treat an external navigation link as the External tab action', () => {
        document.querySelector('li')!.className = '';
        document.querySelector('li a')!.setAttribute('href', 'https://example.invalid/');
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'unavailable' });
        expect(readAttachmentPortal(caseNumber, { kind: 'select_external' })).toEqual({ status: 'unavailable' });
        expect(tabClick).not.toHaveBeenCalled();
    });

    it.each(['case', 'disabled', 'duplicate'])('blocks External selection with %s ambiguity/unreadiness', kind => {
        document.querySelector('li')!.className = '';
        if (kind === 'case') document.getElementById('case')!.remove();
        if (kind === 'disabled') document.querySelector('li')!.setAttribute('aria-disabled', 'true');
        if (kind === 'duplicate') document.querySelector('li')!.after(document.querySelector('li')!.cloneNode(true));
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'unavailable' });
        expect(readAttachmentPortal(caseNumber, { kind: 'select_external' })).toEqual({ status: 'unavailable' });
        expect(tabClick).not.toHaveBeenCalled();
    });

    it('requires the matching full case before reporting external_selectable', () => {
        document.querySelector('li')!.className = '';
        document.getElementById('case')!.textContent = `SR Number: ${caseNumber}123`;
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'unavailable' });
        expect(readAttachmentPortal(`${caseNumber}123`)).toEqual({ status: 'external_selectable' });
        expect(tabClick).not.toHaveBeenCalled();
    });

    it('keeps loading unavailable until case and unique External action become selectable', () => {
        document.querySelector('li')!.className = '';
        const caseLabel = document.getElementById('case')!;
        caseLabel.hidden = true;
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'unavailable' });
        caseLabel.hidden = false;
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'external_selectable' });
        expect(tabClick).not.toHaveBeenCalled();
        tabClick.mockImplementation(() => { document.querySelector('li')!.className = 'active'; });
        expect(readAttachmentPortal(caseNumber, { kind: 'select_external' })).toEqual({ status: 'clicked' });
        expect(readAttachmentPortal(caseNumber)).toEqual(ready());
        expect(tabClick).toHaveBeenCalledTimes(1);
    });

    it('accepts whitespace-heavy headers without corrupting adjacent text boundaries', () => {
        document.querySelector('th')!.innerHTML = `<div>${' '.repeat(88)}<span>Fi</span><span>le </span><span> name</span>${' '.repeat(88)}</div>`;
        document.querySelectorAll('th')[1].innerHTML = `<div>${' '.repeat(88)}<span>Size</span>${' '.repeat(88)}</div>`;
        expect(readAttachmentPortal(caseNumber)).toEqual(ready());
    });

    it.each(['File name', 'File name\u2191', 'File name \n\u2193'])('accepts fixed header %j', header => {
        document.querySelector('th')!.textContent = header;
        expect(readAttachmentPortal(caseNumber)).toEqual(ready());
    });

    it.each(['File names', 'File name extra', 'File name \u2191\u2193'])('rejects unknown header %j', header => {
        document.querySelector('th')!.textContent = header;
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'unavailable' });
    });

    it.each(['', "'", '"'])('accepts observed binding keys quoted with %j', quote => {
        link.setAttribute('data-bind', `${quote}text${quote}: $data.friendlyName || fileName, ${quote}click${quote}: $root.downloadFileClicked, ${quote}attr${quote}: {${quote}title${quote}: fileName}`);
        data.filePathUri = baseUrl.replace('?filename=', '?fileName=');
        expect(readAttachmentPortal(caseNumber)).toEqual({ ...ready(), files: [{ baseUrl: data.filePathUri, filename, workspace }] });
    });

    it.each([
        'click: $root.downloadFileClicked()', 'click: $root.downloadFileClicked, unknown: fileName',
        `'click': '$root.downloadFileClicked'`, `'text": fileName, click: $root.downloadFileClicked`,
        'click: $root.downloadFileClicked, click: $root.downloadFileClicked',
    ])('omits unknown binding %# without invoking the model', binding => {
        link.setAttribute('data-bind', binding);
        expect(readAttachmentPortal(caseNumber)).toEqual(ready([], 1));
        expect(contextFor).not.toHaveBeenCalled();
    });

    it.each([
        baseUrl.replace('/workspaces/', '/files/'),
        baseUrl.replace('/workspaces/', '/Workspaces/'),
        baseUrl.replace('/workspaces/', '/%77orkspaces/'),
        baseUrl.replace('/files/download', `/workspaces/${workspace}/download`),
        baseUrl.replace(workspace, 'opaque-static-remainder'),
        baseUrl.replace(workspace, workspace.toUpperCase()),
        baseUrl.replace(`/workspaces/${workspace}`, `/workspaces/not-a-guid/${workspace}`),
        baseUrl.replace('/files/download', `/../download`),
        baseUrl.replace(workspace, `${workspace}%2Fother`),
        baseUrl.replace('https:', 'http:'),
        baseUrl.replace('api.dtmnebula.microsoft.com', 'api.dtmnebula.microsoft.com.evil.invalid'),
        baseUrl.replace('api.dtmnebula.microsoft.com', 'user@api.dtmnebula.microsoft.com'),
        baseUrl.replace('api.dtmnebula.microsoft.com', 'api.dtmnebula.microsoft.com:443'),
        `${baseUrl}#fragment`, `${baseUrl}&sig=synthetic`, `${baseUrl}&%74oken=synthetic`,
        `${baseUrl}&other=synthetic`, `${baseUrl}&fileName=${filename}`, `${baseUrl}&filename=${filename}`,
        baseUrl.replace('?filename=', '?FileName='), baseUrl.replace(filename, '%FF'),
        baseUrl.replace(filename, 'different.txt'), baseUrl.replace('/download', `/${'x'.repeat(16384)}`),
    ])('omits an untrusted URI %# without echoing it', uri => {
        data.filePathUri = uri;
        expect(readAttachmentPortal(caseNumber)).toEqual(ready([], 1));
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it.each(['$data', 'filePathUri', 'contextFor', 'ko'])('does not invoke a %s getter', key => {
        const getter = vi.fn(() => { throw new Error('synthetic private detail'); });
        const owner = key === '$data' ? contexts.get(link)! : key === 'filePathUri' ? data
            : key === 'ko' ? window : (window as unknown as { ko: object }).ko;
        Object.defineProperty(owner, key, { get: getter, configurable: true });
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        expect(getter).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('does not call observables or accept inherited model fields', () => {
        const observable = vi.fn(() => baseUrl);
        data.filePathUri = observable;
        expect(readAttachmentPortal(caseNumber)).toEqual(ready([], 1));
        expect(observable).not.toHaveBeenCalled();
        contexts.get(link)!.$data = Object.create({ filePathUri: baseUrl });
        expect(readAttachmentPortal(caseNumber)).toEqual(ready([], 1));
    });

    it.each(['png', 'jpg', 'jpeg', 'txt', 'log', 'json', 'xml', 'csv', 'md', 'JPG'])('includes supported extension %s', ext => {
        link.closest('tr')!.remove();
        addRow(`synthetic.${ext}`);
        expect(readAttachmentPortal(caseNumber)).toEqual(ready([`synthetic.${ext}`]));
    });

    it.each(['archive.zip', 'document.pdf', 'page.html', 'no-extension', 'a/b.txt', 'a\\b.txt', 'a\u0000.txt', 'a'.repeat(252) + '.txt', 'sig=synthetic.txt'])('omits unsupported/unsafe filename %#', name => {
        link.closest('tr')!.remove();
        addRow(name);
        expect(readAttachmentPortal(caseNumber)).toEqual(ready([], 1));
    });

    it.each([101, 255])('accepts a safe filename of %i characters', length => {
        link.closest('tr')!.remove();
        const name = 'a'.repeat(length - 4) + '.txt';
        addRow(name);
        expect(readAttachmentPortal(caseNumber)).toEqual(ready([name]));
    });

    it.each(['', 'unknown', '-1 B', 'NaN MB', '9007199254740992 B'])('omits invalid declared size %j', size => {
        document.querySelector('tbody tr')!.children[1].textContent = size;
        expect(readAttachmentPortal(caseNumber)).toEqual(ready([], 1));
    });

    it.each(['0 B', '1.5 MB', '2 MiB'])('accepts declared size %j without claiming actual bytes', size => {
        document.querySelector('tbody tr')!.children[1].textContent = size;
        expect(readAttachmentPortal(caseNumber)).toEqual(ready());
    });

    it('enumerates all visible omissions while selecting only four eligible files in order', () => {
        addRow('unsupported.zip');
        for (let i = 0; i < 5; i++) addRow(`extra${i}.txt`);
        const hidden = addRow('hidden.txt');
        hidden.closest('tr')!.hidden = true;
        expect(readAttachmentPortal(caseNumber)).toEqual(ready([filename, 'extra0.txt', 'extra1.txt', 'extra2.txt'], 3));
        expect(readAttachmentPortal(caseNumber, { kind: 'download', filename: 'extra4.txt', baseUrl: baseFor('extra4.txt') })).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it('reads at most 32 rows, counts visible excess, and denies download with unread duplicate risk', () => {
        for (let i = 0; i < 31; i++) addRow(`extra${i}.txt`);
        expect(readAttachmentPortal(caseNumber)).toEqual(ready([filename, 'extra0.txt', 'extra1.txt', 'extra2.txt'], 28));
        addRow(filename);
        contextFor.mockClear();
        expect(readAttachmentPortal(caseNumber)).toEqual(ready([filename, 'extra0.txt', 'extra1.txt', 'extra2.txt'], 29, false));
        expect(contextFor).toHaveBeenCalledTimes(32);
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it.each([true, false])('reports unknown off-page inventory separately from the exact known skipped count; visible row=%s', hasRow => {
        if (!hasRow) link.closest('tr')!.remove();
        document.getElementById('external')!.insertAdjacentHTML('beforeend', '<button aria-label="Next page" aria-disabled="false">Next</button>');
        const nextClick = vi.spyOn(document.querySelector('button')!, 'click').mockImplementation(() => {});
        expect(readAttachmentPortal(caseNumber)).toEqual(ready(hasRow ? [filename] : [], 0, false));
        expect(click).not.toHaveBeenCalled();
        expect(tabClick).not.toHaveBeenCalled();
        expect(nextClick).not.toHaveBeenCalled();
    });

    it.each(['disabled', 'aria', 'wrapper', 'hidden', 'outside'])('does not mistake %s Next controls for enabled pagination', state => {
        const wrapper = document.createElement('div');
        const next = document.createElement('button');
        next.textContent = 'Next';
        wrapper.append(next);
        (state === 'outside' ? document.body : document.getElementById('external')!).append(wrapper);
        if (state === 'disabled') next.disabled = true;
        if (state === 'aria') next.setAttribute('aria-disabled', 'true');
        if (state === 'wrapper') wrapper.className = 'disabled';
        if (state === 'hidden') wrapper.hidden = true;
        expect(readAttachmentPortal(caseNumber)).toEqual(ready());
    });

    it.each(['removed', 'hidden'])('returns a complete empty inventory without KO only for a recognized table with no visible rows; row=%s', state => {
        if (state === 'removed') link.closest('tr')!.remove();
        else link.closest('tr')!.hidden = true;
        vi.stubGlobal('ko', undefined);
        expect(readAttachmentPortal(caseNumber)).toEqual(ready([]));
        document.querySelector('table')!.remove();
        expect(readAttachmentPortal(caseNumber)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
        expect(tabClick).not.toHaveBeenCalled();
    });

    it('does not treat an unrecognized placeholder row as confirmed complete zero inventory', () => {
        document.querySelector('tbody')!.innerHTML = '<tr><td colspan="2">Synthetic unrecognized placeholder</td></tr>';
        expect(readAttachmentPortal(caseNumber)).not.toMatchObject(ready([], 0, true));
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
        expect(tabClick).not.toHaveBeenCalled();
    });

    it.each(['dialog', 'hidden', 'unknown-size-header', 'duplicate-header', 'budget'])('fails closed for %s UI', kind => {
        if (kind === 'dialog') document.body.insertAdjacentHTML('beforeend', '<div role="dialog">Synthetic</div>');
        if (kind === 'hidden') document.getElementById('external')!.hidden = true;
        if (kind === 'unknown-size-header') document.querySelectorAll('th')[1].textContent = 'Unknown';
        if (kind === 'duplicate-header') document.querySelector('thead tr')!.insertAdjacentHTML('beforeend', '<th>File name</th>');
        if (kind === 'budget') {
            const filler = document.createElement('div');
            for (let i = 0; i < 6001; i++) filler.append(document.createElement('i'));
            document.body.append(filler);
        }
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it.each(['origin', 'frame'])('rejects wrong %s without real browser interaction', kind => {
        const fake: { top?: unknown; location: URL } = { location: new URL(kind === 'origin'
            ? 'https://login.microsoftonline.com/' : 'https://client.dtmnebula.microsoft.com/Home') };
        fake.top = kind === 'frame' ? {} : fake;
        vi.stubGlobal('window', fake);
        expect(readAttachmentPortal(caseNumber, download)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('rejects an unknown action without effects', () => {
        expect(readAttachmentPortal(caseNumber, { kind: 'unknown' } as unknown as AttachmentPortalAction)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
        expect(tabClick).not.toHaveBeenCalled();
    });
});
