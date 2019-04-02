import FieldsTimeline from "./timeline-field.js";
import Timeline from "./timeline.js";
import TimeLabel from "./timeline-label.js";
import Line from "./timeline-line.js";
import MovieClip from "thing-engine/js/components/movie-clip/movie-clip.js";
import game from "thing-engine/js/game.js";

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

	deleteAnimationField(fieldData) {
		let timelineData = this.props.node._timelineData;
		let i = timelineData.f.indexOf(fieldData);
		for(let k of fieldData.t) {
			Timeline.unselectKeyframe(k);
		}
		assert(i >= 0, "Can't find field in timeline");
		timelineData.f.splice(i,1);
		this.props.node._disposePlayers();
		Line.invalideteChartsRenderCache(timelineData);
		MovieClip.invalidateSerializeCache(this.props.node);
		editor.sceneModified();
		this.forceUpdate();
	}

	render() {
		let tl = this.props.node._timelineData;

		let labelsNames = tl ? Object.keys(tl.l) : [];
		let width = 0;
		if(tl) {
			for(let f of tl.f) {
				if(f.t[f.t.length -1].t > width) {
					width = f.t[f.t.length -1].t;
				}
			}
		}
		width += 500;
		width *= this.props.widthZoom;

		let labelsPanel = R.div({
			onMouseDown:(ev) => { //create new label by right click
				if(tl && ev.buttons === 2) {
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
			style:{width},
			title:tl && 'Right click to add time label',
			className:'timeline-labels-panel'
		},
		labelsNames.map((labelName)=> {
			return this.renderTimeLabel(labelName, labelsNames);
		}));


		return R.div(objectsTimelineProps,
			labelsPanel,
			tl && tl.f.map((field, i) => {
				return React.createElement(FieldsTimeline, {field, fieldIndex:i, key:field.n, owner:this});
			})
		);
	}
}