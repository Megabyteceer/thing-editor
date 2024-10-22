import assert from 'thing-editor/src/engine/debug/assert';

function formatMoney(num: number, c = 0) {
	assert(typeof num === 'number', 'Numeric value expected, but got \'' + typeof num + '\'', 10012);

	let neg = num < 0;
	let ret;
	if (neg) {
		num = -num;
	}

	if (c > 0) {
		let str = num.toFixed(c).split('.');
		if (str[0].length > 3) {
			str[0] = str[0].replace(/(.)(?=(.{3})+$)/g, '$1 ');
		}
		ret = str.join('.');
	} else {
		ret = num.toFixed(0).replace(/(.)(?=(.{3})+$)/g, '$1 ');
	}
	if (neg) {
		return '-' + ret;
	}
	return ret;
}

export default formatMoney;
