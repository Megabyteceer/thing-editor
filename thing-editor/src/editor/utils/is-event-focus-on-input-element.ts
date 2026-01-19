const isEventFocusOnInputElement = (ev: KeyboardEvent): boolean => {

	const isInput = (element: HTMLInputElement | null) => {
		if (element) {
			const tag = element.tagName;
			return ((tag === 'INPUT') && (element!.type !== 'checkbox')) ||
				tag === 'TEXTAREA';
		}
	};

	if (isInput(ev.target as HTMLInputElement) || isInput(document.activeElement as HTMLInputElement)) {
		if (ev.ctrlKey || ev.metaKey) {
			if (ev.key === 'z' || ev.key === 'v' || ev.key === 'y' || ev.key === 'a') {
				return true;
			}
			if (ev.key === 'x' || ev.key === 'c') {
				return !!document.getSelection();
			}
		} else if (ev.key !== 'Escape') {
			return true;
		}
	}
	return false;
};

export default isEventFocusOnInputElement;
