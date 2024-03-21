const sp = (ev: Event) => {
	ev.stopPropagation();
	ev.preventDefault();
};

export default sp;
