import { getReactProps, findParentReactComponent } from './reactFiber';

export interface ScrapedData {
    errorText?: string;
    ticketTitle?: string;
    productCategory?: string;
    caseNumber?: string; // New field for Case Number
    description?: string;
    context?: string;
    timestamp?: string;
    source?: string;
}

export class PageReader {
    /**
     * Attempts to find error logs or relevant support ticket details on the page.
     * Prioritizes Fluent UI specific selectors and React Props.
     */
    static scanForErrors(): ScrapedData | null {
        const data: ScrapedData = {};
        
        // 1. Selection Based: If user selected text, use that as primary error/description
        const selection = window.getSelection();
        if (selection && selection.toString().length > 5) {
            data.errorText = selection.toString();
            data.source = 'user-selection';
        }

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

        // 3. Try to find Case Number
        // Based on user screenshot, it's often near header controls or has specific 16-digit format
        // We look for elements containing the label "Case number" or matching the pattern
        const caseNumSelectors = [
             // Specific ID from screenshot/DOM inspection (best guess based on structure)
            '[id^="headerControlsList_"]', 
            // Generic search for text "Case number" siblings
            'div' 
        ];

        // Regex for 16-digit case number (e.g. 2601190030003106)
        const caseNumRegex = /\b\d{16}\b/;

        // Strategy A: Check specific header container if it exists
        const headerControls = document.querySelector('[id^="headerControlsList_"]');
        if (headerControls) {
             const text = headerControls.textContent || '';
             const match = text.match(caseNumRegex);
             if (match) {
                 data.caseNumber = match[0];
             }
        }

        // Strategy B: If not found, scan all divs that might contain "Case number" text label
        if (!data.caseNumber) {
            // Find elements containing "Case number" text (case insensitive)
            // XPath is cleaner for text content search
            const iterator = document.evaluate(
                "//*[contains(text(), 'Case number')]", 
                document, 
                null, 
                XPathResult.ANY_TYPE, 
                null
            );
            
            let node = iterator.iterateNext();
            while (node) {
                // The number is often in a SIBLING or PARENT's other child
                // Check parent's text content for the 16 digit pattern
                const parent = node.parentElement;
                if (parent && parent.parentElement) {
                     // Check specific parent hierarchy text (broader context)
                     const containerText = parent.parentElement.textContent || '';
                     const match = containerText.match(caseNumRegex);
                     if (match) {
                         data.caseNumber = match[0];
                         break;
                     }
                }
                node = iterator.iterateNext();
            }
        }
        
        // Strategy C: Direct Regex scan on header container (most robust if ID is stable)
        if (!data.caseNumber) {
            const headerContainer = document.querySelector('[id^="headerContainer"]'); // or outerHeaderContainer_
             if (headerContainer && headerContainer.textContent) {
                 const match = headerContainer.textContent.match(caseNumRegex);
                 if (match) data.caseNumber = match[0];
             }
        }


        // 4. Try to find Product Category
        // This is often in a specific field or breadcrumb
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
            
            // Special handling for the 'textarea' fallback to avoid selecting just ANY textarea
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
                // If it's an input/textarea, use .value, otherwise .textContent
                const val = (el as HTMLTextAreaElement).value || el.textContent;
                if (val) {
                    data.productCategory = val.trim();
                    break;
                }
            }
        }

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
        if (data.errorText || data.ticketTitle || data.description || data.productCategory || data.caseNumber) {
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
