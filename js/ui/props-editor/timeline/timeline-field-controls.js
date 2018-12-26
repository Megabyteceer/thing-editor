const fieldLabelTimelineProps = {className: 'objects-timeline-labels', onMouseDown:sp, onMouseMove:sp};

export default class TimelilneFieldControls extends React.Component {

	render() {
		let fieldTimeline = this.props.owner;
		return R.div(fieldLabelTimelineProps,
			fieldTimeline.props.field.n,
			R.br(),
			R.btn('x', fieldTimeline.onRemoveFieldClick, 'Remove field animation...', 'danger-btn'),
			R.btn('<', fieldTimeline.onGoLeftClick, 'Previous Keyframe'),
			R.btn('●', fieldTimeline.onToggleKeyframeClick, 'add/remove Keyframe'),
			R.btn('>', fieldTimeline.onGoRightClick, 'Next Keyframe')
		);
	}
}