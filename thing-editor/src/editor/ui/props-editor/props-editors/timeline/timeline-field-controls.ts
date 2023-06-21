import { ClassAttributes, Component } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import FieldsTimelineView from "thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-field";
import sp from "thing-editor/src/editor/utils/stop-propagation";

interface TimelilneFieldControlsProps extends ClassAttributes<TimelilneFieldControls> {
	owner: FieldsTimelineView;
}


export default class TimelilneFieldControls extends Component<TimelilneFieldControlsProps> {

	render() {
		let fieldTimeline = this.props.owner;
		return R.div({ className: 'objects-timeline-labels', onMouseDown: sp, style: { height: this.props.owner.props.owner.props.heightZoom } },
			R.span({ className: 'timeline-buttons-group' },
				R.span({ className: 'props-label selectable-text' },
					fieldTimeline.props.field.n
				),
				R.btn('×', fieldTimeline.onRemoveFieldClick, 'Remove field animation', 'danger-btn')
			)
		);
	}
}