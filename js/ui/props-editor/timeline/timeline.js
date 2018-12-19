import MovieClip from "thing-engine/js/components/movie-clip/movie-clip.js";
import ObjectsTimeline from "./objects-timeline.js";
import TimeMarker from "./time-marker.js";
import game from "thing-engine/js/game.js";

let timeMarker;
function timeMarkerRef(ref) {
	timeMarker = ref;
}


export default class Timeline extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			heightZoom: editor.settings.getItem('timeline-height-zoom', 40),
			widthZoom: editor.settings.getItem('timeline-width-zoom', 3)

		};
		this.prevFrame =this.prevFrame.bind(this);
		this.nextFrame =this.nextFrame.bind(this);
		this.renderObjectsTimeline = this.renderObjectsTimeline.bind(this);
		this.onWheel = this.onWheel.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
	}

	componentDidMount() {
		Timeline.timelineDOMElement = $('.timeline')[0];
	}

	onWheel(ev) {
		let delta = (ev.deltaY < 0) ? 1.5 : 0.66666666;
		if(ev.ctrlKey) {
			let heightZoom = this.state.heightZoom;
			heightZoom *= delta;
			if(heightZoom < 40) {
				heightZoom = 40;
			} else if(heightZoom > 135) {
				heightZoom = 135;
			}
			editor.settings.setItem('timeline-height-zoom', heightZoom),
			this.setState({heightZoom: Math.floor(heightZoom)});
		} else {
			let widthZoom = this.state.widthZoom;
			widthZoom *= delta;
			if(widthZoom < 2) {
				widthZoom = 2;
			} else if(widthZoom > 28.5) {
				widthZoom = 28.5;
			}
			editor.settings.setItem('timeline-width-zoom', widthZoom),
			this.setState({widthZoom: Math.floor(widthZoom)});
		}
		sp(ev);
	}

	prevFrame() {
		this.setTime(Math.max(0, this.getTime() - 1), true);
	}

	nextFrame() {
		this.setTime(this.getTime() + 1, true);
	}

	renderObjectsTimeline (node) {
		let key = __getNodeExtendData(node).id;
		if(node instanceof MovieClip && node._timelineData) {
			return React.createElement(ObjectsTimeline, {node, key,
				heightZoom: this.state.heightZoom,
				widthZoom: this.state.widthZoom
			});
		} else {
			return R.div({key});
		}
	}

	getTime() {
		return timeMarker.state.time;
	}
	
	setTime(time, scrollInToView) {
		timeMarker.setTime(time, scrollInToView);
		if(game.__EDITORmode) {
			editor.selection.some((o) => {
				if(o._timelineData) {
					o._timelineData.f.some((f) => {
						if(f.__cacheTimeline.hasOwnProperty(time)) {
							o[f.n] = f.__cacheTimeline[time];
						}
					});
				}
			});
			editor.refreshPropsEditor();
		}
	}



	render() {
		return R.fragment (
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn'),
			R.div({
				onScroll:onTimelineScroll,
				onMouseDown:this.onMouseDown,
				onMouseMove:this.onMouseMove,
				className: 'timeline list-view',
				onWheel: this.onWheel
			},
			React.createElement(TimeMarker, {owner: this, ref:timeMarkerRef}),
			editor.selection.map(this.renderObjectsTimeline)
			),
			R.span({style:{display:'none'}},
				R.btn('<', this.prevFrame, undefined, undefined, 188),
				R.btn('>', this.nextFrame, undefined, undefined, 190)
			)
		);

	}

	onMouseDown(ev) {
		isDragging = true;
		this.onMouseMove(ev);
		if(!window.isEventFocusOnInputElement(ev)) {
			sp(ev);
		}
	}

	onMouseMove(ev) {
		isDragging = (isDragging && (ev.buttons === 1));
		let tl = Timeline.timelineDOMElement;
		let b = tl.getBoundingClientRect();
		let x = ev.clientX - 110 - b.x;
		if(isDragging) {
			let time = Math.max(0, Math.round((x + tl.scrollLeft) / this.state.widthZoom));
			this.setTime(time, true);
		}
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

function onTimelineScroll(ev) {
	$('.objects-timeline-labels').css({left: ev.target.scrollLeft + 'px'});
	$('.time-marker-body').css({top: ev.target.scrollTop + 'px'});
}


let isDragging = false;