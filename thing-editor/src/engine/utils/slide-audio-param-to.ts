interface AudioParamProtected extends AudioParam {
	__lastTimeTouch?: number;
}

export const rootAudioContext = new AudioContext();

export const slideAudioParamTo = (param:AudioParamProtected, val:number, duration:number = 0, fromValue = param.value) => {
	const time = Math.max(param.__lastTimeTouch ? (param.__lastTimeTouch + 0.00001) : 0, rootAudioContext.currentTime);

	if (duration > 0 && time) {
		try {
			param.__lastTimeTouch = time + duration;
			param.setValueCurveAtTime([fromValue, val], time, duration);
		} catch (_er) {
			param.setValueAtTime(val, time + duration);
		}
	} else {
		param.setValueAtTime(val, time);
		param.__lastTimeTouch = time;
	}
};
