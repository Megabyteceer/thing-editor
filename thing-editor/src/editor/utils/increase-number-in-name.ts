const regex = /(\d+)(?!.*\d)/;

export default function increaseNumberInName(name: string | null, step = 1) {
	if (name) {
		let a = regex.exec(name);
		if (a) {
			let oldNum = a.pop()!;
			let newNum = (parseInt(oldNum) + step).toString();
			while (newNum.length < oldNum.length) {
				newNum = '0' + newNum;
			}
			a.shift();
			let n = name.lastIndexOf(oldNum);
			return name.substr(0, n) + newNum + name.substr(n + oldNum.length);
		}
	}
	return name;
}
