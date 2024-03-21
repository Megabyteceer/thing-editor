const shakeDomElement = (e?: HTMLElement | null) => {
	if (e) {
		e.classList.remove('shake');
		e.offsetWidth;
		e.classList.add('shake');
		window.setTimeout(() => {
			e.classList.remove('shake');
		}, 600);
	}
};

export default shakeDomElement;
