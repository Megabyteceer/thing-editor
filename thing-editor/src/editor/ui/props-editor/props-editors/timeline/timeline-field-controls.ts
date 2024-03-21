import type { ClassAttributes } from 'preact';
import { Component } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import type FieldsTimelineView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-field';
import sp from 'thing-editor/src/editor/utils/stop-propagation';

interface TimelineFieldControlsProps extends ClassAttributes<TimelineFieldControls> {
	owner: FieldsTimelineView;
}


export default class TimelineFieldControls extends Component<TimelineFieldControlsProps> {

	render() {
		let fieldTimeline = this.props.owner;
		return R.div({ className: 'objects-timeline-labels timeline-fixed-block', onMouseDown: sp, style: { height: this.props.owner.props.owner.props.heightZoom } },
			R.span({ className: 'timeline-buttons-group' },
				R.span({ className: 'props-label selectable-text' },
					fieldTimeline.props.field.n
				),
				R.btn('×', fieldTimeline.onRemoveFieldClick, 'Remove field animation', 'danger-btn')
			)
		);
	}
}
