// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://client.dtmnebula.microsoft.com/Home"}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectPortal } from './portal';

const caseNumber = '1234567890123456';
const workspace = '12345678-1234-1234-1234-123456789abc';
const filename = 'synthetic.txt';
const baseUrl = `https://api.dtmnebula.microsoft.com/files/${workspace}/download?filename=${filename}`;
let link: HTMLAnchorElement;
let click: ReturnType<typeof vi.fn>;
let rowData: Record<string, unknown>;
let context: Record<string, unknown>;
let contextFor: ReturnType<typeof vi.fn>;

beforeEach(() => {
    document.body.innerHTML = `
        <div id="case"><div><span>SR Number:</span> <span>${caseNumber}</span> <span>(Active)</span></div></div>
        <ul><li class="ui-tabs-active"><a href="#external">External</a></li><li><a>Internal</a></li></ul>
        <section id="external"><table><thead><tr><th>File name <span>\u2191</span></th><th>Size</th></tr></thead>
        <tbody><tr><td><a data-bind="text: $data.friendlyName || fileName, click: $root.downloadFileClicked">${filename}</a></td><td>12 B</td></tr></tbody>
        </table></section>`;
    // jsdom has no layout. Visibility still checks all ancestor styles/attributes.
    vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList);
    link = document.querySelector('td a')!;
    click = vi.fn();
    vi.spyOn(link, 'click').mockImplementation(click);
    rowData = { filePathUri: baseUrl };
    context = { $data: rowData };
    contextFor = vi.fn(() => context);
    vi.stubGlobal('ko', { contextFor });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
});

