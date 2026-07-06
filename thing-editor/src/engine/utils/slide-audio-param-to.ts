import game from '../game';

interface AudioParamProtected extends AudioParam {
	__lastTimeTouch?: number;
}

export const rootAudioContext = new AudioContext();

export const slideAudioParamTo = (param:AudioParamProtected, val:number, duration:number = 0, fromValue = param.value) => {
	const time = Math.max(param.__lastTimeTouch ? (param.__lastTimeTouch + 0.003) : 0, rootAudioContext.currentTime);

	if (duration > 0 && time && !game.isMobile.apple.device) {
		if (duration > 0.004) {
			const durationCut = param.__lastTimeTouch ? Math.max(0, (param.__lastTimeTouch - rootAudioContext.currentTime)) : 0;
			duration = Math.max(0.004, duration - durationCut);
		}
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
