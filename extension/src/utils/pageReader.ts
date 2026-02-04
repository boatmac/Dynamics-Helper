import { getReactProps } from './reactFiber';

export interface ScrapedData {
    errorText?: string;
    ticketTitle?: string;
    productCategory?: string;
    caseNumber?: string; // New field for Case Number
    severity?: string; // New field for Severity
    statusReason?: string; // New field for Status Reason
    description?: string;
    context?: string;
    timestamp?: string;
    source?: string;
}

export class PageReader {
    /**
     * Helper to yield control to the main thread to prevent freezing
     */
    private static async yieldToMain() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    /**
     * Helper to find value associated with a label that appears AFTER the value in DOM (common in this UI)
     */
    private static async findValueForLabel(labelText: string, validationRegex?: RegExp, contextNode: Node = document): Promise<string | undefined> {
        // Find all elements containing the label
        // Use relative path .//* to scope to contextNode
        const iterator = document.evaluate(
            `.//*[text()='${labelText}']`, // Start with exact match priority
            contextNode,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        // Safety: Limit checks to prevent freezing on pages with many matches
        const maxChecks = 10;
        const count = Math.min(iterator.snapshotLength, maxChecks);

        for (let i = 0; i < count; i++) {
            // Yield every few iterations
            if (i > 0 && i % 2 === 0) await this.yieldToMain();

            const labelNode = iterator.snapshotItem(i) as HTMLElement;
            if (!labelNode) continue;

            // Strategy 1: Check immediate previous sibling
            // DOM: <ValueDiv>...</ValueDiv> <LabelDiv>Label</LabelDiv>
            let value = this.extractValueFromNode(labelNode.previousElementSibling);
            if (value && (!validationRegex || validationRegex.test(value))) {
                return value;
            }

            // Strategy 2: Check Parent's previous sibling
            // DOM: <Wrapper><ValueDiv>...</ValueDiv></Wrapper> <Wrapper><LabelDiv>Label</LabelDiv></Wrapper>
            if (labelNode.parentElement) {
                value = this.extractValueFromNode(labelNode.parentElement.previousElementSibling);
                if (value && (!validationRegex || validationRegex.test(value))) {
                    return value;
                }
            }
        }
        
        await this.yieldToMain();

        // Fallback: Try contains if exact match failed
        // Note: This is expensive, so we yield before starting it
        const looseIterator = document.evaluate(
            `.//*[contains(text(), '${labelText}')]`,
            contextNode,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        const looseCount = Math.min(looseIterator.snapshotLength, maxChecks);

        for (let i = 0; i < looseCount; i++) {
            if (i > 0 && i % 2 === 0) await this.yieldToMain();

            const labelNode = looseIterator.snapshotItem(i) as HTMLElement;
            if (!labelNode) continue;
            
             // Skip if it's too long (likely a sentence containing the word, not a label)
            if (labelNode.textContent && labelNode.textContent.length > 50) continue;

            // Strategy 1 (Loose)
            let value = this.extractValueFromNode(labelNode.previousElementSibling);
            if (value && (!validationRegex || validationRegex.test(value))) {
                return value;
            }
             // Strategy 2 (Loose)
             if (labelNode.parentElement) {
                value = this.extractValueFromNode(labelNode.parentElement.previousElementSibling);
                if (value && (!validationRegex || validationRegex.test(value))) {
                    return value;
                }
            }
        }

        return undefined;
    }

    private static extractValueFromNode(node: Element | null): string | undefined {
        if (!node) return undefined;
        // Get text, clean it up
        const text = (node.textContent || "").trim();
        // Ignore empty or structural characters if necessary, but usually trim() is enough
        return text || undefined;
    }

    /**
     * Attempts to find error logs or relevant support ticket details on the page.
     * Prioritizes Fluent UI specific selectors and React Props.
     * Async to prevent blocking the UI thread.
     */
    static async scanForErrors(): Promise<ScrapedData | null> {
        const data: ScrapedData = {};
        
        // Define a Context Node to limit searches (Performance)
        // Try to find the main form/content area
        const contextNode = document.querySelector('[role="main"]') || 
                            document.querySelector('[data-automation-id="content-container"]') || 
                            document.body;

        // 1. Selection Based: If user selected text, use that as primary error/description
        const selection = window.getSelection();
        if (selection && selection.toString().length > 5) {
            data.errorText = selection.toString();
            data.source = 'user-selection';
        }

        await this.yieldToMain();

        // 2. Try to find Ticket Title
        // Common selectors for title in support portals
        const titleSelectors = [
            '[data-automation-id="ticket-title"]',
            '[data-test-id="ticket-header-title"]',
            '[id^="formHeaderTitle_"]', // Matches dynamic IDs like formHeaderTitle_27
            'h1', // Generic fallback
            '[role="heading"][aria-level="1"]'
        ];
        
        for (const sel of titleSelectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent) {
                // Remove "- Saved" suffix if present (common system status)
                data.ticketTitle = el.textContent.replace(/- Saved$/, '').trim();
                break;
            }
        }

        await this.yieldToMain();

        // 3. Try to find Case Number / Ticket ID
        const idLabels = ['Case number', 'Work Order Number', 'Incident Number', 'Ticket Number'];
        
        // Regex for 16-digit case number (e.g. 2601190030003106) OR common formats like WO-12345, INC-1234, CAS-01234-A1B2
        const idRegex = /(\b\d{16}\b)|(\b[A-Z]{2,10}-?\d{3,}[-\w]*\b)/;

        // Strategy A: Check specific header container if it exists (Case Number specific)
        const headerControls = document.querySelector('[id^="headerControlsList_"]');
        if (headerControls) {
             const text = headerControls.textContent || '';
             const match = text.match(idRegex);
             if (match) {
                 data.caseNumber = match[0];
             }
        }

        // Strategy B: Generic Label Search for various ID types
        if (!data.caseNumber) {
            // Construct XPath to search for any of the labels
            // Use relative path .//*
            const labelsXPath = idLabels.map(l => `contains(text(), '${l}')`).join(' or ');
            
            const iterator = document.evaluate(
                `.//*[${labelsXPath}]`, 
                contextNode, 
                null, 
                XPathResult.ANY_TYPE, 
                null
            );
            
            let node = iterator.iterateNext();
            let checks = 0;
            // Limit checks to prevent infinite loops on large DOMs
            while (node && checks < 15) { // Reduced max checks
                checks++;
                if (checks % 5 === 0) await this.yieldToMain();

                // Check parent hierarchy for the value
                const parent = node.parentElement;
                if (parent && parent.parentElement) {
                     // Look for numbers or ID-like patterns
                     // Relaxed regex for this search: just look for the label's value which might be a simple number or string
                     // We use the helper logic to find the value next to the label
                     const value = await this.findValueForLabel(node.textContent || '', undefined, contextNode); 
                     if (value && value.length > 3) { // Basic length check
                         data.caseNumber = value;
                         break;
                     }
                }
                node = iterator.iterateNext();
            }
        }
        
        await this.yieldToMain();

        // Strategy C: Direct Regex scan on header container
        if (!data.caseNumber) {
            const headerContainer = document.querySelector('[id^="headerContainer"]'); // or outerHeaderContainer_
             if (headerContainer && headerContainer.textContent) {
                 const match = headerContainer.textContent.match(idRegex);
                 if (match) data.caseNumber = match[0];
             }
        }

        // Strategy D: Last Resort - Check Ticket Title for ID
        if (!data.caseNumber && data.ticketTitle) {
            const titleMatch = data.ticketTitle.match(idRegex);
            if (titleMatch) {
                data.caseNumber = titleMatch[0];
            }
        }

        await this.yieldToMain();

        // 3.1 Try to find Severity (New)
        // Use helper with regex for 1, A, B, C
        data.severity = await this.findValueForLabel('Severity', /^[1ABC]$/i, contextNode);

        // 3.2 Try to find Status Reason (New)
        // Use helper with basic length validation
        data.statusReason = await this.findValueForLabel('Status reason', undefined, contextNode);


        // 4. Try to find Product Category
        const categorySelectors = [
            '#sapTextAreaId', // Specific textarea for Support Area Path
            '[id="sapTextAreaId"]', // Alternative query for the same ID
            'textarea[id*="sapTextArea"]', // Loose match
            'textarea', // Fallback: Check ALL textareas for ID match in loop if needed
            '[data-automation-id="product-category"]',
            '.breadcrumb-item',
            '[aria-label="Product Category"]'
        ];
        
        for (const sel of categorySelectors) {
            let el: Element | null = null;
            
            if (sel === 'textarea') {
                const textareas = document.querySelectorAll('textarea');
                for (const ta of Array.from(textareas)) {
                     if (ta.id && ta.id.toLowerCase().includes('saptextarea')) {
                         el = ta;
                         break;
                     }
                }
            } else {
                el = document.querySelector(sel);
            }

            if (el) {
                const val = (el as HTMLTextAreaElement).value || el.textContent;
                if (val) {
                    data.productCategory = val.trim();
                    break;
                }
            }
        }

        await this.yieldToMain();

        // 4. Try to find Description if not selected
        if (!data.errorText) {
             const descSelectors = [
                '[data-automation-id="ticket-description"]',
                '[data-test-id="case-description"]',
                '.ticket-description-body',
                'textarea[aria-label="Customer Statement"]'
            ];
            
            for (const sel of descSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                    // Check if it's a textarea/input to get value, otherwise use textContent/React props
                    if ((el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) && el.value) {
                         data.description = el.value.trim();
                    } else {
                        const props = getReactProps(el);
                        if (props && props.children) {
                            data.description = this.extractTextFromChildren(props.children);
                        } else {
                             data.description = el.textContent || "";
                        }
                    }

                    if (data.description) break;
                }
            }
        }

        // 5. Try to find a common Fluent UI Error Message Bar (as fallback or addition)
        if (!data.errorText && !data.description) {
            const errorContainer = document.querySelector('[data-automation-id="error-message"]');
            if (errorContainer) {
                const props = getReactProps(errorContainer);
                if (props && props.children) {
                    data.errorText = this.extractTextFromChildren(props.children);
                    data.source = 'fluent-automation-id';
                } else {
                    data.errorText = errorContainer.textContent || "";
                    data.source = 'dom-text';
                }
            } else {
                // Generic Search for "Error" keyword in specific UI roles (Alerts)
                const alerts = document.querySelectorAll('[role="alert"]');
                for (const alert of Array.from(alerts)) {
                    if (alert.textContent && alert.textContent.toLowerCase().includes('error')) {
                        data.errorText = alert.textContent;
                        data.source = 'aria-role-alert';
                        break;
                    }
                }
            }
        }

        // Return data if we found *something* useful
        if (data.errorText || data.ticketTitle || data.description || data.productCategory || data.caseNumber || data.severity || data.statusReason) {
            // Consolidate "errorText" for the analyze function if description is better
            if (!data.errorText && data.description) {
                data.errorText = data.description;
                data.source = 'ticket-description';
            }
            // Fallback: If we only have a title but no error/description, use the title as the error text
            // This ensures the "Analyze" button is enabled for tickets that just have a title
            else if (!data.errorText && data.ticketTitle) {
                data.errorText = data.ticketTitle;
                data.source = 'ticket-title-fallback';
            }

            return data;
        }

        return null;
    }

    /**
     * Recursively extracts text from React Children structures (strings, arrays, or objects)
     */
    private static extractTextFromChildren(children: any): string {
        if (!children) return "";
        
        if (typeof children === 'string') return children;
        if (typeof children === 'number') return String(children);
        
        if (Array.isArray(children)) {
            return children.map(c => this.extractTextFromChildren(c)).join(" ");
        }

        if (typeof children === 'object') {
            // Check for common React element props
            if (children.props && children.props.children) {
                return this.extractTextFromChildren(children.props.children);
            }
            // Sometimes it's just an object with text inside (rare but possible in custom components)
        }

        return "";
    }
}
