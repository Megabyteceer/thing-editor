import { ClassAttributes, Component } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import FieldsTimelineView from "thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-field";
import sp from "thing-editor/src/editor/utils/stop-propagation";

interface TimelilneFieldControlsProps extends ClassAttributes<TimelilneFieldControls> {
	owner: FieldsTimelineView;
}

interface TimelilneFieldControlsState {

}

export default class TimelilneFieldControls extends Component<TimelilneFieldControlsProps, TimelilneFieldControlsState> {

	render() {
		let fieldTimeline = this.props.owner;
		return R.div({ className: 'objects-timeline-labels', onMouseDown: sp, style: { height: this.props.owner.props.owner.props.heightZoom } },
			fieldTimeline.props.field.n,
			R.br(),
			R.span({ className: 'timeline-buttons-group' },
				R.btn('×', fieldTimeline.onRemoveFieldClick, 'Remove field animation...', 'danger-btn'),
				R.btn('<', fieldTimeline.onGoLeftClick, 'Previous Keyframe'),
				R.btn('●', fieldTimeline.onToggleKeyframeClick, 'add/remove Keyframe'),
				R.btn('>', fieldTimeline.onGoRightClick, 'Next Keyframe')
			)
		);
	}
}