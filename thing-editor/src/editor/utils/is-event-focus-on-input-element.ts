const isEventFocusOnInputElement = (ev: Event) => {
	let tag = ev.target && (ev.target as HTMLElement).tagName;

	return (((tag === 'INPUT') && ((ev.target as HTMLInputElement).type !== 'checkbox')) || tag === 'TEXTAREA' || tag === 'SELECT');
};

export default isEventFocusOnInputElement;