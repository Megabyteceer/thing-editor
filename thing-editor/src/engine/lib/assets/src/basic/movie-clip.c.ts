
import { Container } from 'pixi.js';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyDesc } from 'thing-editor/src/editor/props-editor/editable';
import editable from 'thing-editor/src/editor/props-editor/editable';
import Timeline from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline';
import getPrefabDefaults from 'thing-editor/src/editor/utils/get-prefab-defaults';
import makePathForKeyframeAutoSelect from 'thing-editor/src/editor/utils/movie-clip-keyframe-select-path';
import { getCurrentStack, showStack } from 'thing-editor/src/editor/utils/stack-utils';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import DSprite from 'thing-editor/src/engine/lib/assets/src/basic/d-sprite.c';
import type { TimelineData, TimelineFieldData, TimelineFrameValuesCache, TimelineKeyFrame, TimelineLabelData, TimelineSerializedData, TimelineSerializedKeyFrame, TimelineSerializedLabelsData } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';
import FieldPlayer, { TimelineKeyFrameType } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';
import Pool from 'thing-editor/src/engine/utils/pool';

/// #if EDITOR
const ICON_STOP = R.img({ src: '/thing-editor/img/timeline/stop.png' });
const ICON_SOUND = R.img({ src: '/thing-editor/img/timeline/sound.png' });
const ICON_REMOVE = R.img({ src: '/thing-editor/img/timeline/remove.png' });
const ICON_DEFAULT = R.img({ src: '/thing-editor/img/timeline/default.png' });

const SELECT_LOG_LEVEL = [
	{ name: 'disabled', value: 0 },
	{ name: 'level 1', value: 1 },
	{ name: 'level 2', value: 2 },
	{ name: 'break on callbacks', value: 3 }
];
/// #endif

let idCounter = 1;

export default class MovieClip extends DSprite {

	fieldPlayers: FieldPlayer[] = [];

	_goToLabelNextFrame: string | false = false;

	@editable()
	isPlaying = true;

	@editable({ type: 'timeline', important: true, visible: (o) => !o.__nodeExtendData.isPrefabReference })
	set timeline(data: TimelineSerializedData) {
		this._goToLabelNextFrame = false;
		this._disposePlayers();

		if (data === null) {
			this._timelineData = null as any;
			return;
		}

		let desData!: TimelineData;

		if (!deserializeCache.has(data)
			/// #if EDITOR
			|| game.editor.disableFieldsCache
			/// #endif
		) {
			desData = MovieClip._deserializeTimelineData(data);
			/// #if EDITOR
			if (!game.editor.disableFieldsCache) {
				/// #endif
				deserializeCache.set(data, desData);
				/// #if EDITOR
				serializeCache.set(desData, data);
			}
			/// #endif
		} else {
			desData = deserializeCache.get(data);
		}

		assert(Array.isArray(data.f), 'Wrong timeline data?');
		this._timelineData = desData;

		let pow = desData.p;
		let damper = desData.d;
		let fieldsData = desData.f;
		for (let i = 0; i < fieldsData.length; i++) {
			let p = Pool.create(FieldPlayer);
			p.init(this, fieldsData[i], pow, damper);
			this.fieldPlayers.push(p);
		}
	}

	/// #if EDITOR
	//timeline reading has sense in editor mode only
	get timeline(): TimelineSerializedData | null { // -eslint-disable-line @typescript-eslint/adjacent-overload-signatures
		if (!this._timelineData) {
			return null;
		}
		if (!serializeCache.has(this._timelineData) ||
			game.editor.disableFieldsCache
		) {
			//console.warn("MovieClip serialization invoked >>>");
			let tl = this._timelineData;
			let fields = tl.f.map((f) => {
				return {
					n: f.n,
					t: f.t.map((k): TimelineSerializedKeyFrame => {
						let ret: TimelineSerializedKeyFrame = Object.assign({}, k);
						let tmpJ = ret.j as number;
						if (ret.j === ret.t && !k.___keepLoopPoint) {
							delete (ret.j);
						}

						if ((typeof (this as KeyedObject)[f.n]) !== 'number') {
							delete ret.s;
						}

						if (ret.m === 0) {
							delete ret.m;
						}
						if (ret.r === 0) {
							delete ret.r;
						} else if ((ret.r as number) > 0) {
							ret.r = Math.min(ret.r as number, (ret.n as TimelineKeyFrame).t as number - tmpJ - 1);
						}
						delete ret.n;
						return ret;
					})
				};
			});

			let labels: TimelineSerializedLabelsData = {};
			for (let key in tl.l) {
				let label = tl.l[key];
				labels[key] = label.t;
			}
			let c: TimelineSerializedData = {
				l: labels,
				p: tl.p,
				d: tl.d,
				f: fields
			};
			if (game.editor.disableFieldsCache) {
				return c;
			}
			serializeCache.set(this._timelineData, c);
		}
		return serializeCache.get(this._timelineData);
	}

