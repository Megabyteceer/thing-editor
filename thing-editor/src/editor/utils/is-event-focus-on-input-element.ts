const isEventFocusOnInputElement = (ev: KeyboardEvent): Promise<boolean> => {
	return new Promise((resolve) => {
		let tag = ev.target && (ev.target as HTMLElement).tagName;

		if (((tag === 'INPUT') && ((ev.target as HTMLInputElement).type !== 'checkbox')) ||
			tag === 'TEXTAREA' ||
			tag === 'SELECT') {

			if (ev.key === 'ArrowDown' || ev.key === 'ArrowLeft' || ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
				resolve(true);
			} else if ((ev.target as HTMLInputElement).classList.contains('tree-view-search')) {
				resolve(true);
			} else {
				const currentVal = (ev.target as HTMLInputElement).value;
				window.setTimeout(() => {
					resolve(currentVal !== (ev.target as HTMLInputElement).value);

				}, 0);
			}
		} else {
			resolve(false);
		}
	});
};

export default isEventFocusOnInputElement;
