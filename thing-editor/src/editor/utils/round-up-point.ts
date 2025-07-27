
const roundUpPoint = (p:{x: number; y: number}) =>{
	p.x = roundUpNumber(p.x);
	p.y = roundUpNumber(p.y);
	return p;
};

const roundUpNumber = (n:number) =>{
	if (Math.abs(n - Math.round(n)) < 0.00000001) {
		return Math.round(n);
	}
	return n;
};

export { roundUpNumber };
export default roundUpPoint;
