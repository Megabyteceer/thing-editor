import MovieClip from "thing-engine/js/components/movie-clip/movie-clip.js";
import ObjectsTimeline from "./objects-timeline.js";
import TimeMarker from "./time-marker.js";
import game from "thing-engine/js/game.js";
import TimelineKeyframe from "./timeline-keyframe.js";

let widthZoom;
let heightZoom;

let timeMarker;
function timeMarkerRef(ref) {
	timeMarker = ref;
}

const selectedComponents = [];
function clearSelection() {
	while(selectedComponents.length > 0) {
		selectedComponents.pop().setState({isSelected: false});

	}
}

export default class Timeline extends React.Component {
	constructor(props) {
		super(props);

		heightZoom = editor.settings.getItem('timeline-height-zoom', 40);
		widthZoom = editor.settings.getItem('timeline-width-zoom', 3);
		this.state = {
			heightZoom,
			widthZoom
		};
		this.prevFrame =this.prevFrame.bind(this);
		this.nextFrame =this.nextFrame.bind(this);
		this.renderObjectsTimeline = this.renderObjectsTimeline.bind(this);
		this.onWheel = this.onWheel.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
	}

	componentDidMount() {
		clearSelection();
		Timeline.timelineDOMElement = $('.timeline')[0];
		window.addEventListener('mousemove', this.onMouseMove);
	}

	componentWillUnmount() {
		window.removeEventListener('mousemove', this.onMouseMove);
	}

	onWheel(ev) {
		let delta = (ev.deltaY < 0) ? 1.5 : 0.66666666;
		if(ev.ctrlKey) {
			heightZoom = this.state.heightZoom;
			heightZoom *= delta;
			if(heightZoom < 40) {
				heightZoom = 40;
			} else if(heightZoom > 135) {
				heightZoom = 135;
			}
			editor.settings.setItem('timeline-height-zoom', heightZoom);
			heightZoom=Math.floor(heightZoom);
			this.setState({heightZoom});
		} else {
			widthZoom = this.state.widthZoom;
			widthZoom *= delta;
			if(widthZoom < 2) {
				widthZoom = 2;
			} else if(widthZoom > 28.5) {
				widthZoom = 28.5;
			}
			editor.settings.setItem('timeline-width-zoom', widthZoom);
			widthZoom = Math.floor(widthZoom);
			this.setState({widthZoom});
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
				heightZoom,
				widthZoom
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
				onMouseUp:this.onMouseUp,
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

	onMouseUp() {
		if(draggingComponent) {
			//Timeline.renormalizeFieldTimelineDataAfterChange();
			if(reduceRepeatingKeyframesInSelected()) {
				this.forceUpdate();
			}

			draggingXShift = 0;
			draggingComponent = null;
		}
	}

	onMouseDown(ev) {
		isDragging = true;
		this.onMouseMove(ev);
	}

	onMouseMove(ev) {
		isDragging = (isDragging && (ev.buttons === 1));
		if(isDragging) {
			let time = mouseEventToTime(ev);
			if(draggingComponent) {
				let delta = time - prevDragTime;
				if(delta !== 0) {
					for(let c of selectedComponents) {
						let t = c.getTime();
						delta = Math.max(0, t + delta) - t;
						if(delta === 0) {
							return;
						}
					}
					draggingComponent.setTime(draggingComponent.getTime() + delta);
					prevDragTime += delta;
				}
				this.setTime(prevDragTime, true);
			} else {
				this.setTime(time, true);
			}
		}
	}

	static unregisterDragableComponent(component) {
		let i = selectedComponents.indexOf(component);
		if(i >= 0) {
			selectedComponents.splice(i, 1);
		}
	}

	static registerDragableComponent(component) {
		assert(component.getTime && component.setTime, "Dragable component should have 'getTime', 'setTime(time)' function as dragging interface");
		component.onMouseDown = onDragableMouseDown.bind(component);
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

let draggingComponent;
let draggingXShift = 0;
let prevDragTime;

function onDragableMouseDown(ev) {
	clearSelection();
	selectedComponents.push(this);
	this.setState({isSelected:true});
	draggingComponent = this;
	draggingXShift = ev.clientX - ev.target.getBoundingClientRect().x;
	prevDragTime = mouseEventToTime(ev);
}

function mouseEventToTime(ev) {
	let tl = Timeline.timelineDOMElement;
	let b = tl.getBoundingClientRect();
	let x = ev.clientX - 110 - b.x - draggingXShift;
	return Math.max(0, Math.round((x + tl.scrollLeft) / widthZoom));
}

const sortFieldsByTime = (a, b) => {
	return a.t - b.t;
};

function onTimelineScroll(ev) {
	$('.objects-timeline-labels').css({left: ev.target.scrollLeft + 'px'});
	$('.time-marker-body').css({top: ev.target.scrollTop + 'px'});
}

let isDragging = false;

function getSelectedLines() {
	let ret = [];
	for(let c of selectedComponents) {
		if(c instanceof TimelineKeyframe) {
			let l = c.props.owner.props.owner.props.field.t;
			if(ret.indexOf(l) < 0) {
				ret.push(l);
			}
		}
	}
	return ret;
}

function reduceRepeatingKeyframesInSelected() {
	let isModified = false;
	for(let timeLineData of getSelectedLines()) {
		for(let i = 0; i < timeLineData.length; i++) {
			let kf = timeLineData[i];
			for(let j = i+1; j < timeLineData.length; j++) {
				let keyFrame = timeLineData[j];
				if((kf !== keyFrame) && (kf.t === keyFrame.t)) {
					timeLineData.splice(j, 1);
					j--;
					isModified = true;
				}
			}
		}
		return isModified;
	}
}