	/// #endif

	@editable({ min: 0 })
	delay = 0;

	_timelineData!: TimelineData;

	update() {
		if (this.isPlaying) {
			if (this.delay > 0) {
				this.delay--;
			} else {
				if (this._goToLabelNextFrame) {
					let label = this._timelineData.l[this._goToLabelNextFrame];
					this._goToLabelNextFrame = false;
					let l = this.fieldPlayers.length;
					for (let i = 0; i < l; i++) {
						this.fieldPlayers[i].goto(label.t, label.n[i]);
					}
				}

				for (let p of this.fieldPlayers) {
					p.update();
				}
			}
		}
		super.update();
	}

	static _findNextKeyframe(timeLineData: TimelineKeyFrame[], time: number): TimelineKeyFrame {
		let ret;
		for (let f of timeLineData) {
			if (f.t > time) {
				return f;
			}
			ret = f;
		}
		return ret as TimelineKeyFrame;
	}

	static _deserializeTimelineData(timelineData: TimelineSerializedData): TimelineData {
		let fields: TimelineFieldData[] = timelineData.f.map((f) => {

			let fieldTimeline = f.t.map((k) => {
				/// #if EDITOR
				if (!k.hasOwnProperty('___react_id')) {
					k.___react_id = MovieClip.__generateKeyframeId();
				}
				/// #endif
				let ret = Object.assign({}, k);
				if (!ret.hasOwnProperty('j')) {
					ret.j = ret.t;
				}
				if (!ret.hasOwnProperty('m')) {
					ret.m = TimelineKeyFrameType.SMOOTH;
				}
				return ret;
			});
			for (let f of fieldTimeline) {
				f.n = MovieClip._findNextKeyframe(fieldTimeline as TimelineKeyFrame[], f.j as number);
			}
			return {
				n: f.n,
				t: fieldTimeline
			} as TimelineFieldData;
		});

		let labels: KeyedMap<TimelineLabelData> = {};
		for (let key in timelineData.l) {
			let labelTime = timelineData.l[key];
			let nextList = fields.map((field) => {
				return MovieClip._findNextKeyframe(field.t, labelTime - 1);
			});
			labels[key] = { t: labelTime, n: nextList };
		}

		const ret = {
			l: labels,
			p: timelineData.p,
			d: timelineData.d,
			f: fields
		};

		/// #if EDITOR
		fields.forEach((f, i) => {
			f.___timelineData = ret;
			f.___fieldIndex = i;
		});
		/// #endif

		return ret;
	}

	_disposePlayers() {
		while (this.fieldPlayers.length > 0) {
			Pool.dispose(this.fieldPlayers.pop());
		}
	}

	resetTimeline() {
		for (let p of this.fieldPlayers) {
			p.reset();
		}
	}

	hasLabel(labelName: string) {
		/// #if EDITOR
		if (!this._timelineData) {
			return;
		}
		/// #endif
		return this._timelineData.l.hasOwnProperty(labelName);
	}

	gotoLabel(labelName: string) {
		assert(this.hasLabel(labelName), 'Label \'' + labelName + '\' not found.', 10055);
		/// #if EDITOR
		if (this.__logLevel) {
			let stack = getCurrentStack('gotoLabel');
			if (this._goToLabelNextFrame && (this._goToLabelNextFrame !== labelName)) {
				game.editor.ui.status.warn('CANCELED label: ' + this._goToLabelNextFrame + '; new label:' + labelName + '; time: ' + game.time, 30021, this, undefined, true);
			}
			game.editor.ui.status.warn(
				R.span(null,
					R.btn('Show stack...', () => {
						showStack(stack);
					}),
					((this._goToLabelNextFrame === labelName) ? 'repeated gotoLabel: ' : 'gotoLabel: ') + labelName + '; time: ' + game.time
				),
				30020, this, undefined, true);
		}
		/// #endif
		this._goToLabelNextFrame = labelName;
		this.play();
	}

