import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

type AsyncComponent = (props: object) => Promise<ReactNode>;

function isAsyncComponent(type: unknown): type is AsyncComponent {
	return typeof type === "function" && type.constructor.name === "AsyncFunction";
}

/**
 * Pages render static parts at once and stream request-time sections inside <Suspense>.
 * jsdom cannot render async Server Components, so tests await them in place first.
 * Suspense fallbacks are left untouched; errors from a section reject the returned promise.
 */
export async function resolveServerTree(node: ReactNode): Promise<ReactNode> {
	if (Array.isArray(node)) {
		return Promise.all(node.map(resolveServerTree));
	}
	if (!isValidElement(node)) {
		return node;
	}

	const element = node as ReactElement<{ children?: ReactNode }>;
	if (isAsyncComponent(element.type)) {
		return resolveServerTree(await element.type(element.props));
	}
	if (element.props.children === undefined) {
		return element;
	}

	const children = await resolveServerTree(element.props.children);
	return Array.isArray(children)
		? cloneElement(element, undefined, ...children)
		: cloneElement(element, undefined, children);
}
