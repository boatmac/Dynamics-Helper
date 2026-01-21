/**
 * Helper to access React Internal Instance (Fiber) from a DOM node.
 * Microsoft Fluent UI obfuscates classes, so we read props directly from the Fiber node.
 */

// Define a type for the React internal instance (simplified)
interface ReactFiberInstance {
    memoizedProps: any;
    return?: ReactFiberInstance;
    stateNode?: any;
    [key: string]: any;
}

/**
 * Gets the React Props from a DOM element by traversing its internal Fiber instance.
 * @param domElement The DOM element to inspect
 * @returns The props object or null if not found
 */
export function getReactProps(domElement: Element): any | null {
    if (!domElement) return null;

    // React 17/18 internal keys start with __reactProps$ or __reactFiber$
    const keys = Object.keys(domElement);
    const fiberKey = keys.find(k => k.startsWith("__reactFiber$"));
    const propsKey = keys.find(k => k.startsWith("__reactProps$"));

    // Strategy 1: Direct Props Access (Common in React 17+)
    // @ts-ignore
    if (propsKey) return domElement[propsKey];

    // Strategy 2: Fiber Traversal (More robust for complex trees)
    // @ts-ignore
    if (fiberKey && domElement[fiberKey]) {
        // @ts-ignore
        const fiber = domElement[fiberKey] as ReactFiberInstance;
        
        // Sometimes the props are on the current fiber, sometimes we need to go up
        if (fiber.memoizedProps) return fiber.memoizedProps;
    }

    return null;
}

/**
 * Traverses up the React Fiber tree to find a specific prop or component type.
 * Useful when the DOM node is deeply nested inside the component we care about.
 * @param domElement Starting DOM element
 * @param predicate Function that returns true when the desired fiber/props are found
 */
export function findParentReactComponent(
    domElement: Element, 
    predicate: (props: any) => boolean,
    maxDepth = 10
): any | null {
    const keys = Object.keys(domElement);
    const fiberKey = keys.find(k => k.startsWith("__reactFiber$"));

    // @ts-ignore
    if (!fiberKey || !domElement[fiberKey]) return null;

    // @ts-ignore
    let fiber = domElement[fiberKey] as ReactFiberInstance;
    let depth = 0;

    while (fiber && depth < maxDepth) {
        if (fiber.memoizedProps && predicate(fiber.memoizedProps)) {
            return fiber.memoizedProps;
        }
        fiber = fiber.return as ReactFiberInstance;
        depth++;
    }

    return null;
}
