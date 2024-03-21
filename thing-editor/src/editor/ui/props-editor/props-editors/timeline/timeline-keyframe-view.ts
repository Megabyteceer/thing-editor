import type { ClassAttributes } from 'preact';
import { Component } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import { getKeyframeTypesForField } from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/get-keyframe-types-for-field';
import KeyframePropertyEditor, { READABLE_KEYFRAME_TYPES } from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/keyframe-property-editor';
import Timeline from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline';
import type TimelineLineView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-line-view';
import type { TimelineSelectable } from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-selectable';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';
import type { TimelineKeyFrame, TimelineKeyFrameType } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';

const keyframesClasses = [
	'timeline-keyframe-smooth',
	'timeline-keyframe-linear',
	'timeline-keyframe-discrete',
	'timeline-keyframe-jump-floor',
	'timeline-keyframe-jump-roof'
];

const DEFAULT_GRAVITY = 1; //BOUNCE ⬆, BOUNCE ⬇ default gravity and bouncing
const DEFAULT_BOUNCING = -0.4;

const SPEED_SET_MARK = R.img({ className: 'timeline-speed-set-marker', src: '/thing-editor/img/timeline/speed-set.png' });

interface TimelineKeyframeViewProps extends ClassAttributes<TimelineKeyframeView> {
	keyFrame: TimelineKeyFrame;
	owner: TimelineLineView;

}

interface TimelineKeyframeViewState {
	isSelected: boolean;
}

export default class TimelineKeyframeView extends Component<TimelineKeyframeViewProps, TimelineKeyframeViewState> implements TimelineSelectable {

	onDraggableMouseDown: (ev: PointerEvent) => void;
	isSelected = false;

	constructor(props: TimelineKeyframeViewProps) {
		super(props);
		this.getTime = this.getTime.bind(this);
		this.setTime = this.setTime.bind(this);
		this.onKeyframeMouseDown = this.onKeyframeMouseDown.bind(this);
		this.onDraggableMouseDown = Timeline.onDraggableMouseDown.bind(this);
		props.keyFrame.___view = this;
	}

	componentDidMount() {
		Timeline._justModifiedSelectable(this);
	}