describe('inspectPortal standalone diagnostic', () => {
    it('returns only the credential-free base and never clicks during inspection', () => {
        const before = document.body.innerHTML;
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'ready', baseUrl });
        expect(contextFor).toHaveBeenCalledExactlyOnceWith(link);
        expect(click).not.toHaveBeenCalled();
        expect(document.body.innerHTML).toBe(before);
    });

    it('revalidates and clicks the unique link exactly once without returning its URL', () => {
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'clicked' });
        expect(click).toHaveBeenCalledTimes(1);
    });

    it('accepts the actual quoted binding and fileName query for read-only inspection and click', () => {
        const actualBase = baseUrl.replace('?filename=', '?fileName=');
        link.setAttribute('data-bind', "'text': $data.friendlyName || fileName,click: $root.downloadFileClicked , 'attr':{'title': fileName}");
        rowData.filePathUri = actualBase;
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'ready', baseUrl: actualBase });
        expect(click).not.toHaveBeenCalled();
        expect(inspectPortal(caseNumber, workspace, filename, actualBase)).toEqual({ status: 'clicked' });
        expect(click).toHaveBeenCalledTimes(1);
    });

    it.each(['', "'", '"'])('accepts known binding keys with paired %j quotes and fixed expressions', quote => {
        link.setAttribute('data-bind', `${quote}text${quote}: fileName, ${quote}click${quote}: $root.downloadFileClicked, ${quote}attr${quote}: {${quote}title${quote}: fileName}, ${quote}title${quote}: fileName`);
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'ready', baseUrl });
        expect(click).not.toHaveBeenCalled();
    });

    it.each([
        `'text": fileName, click: $root.downloadFileClicked`,
        `"click': $root.downloadFileClicked`,
        `click: $root.downloadFileClicked, 'attr": {title: fileName}`,
        `click: $root.downloadFileClicked, attr: {"title': fileName}`,
        `click: $root.downloadFileClicked, 'title": fileName`,
        `click: $root.downloadFileClicked, 'unknown': fileName`,
        `click: $root.downloadFileClicked, attr: {"unknown": fileName}`,
        `'click': '$root.downloadFileClicked'`,
        `click: $root.downloadFileClicked, "text": 'fileName'`,
        `click: $root.downloadFileClicked, "click": $root.downloadFileClicked`,
    ])('rejects malformed or unapproved binding %#', binding => {
        link.setAttribute('data-bind', binding);
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('requires the complete 19-digit task identity', () => {
        document.getElementById('case')!.textContent = `SR Number: ${caseNumber}123 (Active)`;
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'unavailable' });
        expect(inspectPortal(`${caseNumber}123`, workspace, filename)).toEqual({ status: 'ready', baseUrl });
        expect(click).not.toHaveBeenCalled();
    });

    it.each(['', ' (Active)', '\t(Active)\n', '(Active)'])('accepts nested case labels with only the fixed optional suffix %j', suffix => {
        document.getElementById('case')!.innerHTML = `<div><span>SR\t Number :</span> <span>${caseNumber}</span><span>${suffix}</span></div>`;
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'ready', baseUrl });
        expect(click).not.toHaveBeenCalled();
    });

    it.each(['(Inactive)', '(active)', '(Active) extra', '(Active)(Active)', 'Active', '( Active )'])('rejects unconfirmed or trailing case text %j', suffix => {
        document.getElementById('case')!.innerHTML = `<div><span>SR Number:</span> <span>${caseNumber}</span> <span>${suffix}</span></div>`;
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it.each(['File name', 'File name \u2191', 'File name\u2193', 'File name \n\u2193', 'File name\u2191'])('accepts only the fixed file header and optional sort arrow %j', header => {
        document.querySelector('th')!.textContent = header;
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'ready', baseUrl });
        expect(click).not.toHaveBeenCalled();
    });

    it.each(['File names', 'File name extra', 'File name \u2191\u2193', 'File name \u2191 extra', 'File name ^'])('rejects header prefix lookalikes %j', header => {
        document.querySelector('th')!.textContent = header;
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('accepts whitespace-heavy fixedheader spans inside th div wrappers', () => {
        for (const [index, label] of ['File name', 'Size'].entries()) {
            const header = document.querySelectorAll('th')[index];
            const padding = ' '.repeat(88);
            header.innerHTML = `<div>${padding}<span class="fixedheader">${label}</span>${padding}</div>`;
            expect(header.textContent!.length).toBe(176 + label.length);
        }
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'ready', baseUrl });
        expect(contextFor).toHaveBeenCalledExactlyOnceWith(link);
        expect(click).not.toHaveBeenCalled();
    });

    it('normalizes header whitespace without inserting or removing text-boundary spaces', () => {
        document.querySelector('th')!.innerHTML = '<div>\n<span>Fi</span><span>le </span><span> name</span>\t</div>';
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'ready', baseUrl });
        expect(click).not.toHaveBeenCalled();
    });

    it('rejects a header with 101 non-whitespace characters', () => {
        document.querySelector('th')!.textContent = 'x'.repeat(101);
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('rejects a header with 129 descendant nodes including empty nodes', () => {
        const header = document.querySelector('th')!;
        header.replaceChildren(document.createTextNode('File name'));
        for (let index = 0; index < 128; index++) {
            header.append(index % 3 === 0 ? document.createElement('span')
                : index % 3 === 1 ? document.createTextNode('') : document.createComment(''));
        }
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('rejects two file columns even when their sort arrows differ', () => {
        const duplicate = document.createElement('th');
        duplicate.textContent = 'File name \u2193';
        document.querySelector('thead tr')!.append(duplicate);
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it.each([101, 255])('keeps the filename limit separate from the 100-character structural label limit: %i', length => {
        const longFilename = 'a'.repeat(length - 4) + '.txt';
        const longBaseUrl = baseUrl.replace(filename, longFilename);
        link.textContent = longFilename;
        rowData.filePathUri = longBaseUrl;
        expect(inspectPortal(caseNumber, workspace, longFilename)).toEqual({ status: 'ready', baseUrl: longBaseUrl });
        expect(click).not.toHaveBeenCalled();
    });

    it.each([
        ['2234567890123456', workspace, filename],
        ['123', workspace, filename],
        [caseNumber, workspace.toUpperCase(), filename],
        [caseNumber, '22345678-1234-1234-1234-123456789abc', filename],
        [caseNumber, workspace, 'other.txt'],
        [caseNumber, workspace, '../synthetic.txt'],
        [caseNumber, workspace, 'folder\\synthetic.txt'],
        [caseNumber, workspace, 'a'.repeat(256)],
        [caseNumber, workspace, ''],
    ])('rejects invalid or mismatched inputs: %s / %s / %s', (caseId, root, name) => {
        expect(inspectPortal(caseId, root, name, baseUrl)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it.each(['case', 'file'])('rejects ambiguous %s identity', kind => {
        const target = kind === 'case' ? document.getElementById('case')! : link.closest('tr')!;
        target.parentElement!.append(target.cloneNode(true));
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it.each(['$data', 'filePathUri', 'ko', 'contextFor'])('never invokes a %s accessor', key => {
        const getter = vi.fn(() => { throw new Error('synthetic getter must not run'); });
        if (key === 'ko') vi.stubGlobal('ko', undefined);
        const owner = key === '$data' ? context : key === 'filePathUri' ? rowData
            : key === 'ko' ? window : (window as unknown as { ko: object }).ko;
        Object.defineProperty(owner, key, { get: getter, configurable: true });
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(getter).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('does not enumerate unrelated model properties or invoke a model function', () => {
        const getter = vi.fn();
        Object.defineProperty(rowData, 'unrelated', { get: getter });
        const observable = vi.fn(() => baseUrl);
        rowData.filePathUri = observable;
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'unavailable' });
        expect(getter).not.toHaveBeenCalled();
        expect(observable).not.toHaveBeenCalled();
    });

    it('rejects inherited model values', () => {
        context.$data = Object.create({ filePathUri: baseUrl });
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'unavailable' });
    });

    it.each(['active', 'selected', 'ui-tabs-active', 'aria'])('accepts the fixed External tab marker %s', marker => {
        const tab = document.querySelector('li')!;
        tab.className = marker === 'aria' ? '' : marker;
        if (marker === 'aria') tab.setAttribute('aria-selected', 'true');
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'ready', baseUrl });
    });

    it('accepts the active presentation wrapper and selected External anchor as one tab without a panel', () => {
        document.querySelector('ul')!.innerHTML = '<li role="presentation" class="active"><a role="tab" aria-selected="true" href="#">External</a></li>';
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'ready', baseUrl });
        expect(contextFor).toHaveBeenCalledExactlyOnceWith(link);
        expect(click).not.toHaveBeenCalled();
    });

    it('rejects two independent selected External tabs after normalizing their wrappers', () => {
        document.querySelector('ul')!.innerHTML = '<li role="presentation" class="active"><a role="tab" aria-selected="true" href="#">External</a></li>'.repeat(2);
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('rejects a presentation wrapper whose first anchor differs from the selected nested tab link', () => {
        document.querySelector('ul')!.innerHTML = '<li role="presentation" class="active"><a href="#"></a><a role="tab" aria-selected="true" href="#">External</a></li>';
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('rejects the Internal tab even when its attachment table is visible', () => {
        document.querySelector('li')!.className = '';
        document.querySelectorAll('li')[1].className = 'active';
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it.each(['hidden', 'dialog', 'headers', 'binding', 'binding-call', 'binding-duplicate', 'binding-quoted'])('rejects unsafe UI: %s', kind => {
        if (kind === 'hidden') document.getElementById('case')!.style.display = 'none';
        if (kind === 'dialog') document.body.insertAdjacentHTML('beforeend', '<div role="dialog">Synthetic dialog</div>');
        if (kind === 'headers') document.querySelector('th')!.textContent = 'Other';
        if (kind === 'binding') link.setAttribute('data-bind', 'click: $root.otherHandler');
        if (kind === 'binding-call') link.setAttribute('data-bind', 'click: $root.downloadFileClicked()');
        if (kind === 'binding-duplicate') link.setAttribute('data-bind', 'click: $root.downloadFileClicked, click: other');
        if (kind === 'binding-quoted') link.setAttribute('data-bind', "text: 'x, click: $root.downloadFileClicked, x'");
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it.each([
        baseUrl.replace('api.dtmnebula.microsoft.com', 'login.microsoftonline.com'),
        baseUrl.replace('https:', 'http:'),
        baseUrl.replace('api.dtmnebula.microsoft.com', 'api.dtmnebula.microsoft.com.evil.invalid'),
        baseUrl.replace('api.dtmnebula.microsoft.com', 'user@api.dtmnebula.microsoft.com'),
        baseUrl.replace('api.dtmnebula.microsoft.com', 'api.dtmnebula.microsoft.com:443'),
        baseUrl.replace('api.dtmnebula.microsoft.com', 'API.dtmnebula.microsoft.com'),
        `${baseUrl}#fragment`,
        `${baseUrl}&access_token=synthetic`,
        `${baseUrl}&%73ig=synthetic`,
        `${baseUrl}&other=synthetic`,
        `${baseUrl}&filename=${filename}`,
        `${baseUrl}&fileName=${filename}`,
        baseUrl.replace('?filename=', '?FileName='),
        baseUrl.replace(workspace, `${workspace}-suffix`),
        baseUrl.replace(`/${workspace}/`, `/${workspace}%2Fother/`),
        baseUrl.replace('/download?', '/../download?'),
        baseUrl.replace(filename, 'different.txt'),
        baseUrl.replace(filename, '%FF'),
    ])('rejects untrusted base URL %# without echoing it', value => {
        rowData.filePathUri = value;
        expect(inspectPortal(caseNumber, workspace, filename, value)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it('rejects token-shaped values even in the allowed filename query', () => {
        const tokenName = 'eyJsynthetic.payload.signature';
        link.textContent = tokenName;
        rowData.filePathUri = baseUrl.replace(filename, tokenName);
        expect(inspectPortal(caseNumber, workspace, tokenName)).toEqual({ status: 'unavailable' });
    });

    it('rejects an authentication document rather than treating it as the portal', () => {
        const authWindow: { top?: unknown; location: URL } = { location: new URL('https://login.microsoftonline.com/') };
        authWindow.top = authWindow;
        vi.stubGlobal('window', authWindow);
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('rejects a child frame even at the portal origin', () => {
        vi.stubGlobal('window', { top: {}, location: new URL('https://client.dtmnebula.microsoft.com/Home') });
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('rejects a changed base between read-only inspection and click', () => {
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'ready', baseUrl });
        rowData.filePathUri = baseUrl.replace('/download?', '/replacement?');
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it('requires raw equality even for equivalent query encodings', () => {
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl.replace('synthetic', '%73ynthetic')))
            .toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });

    it('fails closed when the bounded document walk is exhausted', () => {
        const filler = document.createElement('div');
        for (let i = 0; i < 6001; i++) filler.append(document.createElement('i'));
        document.body.append(filler);
        expect(inspectPortal(caseNumber, workspace, filename, baseUrl)).toEqual({ status: 'unavailable' });
        expect(contextFor).not.toHaveBeenCalled();
        expect(click).not.toHaveBeenCalled();
    });

    it('returns no exception text when the known locator fails', () => {
        contextFor.mockImplementation(() => { throw new Error('synthetic private detail'); });
        expect(inspectPortal(caseNumber, workspace, filename)).toEqual({ status: 'unavailable' });
        expect(click).not.toHaveBeenCalled();
    });
});
