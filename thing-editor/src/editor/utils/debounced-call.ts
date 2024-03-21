let debounces: Map<() => void, number> = new Map();

const debouncedCall = (f: () => void, timeMs = 0) => {
	if (debounces.has(f)) {
		clearTimeout(debounces.get(f));
		debounces.delete(f);
	}
	debounces.set(f, window.setTimeout(() => {
		debounces.delete(f);
		f();
	}, timeMs));
};

export default debouncedCall;
