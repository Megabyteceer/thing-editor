const isEventFocusOnInputElement = (ev: Event): Promise<boolean> => {
	return new Promise((resolve) => {
		let tag = ev.target && (ev.target as HTMLElement).tagName;

		if(((tag === 'INPUT') && ((ev.target as HTMLInputElement).type !== 'checkbox')) ||
			tag === 'TEXTAREA' ||
			tag === 'SELECT') {

			const currentVal = (ev.target as HTMLInputElement).value;
			setTimeout(() => {
				resolve(currentVal !== (ev.target as HTMLInputElement).value);

			}, 1);

		} else {
			resolve(false);
		}
	});
};

export default isEventFocusOnInputElement;