	componentWillReceiveProps(props: TimelineKeyframeViewProps) {
		let k1 = this.props.keyFrame;
		let k2 = props.keyFrame;
		if (k1.___view === this) {
			k1.___view = null;
		}
		k2.___view = this;
		if (
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
		if (this.props.keyFrame.___view === this) {
			this.props.keyFrame.___view = null;
		}
		Timeline.unregisterDraggableComponent(this);
	}

	getTime() {
		const keyFrame = this.props.keyFrame;
		return keyFrame.t;
	}

	setTime(time: number) {
		assert(!isNaN(time), 'valid number expected');
		const keyFrame = this.props.keyFrame;
		if (keyFrame.t === 0) { //initial keyframe is locked for dragging
			let t = this.props.owner.props.owner.props.field.t;
			if (!t.find((k) => { return k.t === 0 && k !== keyFrame; })) { // but only if no cloned keyframe with 0 time
				return;
			}
		}
		if (keyFrame.t !== time) {
			if (keyFrame.j === keyFrame.t && !keyFrame.___keepLoopPoint) {
				keyFrame.j = time;
			}
			keyFrame.t = time;
			this.onChanged();
		}
	}

	setKeyframeType(type: TimelineKeyFrameType) {
		let keyFrame = this.props.keyFrame;
		/// #if EDITOR
		let types = getKeyframeTypesForField([this.props.owner.props.owner.props.owner.props.node], this.props.owner.props.owner.props.field.n);
		assert(types.indexOf(type) >= 0, 'Type ' + READABLE_KEYFRAME_TYPES[type] + 'is invalid for field \'' + this.props.owner.props.owner.props.field.n);
		/// #endif

		if (keyFrame.m !== type) {
			keyFrame.m = type;
			if (keyFrame.m < 3) {
				delete keyFrame.b; //BOUNCE ⬆, BOUNCE ⬇  gravity and bouncing delete
				delete keyFrame.g;
			} else {
				if (!keyFrame.hasOwnProperty('b')) {
					let fieldView = keyFrame.___view!.props.owner.props.owner;
					let fieldName = fieldView.props.field.n;
					let node = fieldView.props.owner.props.node;
					let fieldDesc = game.editor.getObjectField(node, fieldName);
					let step = fieldDesc.step || 1;

					keyFrame.b = DEFAULT_BOUNCING;
					keyFrame.g = DEFAULT_GRAVITY * step;
				}
			}
			this.onChanged();
		}
	}

	onChanged() {
		this.props.owner.props.owner.onChanged();
	}

	deleteKeyframe() {
		this.props.owner.props.owner.deleteKeyframe(this.props.keyFrame);
	}

	clone() {
		let timeLineData = this.props.owner.props.owner.props.field.t;
		let keyFrame = this.props.keyFrame;
		let cloneKeyframe: TimelineKeyFrame = Object.assign({}, keyFrame);
		cloneKeyframe.___react_id = MovieClip.__generateKeyframeId();
		timeLineData.push(cloneKeyframe);
	}

	onKeyframeMouseDown(ev: PointerEvent) {
		if (ev.buttons === 2) {
			if (this.props.keyFrame.hasOwnProperty('a')) { /// 99999
				delete this.props.keyFrame.a;
				this.onChanged();
				KeyframePropertyEditor.refresh();
			} else {
				this.deleteKeyframe();
			}
			sp(ev);
		} else {
			this.onDraggableMouseDown(ev);
		}
	}

	render() {
		const keyFrame = this.props.keyFrame;

		let loopArrow;
		let randomMeter;
		let props = this.props.owner.props.owner.props;
		const field = props.field;
		const p = props.owner.props;
		const width = p.widthZoom;
		const height = p.heightZoom - 16;
		if (keyFrame.j !== keyFrame.t) {
			let len = Math.abs(keyFrame.j - keyFrame.t);
			len *= width;

			let className = 'loop-arrow';
			if (keyFrame.j > keyFrame.t) {
				className += ' loop-arrow-front';
			}
			loopArrow = R.svg({ className, height: 11, width: len },
				R.polyline({ points: '0,0 6,6 3,8 0,0 6,9 ' + (len / 2) + ',10 ' + (len - 3) + ',7 ' + len + ',0' })
			);
		}
		if (keyFrame.hasOwnProperty('r')) {
			let len = Math.abs(keyFrame.r! * width);
			randomMeter = R.svg({ className: (keyFrame.r! > 0) ? 'keyframe-random-meter' : 'keyframe-random-meter keyframe-random-meter-neg', height: 4, width: len },
				R.polyline({ points: '0,3 1,1 ' + (len - 2) + ',1 ' + (len) + ',3' })
			);
		}

		let className = 'timeline-keyframe ' + keyframesClasses[keyFrame.m];
		if (this.state && this.state.isSelected) {
			className += ' timeline-keyframe-selected';
		}

		let isUnreachable = (typeof keyFrame.v === 'number') && isNaN(MovieClip.__getValueAtTime(field, keyFrame.t) as number);
		if (isUnreachable) {
			className += ' timeline-keyframe-unreachable';
		}

		let mark;
		if (keyFrame.hasOwnProperty('a')) {
			mark = p.node.__EDITOR_getKeyframeIcon(keyFrame.a!);
		}

		return R.div({
			className: className,
			title: isUnreachable ? 'Keyframe is unreachable because of loop or "this.stop" action' : keyFrame.a,
			onMouseDown: this.onKeyframeMouseDown,
			style: { height, width: (width < 8) ? 8 : width, left: keyFrame.t * width }
		}, keyFrame.hasOwnProperty('s') ? SPEED_SET_MARK : undefined, mark, loopArrow, randomMeter
		);
	}
}
