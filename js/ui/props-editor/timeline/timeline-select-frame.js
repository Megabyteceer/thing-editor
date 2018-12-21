import Timeline from "./timeline.js";

let timelineRect;
let isDragging;

let x;
let y;
let w;
let h;

export default class TimelineSelectFrame extends React.Component {

	onMouseDown(ev) {
		timelineRect = Timeline.timelineDOMElement.getBoundingClientRect();
		isDragging = true;
		x = ev.clientX - timelineRect.x;
		y = ev.clientY - timelineRect.y;
		w = 0;
		h = 0;
	}

	onMouseMove(ev) {
		if(isDragging) {
			w = ev.clientX - timelineRect.x - x;
			h = ev.clientY - timelineRect.y - y;
			this.forceUpdate();
		}
	}

	getRectAndFinishDragging() {
		if(isDragging) {
			isDragging = false;
			
			let a = $('.timelilne-select-frame');
			if(a.length < 1) {
				return;
			}
			let ret = a[0].getBoundingClientRect();
			this.forceUpdate();

			return ret;
		}
	}

	render() {
		if(isDragging) {
			return R.div({className: 'timelilne-select-frame',
				style: {
					left: (w >= 0) ? x : x + w,
					top: (h >= 0) ? y : y + h,
					width: Math.abs(w),
					height: Math.abs(h)
				}});
		}
		return R.span();
	}
}