	gotoRandomLabel() {
		assert(arguments.length > 1, 'Two or more arguments expected for method gotoRandomLabel.', 10056);

		const labelName = arguments[Math.floor(Math.random() * arguments.length)]; // eslint-disable-line prefer-rest-params

		if (labelName) {
			this.gotoLabel(labelName);
		}
	}

	gotoLabelIf(labelName: string, variablePath: string, invert?: boolean) {
		if ((!getValueByPath(variablePath, this)) !== (!invert)) {
			this.gotoLabel(labelName);
		}
	}

	play() {
		this.isPlaying = true;
	}

	stop() {
		this.isPlaying = false;
	}

	playRecursive() {
		this.isPlaying = true;
		for (let c of this.findChildrenByType(MovieClip)) {
			c.isPlaying = true;
		}
	}

	stopRecursive() {
		this.isPlaying = false;
		for (let c of this.findChildrenByType(MovieClip)) {
			c.isPlaying = false;
		}
	}

	/// #if EDITOR

	init() {
		super.init();
		if ((this.constructor === MovieClip) && (!this._timelineData || !this._timelineData.f.length)) {
			game.editor.ui.status.warn('MovieClip ' + this.___info + ' has no timeline.', 32003, this, 'timeline');
		}

		let timelineData = this._timelineData;
		if (timelineData) {
			const fieldsData: TimelineFieldData[] = timelineData.f;
			for (let fieldNum = 0; fieldNum < fieldsData.length; fieldNum++) {
				const field = fieldsData[fieldNum];
				for (let kf of field.t) {
					if (kf.a === 'this.remove') {
						fieldNum++;
						for (; fieldNum < fieldsData.length; fieldNum++) {
							const field2 = fieldsData[fieldNum];
							for (let kf2 of field2.t) {
								if (kf2.a && kf2.a.startsWith('this.') && (kf.t === kf2.t)) {
									game.editor.ui.status.error(
										'MovieClip \'' + kf2.a + '\' action detected after \'this.remove\'. Its may cause invalid action. Please move \'this.remove\' action to the bottom field of the timeline.', 99999, this, makePathForKeyframeAutoSelect('timeline', field2, kf2));
								}
							}
						}
					}
				}
			}
		}
	}

	static __findPreviousKeyframe(timeLineData: TimelineKeyFrame[], time: number): TimelineKeyFrame {
		let ret;
		for (let f of timeLineData) {
			if (f.t > time) {
				return ret as TimelineKeyFrame;
			}
			ret = f;
		}
		return ret as TimelineKeyFrame;
	}

	__EDITOR_getKeyframeIcon(action: string) {
		switch (action) {
			case 'this.stop': // eslint-disable-line indent
				return ICON_STOP; // eslint-disable-line indent
			case 'this.remove': // eslint-disable-line indent
			case 'this.parent.remove': // eslint-disable-line indent
			case 'this.parent.parent.remove': // eslint-disable-line indent
				return ICON_REMOVE; // eslint-disable-line indent
			default: // eslint-disable-line indent
				if (action.startsWith('Sound.play')) { // eslint-disable-line indent
					return ICON_SOUND; // eslint-disable-line indent
				} // eslint-disable-line indent
				return ICON_DEFAULT; // eslint-disable-line indent
		}
	}

	__invalidateSerializeCache() {
		let timelineData = this._timelineData;
		Lib.__invalidateSerializationCache(this);
		deserializeCache.delete(serializeCache.get(timelineData));
		serializeCache.delete(timelineData);
		timelineData.f.forEach((f, i) => {
			f.___timelineData = timelineData;
			f.___fieldIndex = i;
		});
	}

	__onUnselect() {
		Timeline.deselectMovieClip(this);
	}


	static __generateKeyframeId() {
		return idCounter++;
	}

	__afterSerialization(data: SerializedObject) {
		const def = getPrefabDefaults(this);
		if (data.p.timeline) { // remove animated props from object props
			for (let f of data.p.timeline.f) {
				if (def[f.n] !== f.t[0].v) {
					data.p[f.n] = f.t[0].v;
				} else {
					delete data.p[f.n];
				}
			}
		}
		if (this.__nodeExtendData.isPrefabReference) {
			delete data.p.timeline;
		}
	}

