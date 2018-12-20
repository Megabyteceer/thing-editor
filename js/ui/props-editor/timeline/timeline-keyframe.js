import Timeline from "./timeline.js";

const keyframesClasses = [
	'timeline-keyframe-smooth',
	'timeline-keyframe-linear',
	'timeline-keyframe-discrete',
	'timeline-keyframe-jump-floor',
	'timeline-keyframe-jump-roof'
];



export default class TimelineKeyframe extends React.Component {

	constructor(props) {
		super(props);
		this.getTime = this.getTime.bind(this);
		this.setTime = this.setTime.bind(this);
		Timeline.registerDragableComponent(this);
	}

	componentDidMount() {
		Timeline._justModifiedSelectable(this);
	}

	componentWillReceiveProps(props) {
		let k1 = this.props.keyFrame;
		let k2 = props.keyFrame;
		if(
			k1.t !== k2.t ||
			k1.v !== k2.v ||
			k1.m !== k2.m ||
			k1.a !== k2.a ||
			k1.s !== k2.s ||
			k1.g !== k2.g ||
			k1.b !== k2.b
		) {
			Timeline._justModifiedSelectable(this);
		}
	}

	componentWillUnmount() {
		Timeline.unregisterDragableComponent(this);
	}

	getTime() {
		const keyFrame = this.props.keyFrame;
		return keyFrame.t;
	}

	setTime(time) {
		const keyFrame = this.props.keyFrame;
		if(keyFrame.t === 0) {
			if(this.props.owner.props.owner.props.field.t.indexOf(keyFrame) === 0) { //initial keyframe is locked for dragging
				return;
			}
		}
		if(keyFrame.t !== time) {
			if(keyFrame.j === keyFrame.t) {
				keyFrame.j = time;
			}
			keyFrame.t = time;
			this.onChanged();
		}
	}

	onChanged() {
		this.props.owner.props.owner.onChanged();
	}

	render() {
		const keyFrame = this.props.keyFrame;

		let loopArrow;
		const p = this.props.owner.props.owner.props.owner.props;
		const width = p.widthZoom;
		const height = p.heightZoom - 16;
		if(keyFrame.j !== keyFrame.t) {
			let len = Math.abs(keyFrame.j - keyFrame.t);
			len *= width;

			let className = 'loop-arrow';
			if(keyFrame.j > keyFrame.t) {
				className += ' loop-arrow-front';
			}
			loopArrow = R.svg({className, height:11, width:len},
				R.polyline({points:'0,0 6,6 3,8 0,0 6,9 '+(len/2)+',10 '+(len-3)+',7 '+len+',0'})
			);
		}
		let className = 'timeline-keyframe ' + keyframesClasses[keyFrame.m];
		if(this.state && this.state.isSelected) {
			className += ' timeline-keyframe-selected';
		}
		
		let mark;
		if(keyFrame.hasOwnProperty('a')) {
			
			mark = (keyFrame.a === 'this.stop') ? '■' : 'A';
		}
		
		return R.div({className:className,
			onMouseDown: this.onMouseDown,
			style:{height, width: (width < 8) ? 8 : width, left:keyFrame.t * width}},
		mark,
		loopArrow,
		keyFrame.___react_id
		);
	}
}