import Timeline from "./timeline.js";

export default class TimelineLoopPoint extends React.Component {
	
	constructor(props) {
		super(props);
		this.onLoopPointMouseDown = this.onLoopPointMouseDown.bind(this);
		Timeline.registerDragableComponent(this);
	}
	
	componentDidMount() {
		Timeline._justModifiedSelectable(this);
	}

	componentWillReceiveProps(props) {
		let t1 = this.props.keyFrame;
		let t2 = props.keyFrame;
		if(t1.j !== t2.j) {
			Timeline._justModifiedSelectable(this);
		}
	}

	getTime() {
		const keyFrame = this.props.keyFrame;
		return keyFrame.j;
	}

	setTime(time) {
		const keyFrame = this.props.keyFrame;
		if(keyFrame.j !== time) {
			keyFrame.j = time;
			this.onChanged();
		}
	}

	onLoopPointMouseDown(ev) {
		if(ev.buttons === 2) {
			this.deleteLoopPoint();
			sp(ev);
		} else {
			this.onMouseDown(ev);
		}
	}

	deleteLoopPoint() {
		let keyFrame = this.props.keyFrame;
		keyFrame.j = keyFrame.t;
		this.onChanged();
		this.props.owner.forceUpdate();
	}

	onChanged() {
		this.props.owner.props.owner.onChanged();
	}

	componentWillUnmount() {
		Timeline.unregisterDragableComponent(this);
	}

	render() {
		let width = this.props.widthZoom;
		let keyFrame = this.props.keyFrame;

		let className = 'timeline-loop-point';
		if(this.state && this.state.isSelected) {
			className = 'timeline-loop-point timeline-loop-point-selected';
		}

		return R.div({className:className,
			title: 'Loop point',
			onMouseDown: this.onLoopPointMouseDown,
			style:{width: (width < 8) ? 8 : width, left:keyFrame.j * width}},
		
		);

	}

}