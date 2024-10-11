
const roundUpPoint = (p:{x: number; y: number}) =>{
	if (Math.abs(p.x - Math.round(p.x)) < 0.00001) {
		p.x = Math.round(p.x);
	}
	if (Math.abs(p.y - Math.round(p.y)) < 0.00001) {
		p.y = Math.round(p.y);
	}
	return p;
};

export default roundUpPoint;
