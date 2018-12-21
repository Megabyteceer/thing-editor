import Timeline from "./timeline.js";

const timeMarkerProps = {className: 'time-marker-body'};
const timeMarkerLineProps = {className: 'time-marker-v-line'};
const timeMarkerLabelProps = {className: 'time-marker-label'};
const smallTextProps = {className: 'small-text'};
let fieldLabelTimelineProps = {className: 'objects-timeline-labels'};

export default class TimeMarker extends React.Component {
	
	constructor(params) {
		super(params);
		this.state = {time:0};
	}
	
	setTime(time, scrollInToView) {
		this.setState({time});
		if(scrollInToView) {
			this.scrollInToView(time);
		}
	}

	scrollInToView(time) {
		let hw = Timeline.timelineDOMElement.clientWidth / 2;
		let x = time * this.props.owner.state.widthZoom - hw;
		if(Math.abs(Timeline.timelineDOMElement.scrollLeft - x) > hw) {
			Timeline.timelineDOMElement.scrollLeft = x;
		} else {
			let s = Timeline.timelineDOMElement.scrollLeft;
			if(s < (x + 150 - hw)) {
				Timeline.timelineDOMElement.scrollLeft = (x + 150 - hw);
			} else if(s > (x - 40 + hw)) {
				Timeline.timelineDOMElement.scrollLeft = (x - 40 + hw);
			}
		}
	}
	
	render() {
		return R.div(timeMarkerProps,
			R.div(fieldLabelTimelineProps),
			R.div({className: 'time-marker', style:{left: this.state.time * this.props.owner.state.widthZoom}},
				R.div(timeMarkerLineProps),
				R.div(timeMarkerLabelProps,
					R.b(null, this.state.time), R.span(smallTextProps, ' frames (' + (this.state.time/60).toFixed(2) + ' seconds)')
				)
			)
		);
	}
}