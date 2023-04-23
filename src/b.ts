import A from "./a";

export default class B extends A {
	init(): void {
		console.log('init B');
	}
}
console.log('exec B');