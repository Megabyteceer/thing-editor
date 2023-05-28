import { TimelineFieldData, TimelineKeyFrame } from "thing-editor/src/engine/components/movie-clip/field-player";

const makePathForKeyframeAutoSelect = (propertyName: string, field: TimelineFieldData, keyframe: TimelineKeyFrame) => {
	return propertyName + ',' + field.n + ',' + keyframe.t;
} //TODO


export default makePathForKeyframeAutoSelect;