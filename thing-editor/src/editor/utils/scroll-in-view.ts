const scrollInToViewAndShake = (element: HTMLElement) => {
	let p = element;
	while(p) {
		if(p.classList.contains('props-group-body') && p.classList.contains('hidden')) {
			p.classList.remove('hidden');
		}
		p = p.parentElement as HTMLElement;
	}
	element.scrollIntoView({ block: "center", inline: "center" });
	shakeDomElement(element);
}