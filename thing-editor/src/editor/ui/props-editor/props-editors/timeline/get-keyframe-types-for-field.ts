import type { Container } from 'pixi.js';
import game from 'thing-editor/src/engine/game';
import type MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';
import { TimelineKeyFrameType } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';

function getDefaultKeyframeTypeForField(o: MovieClip, propertyName: string): TimelineKeyFrameType {
	switch (propertyName) {
	case 'x':
	case 'y':
	case 'rotation':
		return TimelineKeyFrameType.SMOOTH;
	case 'alpha':
	case 'tintR':
	case 'tintG':
	case 'tintB':
		return TimelineKeyFrameType.LINEAR;
	default:
		return getKeyframeTypesForField([o], propertyName)[0];
	}
}

const keyframeTypesForNumber: TimelineKeyFrameType[] = [
	TimelineKeyFrameType.SMOOTH,
	TimelineKeyFrameType.LINEAR,
	TimelineKeyFrameType.DISCRETE,
	TimelineKeyFrameType.BOUNCE_BOTTOM,
	TimelineKeyFrameType.BOUNCE_TOP
];
const keyframeTypesDiscreteOnly = [TimelineKeyFrameType.DISCRETE];

function getKeyframeTypesForField(objects: Container[], propertyName: string): TimelineKeyFrameType[] {
	for (let o of objects) {
		let fieldDesc = game.editor.getObjectField(o, propertyName);
		if (!fieldDesc) {
			window.setTimeout(() => {
				game.editor.ui.status.warn('Property \'' + propertyName + '\' is not exists anymore, but movieClip have animation for it.', 32040, o);
			}, 0);
			return [];
		}
		if (fieldDesc.type !== 'number') {
			return keyframeTypesDiscreteOnly;
		}
	}
	return keyframeTypesForNumber;
}

export { getDefaultKeyframeTypeForField, getKeyframeTypesForField };

