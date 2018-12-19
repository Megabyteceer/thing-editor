import MovieClip from "thing-engine/js/components/movie-clip/movie-clip.js";
import ObjectsTimeline from "./objects-timeline.js";

const timelineContainerProps = {className: 'timeline list-view'};


export default class Timeline extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		this.prevFrame =this.prevFrame.bind(this);
		this.nextFrame =this.nextFrame.bind(this);
	}

	prevFrame() {
		this.setTime(Math.max(0, this.getTime() - 1));
	}

	nextFrame() {
		this.setTime(this.getTime() + 1);
	}

	render() {
		return R.fragment (
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn'),
			R.div(timelineContainerProps,
				//React.createElement(TimeMarker, {timeline: this, ref:this.timelineMarkerRef}),
				editor.selection.map(renderObjectsTimeline)
			),
			R.span({style:{display:'none'}},
				R.btn('<', this.prevFrame, undefined, undefined, 188),
				R.btn('>', this.nextFrame, undefined, undefined, 190)
			)
		);

	}
	static fieldDataChanged(fieldData, node) { //invalidate cache
		let timeLineData = fieldData.t;
		timeLineData.sort(sortFieldsByTime);
		for(let field of timeLineData) {
			field.n = MovieClip._findNextKeyframe(timeLineData, field.j);
		}
	
		fieldData.__cacheTimeline = false;
		fieldData.__cacheTimelineRendered = null;
		MovieClip.invalidateSerializeCache(node);
		editor.sceneModified();
	}
}

const sortFieldsByTime = (a, b) => {
	return a.t - b.t;
};


const renderObjectsTimeline = (node) => {
	let key = __getNodeExtendData(node).id;
	if(node instanceof MovieClip && node._timelineData) {
		return React.createElement(ObjectsTimeline, {node, key});
	} else {
		return R.div({key});
	}
};