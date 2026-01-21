import { getReactProps, findParentReactComponent } from './reactFiber';

export interface ScrapedData {
    errorText?: string;
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
        // 1. Try to find a common Fluent UI Error Message Bar
        // MessageBar often has a specific role or class pattern, but we prefer data attributes if available
        // Fallback to standard robust selectors
        
        // Example Selector: A container with data-automation-id (Common in MS Internal Tools)
        const errorContainer = document.querySelector('[data-automation-id="error-message"]');
        if (errorContainer) {
            const props = getReactProps(errorContainer);
            // If we found props, try to extract the message
            if (props && props.children) {
                return {
                    errorText: this.extractTextFromChildren(props.children),
                    source: 'fluent-automation-id'
                };
            }
            // Fallback to text content if React props fail
            return {
                errorText: errorContainer.textContent || "",
                source: 'dom-text'
            };
        }

        // 2. Generic Search for "Error" keyword in specific UI roles (Alerts)
        const alerts = document.querySelectorAll('[role="alert"]');
        for (const alert of Array.from(alerts)) {
            if (alert.textContent && alert.textContent.toLowerCase().includes('error')) {
                return {
                    errorText: alert.textContent,
                    source: 'aria-role-alert'
                };
            }
        }

        // 3. Selection Based: If user selected text, use that
        const selection = window.getSelection();
        if (selection && selection.toString().length > 5) {
            return {
                errorText: selection.toString(),
                source: 'user-selection'
            };
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
