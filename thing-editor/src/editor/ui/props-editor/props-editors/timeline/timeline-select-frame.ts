import type { ClassAttributes } from 'preact';
import { Component } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import Window from 'thing-editor/src/editor/ui/editor-window';
import Timeline from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline';
import game from 'thing-editor/src/engine/game';

let timelineRect: DOMRect;
let isDragging = false;

let x = 0;
let y = 0;
let w = 0;
let h = 0;

export default class TimelineSelectFrame extends Component<ClassAttributes<TimelineSelectFrame>> {

	onMouseDown(ev: MouseEvent) {
		timelineRect = Timeline.timelineDOMElement!.getBoundingClientRect();
		isDragging = true;
		let s = Window.all.timeline.renderedScale;
		x = (ev.clientX - timelineRect.x) / s;
		y = (ev.clientY - timelineRect.y) / s;
		w = 0;
		h = 0;
		this.forceUpdate();
	}

	onMouseMove(ev: MouseEvent) {
		if (isDragging) {
			let s = Window.all.timeline.renderedScale;

			w = (ev.clientX - timelineRect.x) / s - x;
			h = (ev.clientY - timelineRect.y) / s - y;
			this.forceUpdate();
		}
	}

	cancelSelection() {
		if (isDragging) {
			isDragging = false;
			this.forceUpdate();
		}
	}

	getRectAndFinishDragging() {
		if (isDragging) {
			isDragging = false;

			let a = document.querySelector('.timeline-select-frame');
			if (!a) {
				return;
			}
			let ret = a.getBoundingClientRect();
			this.forceUpdate();

			return ret;
		}
	}

	render() {
		if (isDragging) {
			return R.div({
				className: game.__EDITOR_mode ? 'timeline-select-frame' : 'timeline-select-frame disabled',
				style: {
					left: (w >= 0) ? x : x + w,
					top: (h >= 0) ? y : y + h,
					width: Math.abs(w),
					height: Math.abs(h)
				}
			});
		}
		return R.span();
	}
}
