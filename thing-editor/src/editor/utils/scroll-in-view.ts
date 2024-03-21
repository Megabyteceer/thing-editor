import shakeDomElement from 'thing-editor/src/editor/utils/shake-element';

const scrollInToViewAndShake = (element: HTMLElement) => {
	let p = element;
	while (p) {
		if (p.classList.contains('props-group-body') && p.classList.contains('hidden')) {
			p.classList.remove('hidden');
		}
		p = p.parentElement as HTMLElement;
	}
	scrollInToView(element);
	shakeDomElement(element);
};

const scrollInToView = (element: HTMLElement) => {
	element.scrollIntoView({ block: 'center', inline: 'center' });
	document.scrollingElement!.scrollTop = 0;
	document.scrollingElement!.scrollLeft = 0;
	document.body.scrollTop = 0;
	document.body.scrollLeft = 0;
};

export default scrollInToViewAndShake;

export { scrollInToView };
