import Pool from "thing-engine/js/utils/pool.js";
import FieldPlayer from "thing-engine/js/components/movie-clip/field-player.js";
import MovieClip from "thing-engine/js/components/movie-clip/movie-clip";


export default class FieldsTimeline extends React.Component {

	constructor(props) {
		super(props);
		this.deleteKeyframe = this.deleteKeyframe.bind(this);
		this.renderKeyframeChart = this.renderKeyframeChart.bind(this);
		this.renderKeyframe = this.renderKeyframe.bind(this);
		this.onKeyframeChanged = this.onKeyframeChanged.bind(this);
		this.onRemoveFieldClick = this.onRemoveFieldClick.bind(this);
		this.onGoLeftClick = this.onGoLeftClick.bind(this);
		this.onGoRightClick = this.onGoRightClick.bind(this);
		this.onToggleKeyframeClick = this.onToggleKeyframeClick.bind(this);
	}

	onToggleKeyframeClick(time) {
		let field = this.props.field;
		let currentTime = time || Timeline.timeline.getTime();
		let currentKeyframe = MovieClip._findNextKeyframe(field.t, currentTime-1);
		if(currentKeyframe.t !== currentTime) {
			Timeline.timeline.createKeyframeWithTimelineValue(field, currentTime);
			this.forceUpdate();
		} else {
			this.deleteKeyframe(currentKeyframe);
		}
	}

	render() {
		return R.div(
			React.createElement(Label, {owner: this}),
			React.createElement(Line, {owner: this, widthZoom: 4, heightZoom: 20})
		);
	}
}


const fieldLabelTimelineProps = {className: 'objects-timeline-labels', onMouseDown:sp, onMouseMove:sp};
class Label extends React.Component {

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

let _scale, _shift;
const scale = (val) => {
	return (_shift - val) * _scale;
};

class Line extends React.Component {

	getValueAtTime(time) {
		let field = this.props.field;
		if(!field.__cacheTimeline) {
			let fieldPlayer = Pool.create(FieldPlayer);
			let c = [];
			field.__cacheTimeline = c;
			let wholeTimelineData = this.props.owner.props.node._timelineData;
			fieldPlayer.init({}, field, wholeTimelineData.p, wholeTimelineData.d);
			fieldPlayer.reset();
			calculateCacheSegmentForField(fieldPlayer, c);
			for(let label in wholeTimelineData.l) {
				label = wholeTimelineData.l[label];
				if(!c.hasOwnProperty(label.t)) { //time at this label is not calculated yet
					fieldPlayer.goto(label.t, label.n[this.props.fieldIndex]);
					calculateCacheSegmentForField(fieldPlayer, c);
				}
			}
			let len = Math.max(c.length, field.t[field.t.length - 1].t + 1);
			let lastVal;
			for(let i = 0; i < len; i++) {
				if(i in c) {
					lastVal = c[i];
				} else {
					c[i] = lastVal;
				}
				
			}
			c.min = Math.min.apply(null, c);
			c.max = Math.max.apply(null, c);
			Pool.dispose(fieldPlayer);
		}
		return field.__cacheTimeline[time];
	}

	render() {
		let field = this.props.owner.props.field;

		let lastKeyframe = field.t[field.t.length - 1];
		let width = 0;
		if(lastKeyframe) {
			width = Math.max(lastKeyframe.t, lastKeyframe.j);
		}
		width += 300;
		width *= this.props.widthZoom;
		let height = this.props.heightZoom;
		
		this.getValueAtTime(lastKeyframe.t); //cache timeline's values
		_scale = field.__cacheTimeline.max - field.__cacheTimeline.min;
		if(_scale === 0) {
			_scale = 1;
		}
		_scale = 25.0 / _scale;
		_shift = field.__cacheTimeline.max + 1/_scale;
		
		return R.div({style:{width, height}},
			field.t.map(this.renderKeyframe),
			React.createElement(PlayingDisplay, this.props)
		);
	}
}

const calculateCacheSegmentForField = (fieldPlayer, c) => {
	fieldPlayer.__dontCallActions = true;
	let time;
	let i = 0;
	let fields = fieldPlayer.timeline;
	let limit = fields[fields.length-1].t;
	while(!c.hasOwnProperty(fieldPlayer.time)) {
		time = fieldPlayer.time;
		c[time] = fieldPlayer.val;
		if(time > limit) {
			break;
		}
		fieldPlayer.update();
		
		assert(i++ < 100000, 'Timeline values cache calculation looped and failed.');
	}
	fieldPlayer.__dontCallActions = false;
};



class PlayingDisplay extends React.Component {
	componentDidMount() {
		this.interval = setInterval(this.update.bind(this), 35);
	}
	
	componentWillUnmount() {
		clearInterval(this.interval);
	}
	
	update() {
		let fieldPlayer = this.props.node.fieldPlayers[this.props.fieldIndex];
		this.fieldPlayer = fieldPlayer;
		if(fieldPlayer && fieldPlayer.time !== this.renderedTime) {
			this.renderedTime = fieldPlayer.time;
			this.forceUpdate();
		}
	}
	
	render () {
		if(!this.fieldPlayer) {
			return R.div();
		} else {
			let firedFrame;
			if(this.fieldPlayer.__lastFiredKeyframe) {
				firedFrame = R.div({className:'timeline-fire-indicator', style:{left: this.fieldPlayer.__lastFiredKeyframe.t * FRAMES_STEP}});
			}
			return R.fragment(
				R.div({className:'timeline-play-indicator', style:{left: this.fieldPlayer.time * FRAMES_STEP}}),
				firedFrame
			);
		}
		
	}
}