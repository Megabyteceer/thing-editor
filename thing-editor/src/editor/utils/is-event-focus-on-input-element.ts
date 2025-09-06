const isEventFocusOnInputElement = (ev: KeyboardEvent): boolean => {

	let tag = (document.activeElement || (ev.target as HTMLInputElement)).tagName;

	if (((tag === 'INPUT') && ((ev.target as HTMLInputElement).type !== 'checkbox')) ||
			tag === 'TEXTAREA') {

		if (ev.ctrlKey || ev.metaKey) {
			if (ev.key === 'z' || ev.key === 'v' || ev.key === 'y' || ev.key === 'a') {
				return true;
			}
			if (ev.key === 'x' || ev.key === 'c') {
				return !!document.getSelection();
			}
		} else {
			return true;
		}
	}
	return false;
};

export default isEventFocusOnInputElement;
