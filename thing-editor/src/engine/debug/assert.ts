
export default function assert(condition: any, message: string, errorCode: number = 99999): void {
	if(!condition) {
		throw new Error(message + '; errorCode: ' + errorCode);
	}
}
