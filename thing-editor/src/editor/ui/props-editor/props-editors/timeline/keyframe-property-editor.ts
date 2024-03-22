import type { ClassAttributes } from 'preact';
import { h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import ComponentDebounced from 'thing-editor/src/editor/ui/component-debounced';
import CallbackEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/call-back-editor';
import NumberEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/number-editor';
import PowDampPresetSelector from 'thing-editor/src/editor/ui/props-editor/props-editors/pow-damp-preset-selector';
import SelectEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/select-editor';
import { getKeyframeTypesForField } from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/get-keyframe-types-for-field';
import Timeline from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline';
import type TimelineKeyframeView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-keyframe-view';
import type { TimelineSelectable } from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-selectable';
import game from 'thing-editor/src/engine/game';
import { TimelineKeyFrameType } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';

const READABLE_KEYFRAME_TYPES = ['SMOOTH', 'LINEAR', 'DISCRETE', 'BOUNCE ⬇', 'BOUNCE ⬆'];

let instance: KeyframePropertyEditor;

interface KeyframePropertyEditorProps extends ClassAttributes<KeyframePropertyEditor> {
	keyframesGetter: () => TimelineSelectable[];
	owner: Timeline;
}

interface KeyframePropertyEditorState {
	toggled?: boolean;
}

export default class KeyframePropertyEditor extends ComponentDebounced<KeyframePropertyEditorProps, KeyframePropertyEditorState> {

	constructor(props: KeyframePropertyEditorProps) {

		super(props);
		this.onActionChange = this.onActionChange.bind(this);
		this.onGravityChange = this.onGravityChange.bind(this);
		this.onBouncingChange = this.onBouncingChange.bind(this);
		this.onSetSpeedExistsChanged = this.onSetSpeedExistsChanged.bind(this);
		this.onSetRandomExistsChanged = this.onSetRandomExistsChanged.bind(this);
		this.onSpeedChanged = this.onSpeedChanged.bind(this);
		this.onRandomChanged = this.onRandomChanged.bind(this);
		this.onJumpChanged = this.onJumpChanged.bind(this);
		this.resetJumpTime = this.resetJumpTime.bind(this);
		this.onDampChanged = this.onDampChanged.bind(this);
		this.onPowChanged = this.onPowChanged.bind(this);
		this.onPresetSelected = this.onPresetSelected.bind(this);
		this.onTypeSelect = this.onTypeSelect.bind(this);
		instance = this;
	}

	static refresh() {
		if (instance) {
			instance.refresh();
		}
	}

	onKeyframeChanged() {
		for (let k of this.keyframes) {
			let kf = k.props.keyFrame;
			if (kf.hasOwnProperty('a')) {
				if (!kf.a) {
					delete kf.a;
				}
			}
			kf.___view!.onChanged();
		}
		this.refresh();
	}

	onObjectChanged() {
		for (let k of this.keyframes) {
			let objectTimelineEditor = k.props.owner.props.owner.props.owner;
			Timeline.allFieldDataChanged(objectTimelineEditor.props.node);
			objectTimelineEditor.forceUpdate();
		}
		this.forceUpdate();
	}

	onGravityChange(value: number) {
		for (let k of this.keyframes) {
			if (k.props.keyFrame.m > TimelineKeyFrameType.DISCRETE) {
				k.props.keyFrame.g = value;
			}
		}
		this.onKeyframeChanged();
	}

	onBouncingChange(ev: InputEvent) {
		let val = parseFloat((ev.target as HTMLInputElement).value);
		for (let k of this.keyframes) {
			if (k.props.keyFrame.m > TimelineKeyFrameType.DISCRETE) {
				k.props.keyFrame.b = -val;
			}
		}
		this.onKeyframeChanged();
	}

	onActionChange(val: string | InputEvent) {
		if (val && (val as InputEvent).target) {
			val = ((val as InputEvent).target as HTMLInputElement).value;
		}
		for (let k of this.keyframes) {
			k.props.keyFrame!.a = val as string;
		}
		this.onKeyframeChanged();
	}

	get keyframes(): TimelineKeyframeView[] {
		return this.props.keyframesGetter() as TimelineKeyframeView[];
	}

	onSpeedChanged(val: number) {
		for (let k of this.keyframes) {
			let p = k.props.owner.props.owner.props;
			if ((typeof (p.owner.props.node as KeyedObject)[p.field.n]) === 'number') {
				k.props.keyFrame.s = val;
			}
		}
		this.onKeyframeChanged();
	}

	onRandomChanged(val: number) {
		for (let k of this.keyframes) {
			let kf = k.props.keyFrame;
			kf.r = Math.min(val, kf.n.t - kf.j - 1);
		}
		this.onKeyframeChanged();
	}

	onSetSpeedExistsChanged(ev: InputEvent) {
		for (let k of this.keyframes) {
			let p = k.props.owner.props.owner.props;
			if (((typeof (p.owner.props.node as KeyedObject)[p.field.n]) === 'number') && ((ev.target as HTMLInputElement).checked)) {
				k.props.keyFrame.s = 0;
			} else {
				delete k.props.keyFrame.s;
			}
		}
		this.onKeyframeChanged();
	}

	onSetRandomExistsChanged(ev: InputEvent) {
		for (let k of this.keyframes) {
			if ((ev.target as HTMLInputElement).checked) {
				k.props.keyFrame.r = 0;
			} else {
				delete k.props.keyFrame.r;
			}
		}
		this.onKeyframeChanged();
	}

	onJumpChanged(val: number) {
		for (let k of this.keyframes) {
			k.props.keyFrame.j = val;
		}
		this.onKeyframeChanged();
	}

	resetJumpTime() {
		for (let k of this.keyframes) {
			k.props.keyFrame.___loopPointView!.deleteLoopPoint();
		}
		this.onKeyframeChanged();
	}

	onDampChanged(val: number) {
		for (let k of this.keyframes) {
			let o = k.props.owner.props.owner.props.owner.props.node;
			o._timelineData.d = val;
		}
		this.onObjectChanged();
	}

	onPowChanged(val: number) {
		for (let k of this.keyframes) {
			let o = k.props.owner.props.owner.props.owner.props.node;
			o._timelineData.p = val;
		}
		this.onObjectChanged();
	}

	onPresetSelected(pow: number, damp: number) {
		for (let k of this.keyframes) {
			let o = k.props.owner.props.owner.props.owner.props.node;
			o._timelineData.p = pow;
			o._timelineData.d = damp;
		}
		this.onObjectChanged();
	}

	onTypeSelect(val: TimelineKeyFrameType) {
		for (let kfView of this.keyframes) {
			kfView.setKeyframeType(val);
		}
		this.onKeyframeChanged();
		this.forceUpdate();
	}

	render() {

		let keyframes = this.keyframes;
		let kfView = keyframes[0];
		if (!kfView) {
			return R.fragment();
		}
		let kf = kfView.props.keyFrame;

		let availableKeyframeTypes: TimelineKeyFrameType[] | undefined;


		let speedSetPossible = true;
		let speedVal: false | number = false;


		for (let k of keyframes) {

			let fieldsProps = k.props.owner.props.owner.props;
			speedSetPossible = speedSetPossible && ((typeof (fieldsProps.owner.props.node as KeyedObject)[fieldsProps.field.n]) === 'number');
			if (speedVal === false && k.props.keyFrame.hasOwnProperty('s')) {
				speedVal = k.props.keyFrame.s!;
			}

			let types = getKeyframeTypesForField(game.editor.selection, fieldsProps.field.n);
			if (!availableKeyframeTypes || (availableKeyframeTypes.length > types.length)) {
				availableKeyframeTypes = types;
			}
		}

		let selectableKeyframeTypes: ({
			name: string;
			value: TimelineKeyFrameType;
		}[]) = READABLE_KEYFRAME_TYPES.map((name, value) => {
			return { name, value };
		});

		let body;

		let selectedObjectsTimeline = kfView.props.owner.props.owner.props.owner.props.node._timelineData;
		if ((!kf) || (!selectedObjectsTimeline)) {
			return R.div();
		}

		let extendEditor;
		if (kf.m > 2) { //BOUNCE ⬆, BOUNCE ⬇
			extendEditor = R.fragment(
				'Gravity', h(NumberEditor, { value: kf.g as number, step: 0.0001, min: 0.0001, max: 10, onChange: this.onGravityChange }),
				R.smallSpace(),
				'Bouncing', h(NumberEditor, { value: -(kf.b as number), step: 0.01, min: 0.01, max: 10, onChange: this.onBouncingChange })
			);
		} else if (kf.m === TimelineKeyFrameType.SMOOTH) {

			extendEditor = R.fragment(
				'Power', h(NumberEditor, { value: selectedObjectsTimeline.p, step: 0.001, min: 0.00001, max: 1, onChange: this.onPowChanged }),
				R.smallSpace(),
				'Damp', h(NumberEditor, { value: selectedObjectsTimeline.d, step: 0.01, min: 0.00, max: 1, onChange: this.onDampChanged }),
				R.smallSpace(),
				'Preset', h(PowDampPresetSelector, {
					pow: selectedObjectsTimeline.p,
					damp: selectedObjectsTimeline.d,
					onPresetSelected: this.onPresetSelected
				})
			);
		}


		let speedEditor;
		if (speedSetPossible) {
			let hasSpeed = kf.hasOwnProperty('s');
			let edField = game.editor.getObjectField(game.editor.selection[0], kf.___view!.props.owner.props.owner.props.field.n);
			speedEditor = R.fragment(
				R.label({ htmlFor: 'speed-set-checkbox' }, 'Set speed'),
				R.input({ className: 'clickable', id: 'speed-set-checkbox', type: 'checkbox', onChange: this.onSetSpeedExistsChanged, checked: hasSpeed }),
				hasSpeed ? h(NumberEditor, { value: speedVal, step: (edField.step || 1) / 10, min: -1000, max: 1000, onChange: this.onSpeedChanged }) : undefined,
				R.space()
			);
		}
		let hasRandom = kf.hasOwnProperty('r');
		let randomEditor;
		if (hasRandom) {
			randomEditor = h(NumberEditor, { value: kf.r, step: 1, min: -1000, onChange: this.onRandomChanged });
		}

		let jumpReset;
		if (kf.j !== kf.t) {
			jumpReset = R.btn('x', this.resetJumpTime, 'Remove loop point');
		}
		let jumpEditor = h(NumberEditor, { value: kf.j, step: 1, min: -99999999, max: 99999999, onChange: this.onJumpChanged });

		if (document.activeElement && document.activeElement.className === 'props-editor-callback') {
			window.setTimeout(() => {
				(document.querySelector('.keyframe-callback-editor .props-editor-callback') as HTMLInputElement).focus();
			});
		}

		body = R.fragment(
			'Action',
			R.span({ className: 'keyframe-callback-editor' },
				h(CallbackEditor, {
					value: kf.a || null,
					onChange: this.onActionChange,
					title: 'Callback for keyframe ' + kf.t
				})
			),
			R.space(),
			R.span({ title: 'Keyframe type' }, h(SelectEditor, { onChange: this.onTypeSelect, noCopyValue: true, value: kf.m, select: selectableKeyframeTypes })),
			R.space(),
			speedEditor,
			R.label({ htmlFor: 'random-set-checkbox', title: 'Next frame will be reached for random time longer or faster' }, 'Time random'),
			R.input({ className: 'clickable', id: 'random-set-checkbox', type: 'checkbox', onChange: this.onSetRandomExistsChanged, checked: hasRandom }),
			randomEditor,
			R.space(),
			R.label({ htmlFor: 'jump-time-checkbox' }, 'Loop'),
			jumpEditor,
			jumpReset,
			R.space(),
			extendEditor
		);

		return R.div({ className: game.__EDITOR_mode ? 'bottom-panel' : 'bottom-panel disabled' },
			body
		);
	}
}


export { READABLE_KEYFRAME_TYPES };

