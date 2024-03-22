function assert(condition: any, message: string, errorCode = 99999): void {
	if (!condition) {
		message = message + '; errorCode: ' + errorCode;
		console.error(message);
		throw new Error(message);
	}
}

export default assert;
