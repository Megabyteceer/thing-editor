import Pool from "thing-engine/js/utils/pool.js";
import FieldPlayer from "thing-engine/js/components/movie-clip/field-player.js";
import TimelineKeyframe from "./timeline-keyframe.js";

let _scale, _shift;
const scale = (val) => {
	return (_shift - val) * _scale;
};

export default class Line extends React.Component {

	constructor(props) {
		super(props);
		this.renderKeyframe = this.renderKeyframe.bind(this);
	}

	getValueAtTime(time) {
		let field = this.props.owner.props.field;
		if(!field.__cacheTimeline) {
			let fieldPlayer = Pool.create(FieldPlayer);
			let c = [];
			field.__cacheTimeline = c;
			let wholeTimelineData = this.props.owner.props.owner.props.node._timelineData;
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

	renderKeyframe(keyFrame, i) {
		return React.createElement(TimelineKeyframe, {key: i, keyFrame, owner:this});
	}

	render() {
		const ownerProps =this.props.owner.props;
		let field = ownerProps.field;

		let lastKeyframe = field.t[field.t.length - 1];
		let width = 0;
		if(lastKeyframe) {
			width = Math.max(lastKeyframe.t, lastKeyframe.j);
		}
		width += 300;
		width *= ownerProps.owner.props.widthZoom;
		let height = ownerProps.owner.props.heightZoom;
		
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
		let fieldPlayer = this.props.owner.props.owner.props.node.fieldPlayers[this.props.owner.props.fieldIndex];
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
			let widthZoom = this.props.owner.props.owner.props.widthZoom;
			if(this.fieldPlayer.__lastFiredKeyframe) {
				firedFrame = R.div({className:'timeline-fire-indicator', style:{left: this.fieldPlayer.__lastFiredKeyframe.t * widthZoom}});
			}
			return R.fragment(
				R.div({className:'timeline-play-indicator', style:{left: this.fieldPlayer.time * widthZoom}}),
				firedFrame
			);
		}
		
	}
}