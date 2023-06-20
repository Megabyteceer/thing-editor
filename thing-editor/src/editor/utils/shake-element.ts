const shakeDomElement = (e?: HTMLElement | null) => {
	if(e) {
		e.classList.remove('shake');
		e.offsetWidth;
		e.classList.add('shake');
	}
};

export default shakeDomElement;