	__checkVisibilityForEditor() {
		if (game.__EDITOR_mode) {
			if (this._timelineData && this._timelineData.f) {
				let fields = this._timelineData.f;
				if (fields.find(f => f.n === 'visible')) {
					this.visible = this.visible || !this.__doNotSelectByClick;
				}
				if ((this.alpha < 0.1) && fields.find(f => f.n === 'alpha')) {
					this.alpha = 1;
				}
				if ((Math.abs(this.scale.x) < 0.02) && fields.find(f => f.n === 'scale.x')) {
					this.scale.x = 1;
				}
				if ((Math.abs(this.scale.y) < 0.02) && fields.find(f => f.n === 'scale.y')) {
					this.scale.y = 1;
				}
			}
		}
	}

	__afterDeserialization() {
		if (game.__EDITOR_mode) {
			if ((this.constructor !== MovieClip) && (!this._timelineData)) {
				this.__initTimeline();
				Lib.__invalidateSerializationCache(this);
			}
			this.resetTimeline();
		}
	}

	__onSelect() {
		super.__onSelect();
		this.__checkVisibilityForEditor();
	}

	__onChildSelected() {
		this.__checkVisibilityForEditor();
	}

	___previewFrame = 0;

	@editable({ min: 0 })
	set __previewFrame(v) {
		this.___previewFrame = v;
		if (game.__EDITOR_mode) {
			this.resetTimeline();
		}
	}

	get __previewFrame() {
		return this.___previewFrame;
	}

	__applyValueToMovieClip(field: TimelineFieldData, time: number) {
		(this as KeyedObject)[field.n] = MovieClip.__getValueAtTime(field, time);
	}

	__applyCurrentTimeValuesToFields(time: number) {
		if (this._timelineData) {
			for (let f of this._timelineData.f) {
				this.__applyValueToMovieClip(f, time);
			}
		}
	}

	static __getValueAtTime(field: TimelineFieldData, time: number): number | boolean | string {
		if (!field.___cacheTimeline) {
			let fieldPlayer = Pool.create(FieldPlayer);
			let discretePositions: true[] = [];
			let c: TimelineFrameValuesCache = [] as any;
			field.___cacheTimeline = c;
			field.___discretePositionsCache = discretePositions;
			let wholeTimelineData = field.___timelineData;
			fieldPlayer.init({} as any, field, wholeTimelineData.p, wholeTimelineData.d);
			fieldPlayer.reset(true);
			calculateCacheSegmentForField(fieldPlayer, c);
			for (let keyFrame of field.t) {
				if (keyFrame.m === TimelineKeyFrameType.DISCRETE) {
					discretePositions[keyFrame.t] = true;
				}
			}
			for (let labelName in wholeTimelineData.l) {
				const label = wholeTimelineData.l[labelName];
				if (!c.hasOwnProperty(label.t)) { //time at this label is not calculated yet
					const prevKeyframe = MovieClip.__findPreviousKeyframe(field.t, label.t);
					fieldPlayer.val = prevKeyframe.v;
					fieldPlayer.speed = 0;
					fieldPlayer.goto(label.t, label.n[field.___fieldIndex]);
					calculateCacheSegmentForField(fieldPlayer, c);
				}
			}
			let filteredValues = c.filter(filterUndefined);

			c.min = Math.min.apply(null, filteredValues);
			c.max = Math.max.apply(null, filteredValues);
			Pool.dispose(fieldPlayer);
		}
		if (field.___cacheTimeline.hasOwnProperty(time)) {
			return field.___cacheTimeline[time];
		} else {
			let prevKeyframe = MovieClip.__findPreviousKeyframe(field.t, time);
			time = prevKeyframe.t;
			if (field.___cacheTimeline.hasOwnProperty(time)) {
				return field.___cacheTimeline[time];
			}
			return prevKeyframe.v as number;
		}
	}

	__initTimeline() {
		this._timelineData = {
			d: 0.85,
			p: 0.02,
			l: {},
			f: []
		};
	}

	__EDITOR_onCreate() {
		super.__EDITOR_onCreate();
		this.__initTimeline();
	}

	@editable({ select: SELECT_LOG_LEVEL })
	__logLevel = 0;


