import type { ClassAttributes } from 'preact';
import { Component } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import Timeline from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline';

const timeMarkerLineProps = { className: 'time-marker-v-line' };
const timeMarkerLabelProps = { className: 'time-marker-label' };
const smallTextProps = { className: 'small-text' };

interface TimeMarkerProps extends ClassAttributes<TimeMarker> {
	owner: Timeline;
}

interface TimeMarkerState {
	time: number;
}

export default class TimeMarker extends Component<TimeMarkerProps, TimeMarkerState> {
	constructor(props: TimeMarkerProps) {
		super(props);
		this.state = { time: 0 };
		this.onMouseDown = this.onMouseDown.bind(this);
	}

	onMouseDown() {
		this.props.owner.startTimeDragging();
	}

	setTime(time: number, scrollInToView = false) {
		this.setState({ time });
		if (scrollInToView) {
			this.scrollInToView(time);
		}
	}

	scrollInToView(time: number) {
		let hw = Timeline.timelineDOMElement!.clientWidth / 2;
		let x = time * this.props.owner.state.widthZoom - hw;
		if (Math.abs(Timeline.timelineDOMElement!.scrollLeft - x) > hw) {
			Timeline.timelineDOMElement!.scrollLeft = x;
		} else {
			let s = Timeline.timelineDOMElement!.scrollLeft;
			if (s < (x + 150 - hw)) {
				Timeline.timelineDOMElement!.scrollLeft = (x + 150 - hw);
			} else if (s > (x - 40 + hw)) {
				Timeline.timelineDOMElement!.scrollLeft = (x - 40 + hw);
			}
		}
	}

	render() {
		return R.div({ className: 'time-marker-body', onMouseDown: this.onMouseDown },
			R.div({ className: 'time-marker', style: { left: this.state.time * this.props.owner.state.widthZoom } },
				R.div(timeMarkerLineProps),
				R.div(timeMarkerLabelProps,
					R.b(null, this.state.time), R.span(smallTextProps, ' frames (' + (this.state.time / 60).toFixed(2) + ' seconds)')
				)
			)
		);
	}
}
