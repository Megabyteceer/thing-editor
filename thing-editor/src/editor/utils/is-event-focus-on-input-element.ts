const isEventFocusOnInputElement = (ev: KeyboardEvent): boolean => {

	let tag = ev.target && (ev.target as HTMLElement).tagName;

	if (((tag === 'INPUT') && ((ev.target as HTMLInputElement).type !== 'checkbox')) ||
			tag === 'TEXTAREA') {

		if (ev.key === 'ArrowDown' || ev.key === 'ArrowLeft' || ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
			return true;
		}
		if (ev.key === 'Backspace' || ev.key === 'Delete') {
			return true;
		}

		if (ev.ctrlKey) {
			if (ev.key === 'z' || ev.key === 'x' || ev.key === 'c' || ev.key === 'v' || ev.key === 'y' || ev.key === 'a') {
				return true;
			}
		}
	}
	return false;
};

export default isEventFocusOnInputElement;
