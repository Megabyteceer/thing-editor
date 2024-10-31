const waitForCondition = (condition: () => any) => {
	if (condition()) {
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		let i = window.setInterval(() => {
			if (condition()) {
				resolve(undefined);
				clearInterval(i);
			}
		}, 100);
	});
};

export default waitForCondition;
