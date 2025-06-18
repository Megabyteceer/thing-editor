const isEventFocusOnInputElement = (ev: KeyboardEvent): boolean => {

	let tag = ev.target && (ev.target as HTMLElement).tagName;

	if (((tag === 'INPUT') && ((ev.target as HTMLInputElement).type !== 'checkbox')) ||
			tag === 'TEXTAREA') {

		if (ev.ctrlKey) {
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
