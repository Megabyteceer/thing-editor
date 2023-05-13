
export default function assert(condition: any, message: string, errorCode: number = 99999): void {
	if(!condition) {
		message = message + '; errorCode: ' + errorCode;
		console.error(message);
		debugger;
		throw new Error(message);
	}
}
