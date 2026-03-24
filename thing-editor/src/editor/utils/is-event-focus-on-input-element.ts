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
			if (ev.code === 'KeyZ' || ev.code === 'KeyV' || ev.code === 'KeyY' || ev.code === 'KeyA') {
				return true;
			}
			if (ev.code === 'KeyX' || ev.code === 'KeyC') {
				return !!document.getSelection();
			}
		} else if (ev.key !== 'Escape') {
			return true;
		}
	}
	return false;
};

export default isEventFocusOnInputElement;
