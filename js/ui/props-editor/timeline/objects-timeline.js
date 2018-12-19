import FieldsTimeline from "./timeline-field.js";

const objectsTimelineProps = {className: 'objects-timeline'};


export default class ObjectsTimeline extends React.Component {


	render() {
		let tl = this.props.node._timelineData;
		return R.div(objectsTimelineProps,
			tl.f.map((field, i) => {
				return React.createElement(FieldsTimeline, {field, fieldIndex:i, key:field.n, owner:this});
			})
		);
	}
}