	static __isPropertyDisabled(field: EditablePropertyDesc) { //prevent editing of properties animated inside prefab reference
		for (let o of game.editor.selection) {
			if (o.__nodeExtendData.isPrefabReference) {
				let timeline = getPrefabDefaults(o).timeline as TimelineSerializedData;
				if (timeline && timeline.f.find(f => f.n === field.name)) {
					return 'The property is disabled, because it is animated inside prefab.';
				}
			}
		}
	}
	/// #endif
}


let deserializeCache = new WeakMap();

Container.prototype.gotoLabelRecursive = function (labelName) {
	if (this instanceof MovieClip) {
		if (this.hasLabel(labelName)) {
			this.delay = 0;
			this.gotoLabel(labelName);
		}
	}
	for (let c of this.children) {
		c.gotoLabelRecursive(labelName);
	}
};

/// #if EDITOR

(Container.prototype.gotoLabelRecursive as SelectableProperty).___EDITOR_callbackParameterChooserFunction = (context: Container) => {

	return new Promise((resolve) => {
		let movieClips = context.findChildrenByType(MovieClip);
		if (context instanceof MovieClip) {
			movieClips.push(context);
		}

		let addedLabels: Set<string> = new Set();

		const CUSTOM_LABEL_ITEM = { name: 'Custom label...' };

		let labels = [];
		movieClips.forEach((m) => {
			if (m.timeline) {
				for (let name in m.timeline.l) {
					if (!addedLabels.has(name)) {
						labels.push({ name: R.b(null, name), pureName: name });
						addedLabels.add(name);
					}
				}
			}
		});

		labels.push(CUSTOM_LABEL_ITEM);

		return game.editor.ui.modal.showListChoose('Choose label to go recursive for event ' + game.editor.currentPathChoosingField!.name, labels).then((choosed) => {
			if (choosed) {
				if (choosed === CUSTOM_LABEL_ITEM) {
					game.editor.ui.modal.showPrompt('Enter value', '').then((enteredText) => {
						resolve([enteredText]);
					});
				} else {
					resolve([choosed.pureName]);
				}
			}
			return null;
		});
	});
};


(MovieClip.prototype.gotoLabel as SelectableProperty).___EDITOR_callbackParameterChooserFunction = (context: MovieClip) => {

	return new Promise((resolve) => {

		let addedLabels: Set<string> = new Set();

		const CUSTOM_LABEL_ITEM = { name: 'Custom label...' };

		let labels = [];

		if (context.timeline) {
			for (let name in context.timeline.l) {
				if (!addedLabels.has(name)) {
					labels.push({ name: R.b(null, name), pureName: name });
					addedLabels.add(name);
				}
			}
		}


		labels.push(CUSTOM_LABEL_ITEM);

		return game.editor.ui.modal.showListChoose('Choose label to go', labels).then((choosed) => {
			if (choosed) {
				if (choosed === CUSTOM_LABEL_ITEM) {
					game.editor.ui.modal.showPrompt('Enter value', '').then((enteredText) => {
						resolve([enteredText]);
					});
				} else {
					resolve([choosed.pureName]);
				}
			}
			return null;
		});
	});
};

const filterUndefined = (v: number) => {
	return v !== undefined;
};

const calculateCacheSegmentForField = (fieldPlayer: FieldPlayer, cacheArray: TimelineFrameValuesCache) => {
	fieldPlayer.__doNotCallActions = true;
	let time;
	let i = 0;
	let fields = fieldPlayer.timeline;
	let limit = fields[fields.length - 1].t;
	while (!cacheArray.hasOwnProperty(fieldPlayer.time)) {
		time = fieldPlayer.time;
		if (time > limit) {
			break;
		}
		fieldPlayer.update(true);
		cacheArray[time] = fieldPlayer.val;
		assert(i++ < 100000, 'Timeline values cache calculation looped and failed.');
	}
	fieldPlayer.__doNotCallActions = false;
};


(MovieClip.prototype.play as SelectableProperty).___EDITOR_isGoodForChooser = true;
(MovieClip.prototype.stop as SelectableProperty).___EDITOR_isGoodForChooser = true;
(MovieClip.prototype.playRecursive as SelectableProperty).___EDITOR_isGoodForChooser = true;
(MovieClip.prototype.stopRecursive as SelectableProperty).___EDITOR_isGoodForChooser = true;
(MovieClip.prototype.gotoLabel as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Container.prototype.gotoLabelRecursive as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;

let serializeCache = new WeakMap();

MovieClip.__EDITOR_icon = 'tree/movie';

/// #endif
