let filterAll = false;

const filterWarnings = (args: string[]) => {
	if (filterAll) {
		return true;
	}
	filterAll = args.some(a => a.includes('PixiJS Deprecation'));
	return filterAll;
};

const originalGroupEnd = console.groupEnd;
console.groupEnd = () => {
	filterAll = false;
	originalGroupEnd.apply(console);

};

const originalWarn = console.warn;
console.warn = (...args: string[]) => {
	if (!filterWarnings(args)) {
		originalWarn.apply(console, args);
	}
};
const originalGroupCollapsed = console.groupCollapsed;
console.groupCollapsed = (...args: string[]) => {
	if (!filterWarnings(args)) {
		originalGroupCollapsed.apply(console, args);
	}
};

const filterDebug = (args: string[]) => {
	return args.some(a => a.includes('[vite] connecting...') || a.includes('[vite] connected.'));
};

const originalDebug = console.debug;
console.debug = (...args: string[]) => {
	if (!filterDebug(args)) {
		originalDebug.apply(console, args);
	}
};
