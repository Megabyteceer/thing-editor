import FieldsTimeline from "./timeline-field.js";
import Timeline from "./timeline.js";
import TimeLabel from "./timeline-label.js";

const objectsTimelineProps = {className: 'objects-timeline'};


export default class ObjectsTimeline extends React.Component {

	renderTimeLabel(labelName, labelsNamesList) {
		return React.createElement(TimeLabel, {key:labelName, owner: this, label:this.props.node._timelineData.l[labelName], labelName, labelsNamesList});
	}

	onLabelChange(label) {
		let o = this.props.node;
		TimeLabel.renormalizeLabel(label, this.props.node);
		Timeline.allFieldDataChanged(o);
		this.forceUpdate();
	}

	createKeyframeWithTimelineValue(fieldData, time) { //used for toggle keyframe
		this.props.owner.setTime(time);
		this.props.owner.createKeyframeWithCurrentObjectsValue(this.props.node, fieldData.n, time);
		Timeline.fieldDataChanged(fieldData, this.props.node);
	}

	shouldComponentUpdate(nextProps) {
		return this.props.node !== nextProps.node ||
		this.props.heightZoom !== nextProps.heightZoom ||
		this.props.widthZoom !== nextProps.widthZoom;

	}

	render() {
		let tl = this.props.node._timelineData;

		let labelsNames = Object.keys(tl.l);
		let labelsPanel = R.div({
			onMouseDown:(ev) => { //create new label by right click
				if(ev.buttons === 2) {
					let time = Timeline.mouseEventToTime(ev);

					TimeLabel.askForLabelName(labelsNames, "Create new label:").then((name) => {
						if(name) {
							let label = {t: time};
							tl.l[name] = label;
							TimeLabel.renormalizeLabel(label, this.props.node);
							this.onLabelChange(label);
						}
					});
				} else {
					this.props.owner.setTime(Timeline.mouseEventToTime(ev));
					this.props.owner.startTimeDragging();
				}
			},
			title:'Right click to add time label',
			className:'timeline-labels-panel'
		},
		labelsNames.map((labelName)=> {
			return this.renderTimeLabel(labelName, labelsNames);
		}));


		return R.div(objectsTimelineProps,
			labelsPanel,
			tl.f.map((field, i) => {
				return React.createElement(FieldsTimeline, {field, fieldIndex:i, key:field.n, owner:this});
			})
		);
	}
}