import type { EditablePropertyDesc } from 'thing-editor/src/editor/props-editor/editable';
import type { TimelineFieldData, TimelineKeyFrame } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';

const makePathForKeyframeAutoSelect = (property: string | EditablePropertyDesc, field: TimelineFieldData, keyframe: TimelineKeyFrame) => {
	return ((property as EditablePropertyDesc).name || property) + ',' + field.n + ',' + keyframe.t;
};

export default makePathForKeyframeAutoSelect;
