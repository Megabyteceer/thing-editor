const deepFreeze = (object: any) => {
	/// #if DEBUG
	/*
	/// #endif
	throw Error('deepFreeze is for debug build only.');
	//*/

	const propNames = Reflect.ownKeys(object);
	for (const name of propNames) {
		const value = object[name];
		if (value && typeof value === 'object') {
			deepFreeze(value);
		}
	}

	return Object.freeze(object);
};

export default deepFreeze;
