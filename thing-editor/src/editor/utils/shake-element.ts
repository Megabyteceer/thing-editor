const shakeDomElement = (e: HTMLElement) => {
	e.classList.remove('shake');
	e.offsetWidth;
	e.classList.add('shake');
};

export default shakeDomElement;