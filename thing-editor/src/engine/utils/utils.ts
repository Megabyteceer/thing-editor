import assert from 'thing-editor/src/engine/debug/assert';

const PI2 = Math.PI * 2;
/// #if EDITOR
const CTRL_READABLE = (electron_ThingEditorServer.versions.platform == 'darwin') ? '⌘' : 'Ctrl';
/// #endif

const stepTo = (val: number, to: number, step: number) => {
	assert(!isNaN(val), 'stepTo val, valid number expected.');
	assert(!isNaN(to), 'stepTo to, valid number expected.');
	assert(!isNaN(step), 'stepTo step, valid number expected.');
	if (Math.abs(val - to) <= step) return to;
	if (val > to) {
		return val - step;
	}
	return val + step;
};

const stepToR = (val: number, target: number, step: number) => {
	assert(!isNaN(val), 'stepToR val, valid number expected.');
	assert(!isNaN(target), 'stepToR to, valid number expected.');
	assert(!isNaN(step), 'stepToR step, valid number expected.');
	if ((target - val) > Math.PI) {
		val += PI2;
	} else if ((target - val) < -Math.PI) {
		val -= PI2;
	}
	if (Math.abs(val - target) <= step) {
		return target;
	}
	if (val < target) {
		return val + step;
	}
	return val - step;
};

export {
	/// #if EDITOR
	CTRL_READABLE,
	/// #endif
	PI2, stepTo, stepToR
};

