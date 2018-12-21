import MovieClip from "thing-engine/js/components/movie-clip/movie-clip.js";
import Timeline from "./timeline.js";
import Line from "./timeline-line.js";

export default class FieldsTimeline extends React.Component {

	constructor(props) {
		super(props);

	}

	onToggleKeyframeClick(time) {
		let field = this.props.field;
		let currentTime = time || this.props.owner.props.owner.getTime();
		let currentKeyframe = MovieClip._findNextKeyframe(field.t, currentTime-1);
		if(currentKeyframe.t !== currentTime) {
			this.props.owner.createKeyframeWithTimelineValue(field, currentTime);
			this.forceUpdate();
		} else {
			this.deleteKeyframe(currentKeyframe);
		}
	}

	onChanged() {
		Timeline.fieldDataChanged(
			this.props.field, 
			this.props.owner.props.node
		);
	}

	render() {
		let p = this.props.owner.props;
		let height = p.heightZoom;
		return R.div({
			className: 'field-timeline',
			style: {
				backgroundSize:  (60 * p.widthZoom)  + 'px ' + (height - 10) + 'px',
				height 
			}
		},
		React.createElement(Label, {owner: this}),
		React.createElement(Line, {owner: this})
		);
	}
}


const fieldLabelTimelineProps = {className: 'objects-timeline-labels', onMouseDown:sp, onMouseMove:sp};
class Label extends React.Component {

	render() {
		let fieldTimeline = this.props.owner;
		return R.div(fieldLabelTimelineProps,
			fieldTimeline.props.field.n,
			R.br()/*,
			R.btn('x', fieldTimeline.onRemoveFieldClick, 'Remove field animation...', 'danger-btn'),
			R.btn('<', fieldTimeline.onGoLeftClick, 'Previous Keyframe'),
			R.btn('●', fieldTimeline.onToggleKeyframeClick, 'add/remove Keyframe'),
			R.btn('>', fieldTimeline.onGoRightClick, 'Next Keyframe')*/
		);
	}
}
