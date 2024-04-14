import type { Container } from 'pixi.js';
import type { ClassAttributes } from 'preact';
import { h } from 'preact';

import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyDesc } from 'thing-editor/src/editor/props-editor/editable';
import ComponentDebounced from 'thing-editor/src/editor/ui/component-debounced';
import Window from 'thing-editor/src/editor/ui/editor-window';
import { getDefaultKeyframeTypeForField } from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/get-keyframe-types-for-field';
import KeyframePropertyEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/keyframe-property-editor';
import ObjectsTimelineView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/objects-timeline';
import TimeMarker from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/time-marker';
import TimelineKeyframeView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-keyframe-view';
import TimelineLabelView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-label-view';
import TimelineLineView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-line-view';
import TimelineLoopPoint from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-loop-point';
import TimelineSelectFrame from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-select-frame';
import type { TimelineSelectable } from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-selectable';
import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import increaseNumberInName from 'thing-editor/src/editor/utils/increase-number-in-name';
import { scrollInToView } from 'thing-editor/src/editor/utils/scroll-in-view';
import shakeDomElement from 'thing-editor/src/editor/utils/shake-element';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';
import type { TimelineFieldData, TimelineKeyFrame, TimelineLabelData, TimelineSerializedKeyFrame, TimelineSerializedLabelsData } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';

interface TimelineCopyPasteData {
	fields: KeyedMap<TimelineSerializedKeyFrame[]>;
	labels: KeyedMap<number>;
	p: number;
	d: number;
}

let widthZoom = 1;
let heightZoom = 1;

let timeMarker: TimeMarker;
function timeMarkerRef(ref: TimeMarker | null) {
	timeMarker = ref!;
}

let selectionFrame: TimelineSelectFrame;

function selectionFrameRef(ref: TimelineSelectFrame | null) {
	selectionFrame = ref!;
}

let fieldLabelTimelineProps = { className: 'timeline-settings objects-timeline-labels timeline-fixed-block' };

const buttonsGroupProps = { className: 'timeline-buttons-group' };


let beforeChangeValueRemember: WeakMap<MovieClip, number>;

let isTimeDragging = false;

let recordingIsDisabled = false;

let timelineInstance!: Timeline;

const justModifiedKeyframes: Set<TimelineSelectable> = new Set();

const selectedComponents: TimelineSelectable[] = [];

function clearSelection() {
	while (selectedComponents.length > 0) {
		unselect(selectedComponents[selectedComponents.length - 1]);
	}
}

function select(component: TimelineSelectable) {
	let k = (component as TimelineKeyframeView).props.keyFrame;
	if (k) {
		k.___keepLoopPoint = (k.t !== k.j);
	}
	assert(selectedComponents.indexOf(component) < 0, 'Component already selected');
	(component as TimelineKeyframeView).setState({ isSelected: true });
	selectedComponents.push(component);
	KeyframePropertyEditor.refresh();
}

function unselect(component: TimelineSelectable) {
	let k = (component as TimelineKeyframeView).props.keyFrame;
	if (k) {
		delete k.___keepLoopPoint;
	}
	let i = selectedComponents.indexOf(component);
	assert(i >= 0, 'Component is not selected');
	(component as TimelineKeyframeView).setState({ isSelected: false });
	selectedComponents.splice(i, 1);
	KeyframePropertyEditor.refresh();
}


interface TimelineProps extends ClassAttributes<Timeline> {
	onCloseClick: () => void;
}

interface TimelineState {
	widthZoom: number;
	heightZoom: number;
}

export default class Timeline extends ComponentDebounced<TimelineProps, TimelineState> {
	constructor(props: TimelineProps) {
		super(props);


		heightZoom = game.editor.settings.getItem('timeline-height-zoom', 41);
		widthZoom = game.editor.settings.getItem('timeline-width-zoom', 3);
		this.state = {
			heightZoom,
			widthZoom
		};
		this.deleteSelectedKeyframes = this.deleteSelectedKeyframes.bind(this);
		this.prevKeyFrame = this.prevKeyFrame.bind(this);
		this.nextKeyFrame = this.nextKeyFrame.bind(this);
		this.prevFrame = this.prevFrame.bind(this);
		this.nextFrame = this.nextFrame.bind(this);
		this.renderObjectsTimeline = this.renderObjectsTimeline.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.verticalZoomIn = this.verticalZoomIn.bind(this);
		this.verticalZoomOut = this.verticalZoomOut.bind(this);
		this._afterHistoryJump = this._afterHistoryJump.bind(this);
		this.horizontalZoomIn = this.horizontalZoomIn.bind(this);
		this.horizontalZoomOut = this.horizontalZoomOut.bind(this);
	}

	static get isElementsSelected() {
		return selectedComponents.length > 0;
	}

	static get isPasteAvailable() {
		return game.editor.settings.getItem('__EDITOR-clipboard-data-timeline-name');
	}

	static copySelection() {
		let keyframesCount = 0;
		let labels: TimelineSerializedLabelsData = {};
		let fields: KeyedMap<TimelineSerializedKeyFrame[]> = {};
		let fieldsByName: KeyedMap<KeyedMap<TimelineSerializedKeyFrame>[]> = {};

		selectedComponents.forEach((c) => {
			if (c instanceof TimelineKeyframeView) {
				let k: KeyedObject = {};
				for (let name in c.props.keyFrame) {
					if ((name.length === 1) && (name !== 'n')) {
						k[name] = (c.props.keyFrame as KeyedObject)[name];
					}
				}
				keyframesCount++;
				let fieldName = c.props.owner.props.owner.props.field.n;
				fieldsByName[fieldName] = fieldsByName[fieldName] || [];

				fieldsByName[fieldName].push(k);
			} else if (c instanceof TimelineLabelView) {
				labels[c.props.labelName] = c.props.label.t;
			}
		});
		for (let name in fieldsByName) {
			fields[name] = fieldsByName[name];
		}

		const labelsList = Object.keys(labels);
		if ((labelsList.length > 0) || (keyframesCount > 0)) {
			let bufferData: TimelineCopyPasteData = {
				fields,
				labels,
				p: (game.editor.selection[0] as MovieClip)._timelineData.p,
				d: (game.editor.selection[0] as MovieClip)._timelineData.d
			};
			game.editor.settings.setItem('__EDITOR-clipboard-data-timeline', bufferData);
			let name = '';
			if (keyframesCount) {
				name += 'Keyframes: ' + keyframesCount;
			}
			if (labelsList.length) {
				if (name) {
					name += '\n';
				}
				name += 'Labels: ' + labelsList.length;
			}
			game.editor.settings.removeItem('__EDITOR-clipboard-data');
			game.editor.settings.setItem('__EDITOR-clipboard-data-timeline-name', 'Paste: \n' + name + '\n');
			game.editor.ui.modal.notify('Copied: ' + name);
			game.editor.refreshTreeViewAndPropertyEditor();
		}
	}

	static pasteSelection() {
		let data: TimelineCopyPasteData = game.editor.settings.getItem('__EDITOR-clipboard-data-timeline');
		if (data) {
			let allKeyframesToSelect: TimelineKeyFrame[] = [];
			for (let o of game.editor.selection as any as MovieClip[]) {

				if (!o._timelineData) {
					o._timelineData = { l: {}, f: [], p: data.p, d: data.d };
				}
				let tl = o._timelineData;

				for (let labelName in data.labels) {
					let labelTime = data.labels[labelName];
					if (!tl.l[labelName]) {
						let l = { t: labelTime } as TimelineLabelData;
						tl.l[labelName] = l;
					} else {
						game.editor.ui.status.warn('Could not paste label "' + labelName + '". Already exists.', 99999, o, 'timeline');
					}
					allKeyframesToSelect.push(tl.l[labelName] as any as TimelineKeyFrame);
				}
				for (let fieldName in data.fields) {
					const keyframes = data.fields[fieldName];
					getFrameAtTimeOrCreate(o, fieldName, 0);
					for (let keyframeData of keyframes) {
						let k = getFrameAtTimeOrCreate(o, fieldName, keyframeData.t!, true);
						Object.assign(k, keyframeData);
						allKeyframesToSelect.push(k as TimelineKeyFrame);
					}
				}
				TimelineLabelView.renormalizeAllLabels(o);
				Timeline.allFieldDataChanged(o);
			}
			timelineInstance.refresh(() => {
				clearSelection();
				allKeyframesToSelect.forEach((kf) => {
					select(kf.___view!);
				});
			});
			game.editor.sceneModified();
		}
	}

	static unselectKeyframe(keyframe: TimelineKeyFrame) {
		for (let c of selectedComponents as TimelineKeyframeView[]) {
			if (c.props.keyFrame === keyframe) {
				unselect(c);
				return;
			}
		}
	}

	static unselectComponent(loopPointView: TimelineSelectable) {
		if (selectedComponents.indexOf(loopPointView) >= 0) {
			unselect(loopPointView);
		}
	}

	selectKeyframe(kf: TimelineKeyFrame) {
		clearSelection();
		select(kf.___view!);
		this.setTime(kf.t, true);
	}

	componentDidMount() {
		clearSelection();
		Timeline.timelineDOMElement = document.querySelector('.timeline');
		timelineInstance = this;
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
		game.editor.history.events.on('beforeHistoryJump', this._beforeHistoryJump);
		game.editor.history.events.on('afterHistoryJump', this._afterHistoryJump);
		this._syncOtherMovieClips(this.getTime());
	}

	static deselectMovieClip(o: MovieClip) {
		for (let i = selectedComponents.length - 1; i >= 0; i--) {
			let c = selectedComponents[i];
			if (c instanceof TimelineKeyframeView) {
				if (c.props.owner.props.owner.props.owner.props.node === o) {
					unselect(c);
				}
			}
		}
	}

	componentWillReceiveProps() {
		this._syncOtherMovieClips(this.getTime());
	}

	static timelineDOMElement: HTMLDivElement | null = null;

	componentWillUnmount() {
		Timeline.timelineDOMElement = null;
		timelineInstance = null!;
		game.editor.history.events.off('beforeHistoryJump', this._beforeHistoryJump);
		game.editor.history.events.off('afterHistoryJump', this._afterHistoryJump);
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
	}

	verticalZoomIn() {
		this.verticalZoom(1.5);
	}

	verticalZoomOut() {
		this.verticalZoom(0.66666666);
	}

	deleteSelectedKeyframes() {
		let i = selectedComponents.length - 1;
		if (i < 0) {
			return;
		}
		while (i >= 0) {
			let c = selectedComponents[i];
			if (c instanceof TimelineKeyframeView) {
				c.props.owner.props.owner.deleteKeyframe(c.props.keyFrame);
			} else if (c instanceof TimelineLabelView) {
				c.deleteLabel();
			} else if (c instanceof TimelineLoopPoint) {
				c.deleteLoopPoint();
			}
			i--;
		}
	}

	verticalZoom(delta: number) {

		heightZoom = this.state.heightZoom;
		let tmp = heightZoom;

		heightZoom *= delta;
		if (heightZoom < 18) {
			heightZoom = 18;
		} else if (heightZoom > 135) {
			heightZoom = 135;
		}
		if (tmp !== heightZoom) {
			heightZoom = Math.round(heightZoom);
			game.editor.settings.setItem('timeline-height-zoom', heightZoom);
			TimelineLineView.invalidateChartsRenderCache();
			this.setState({ heightZoom });
			this.centralizeSelection();
		}
	}

	horizontalZoomIn() {
		this.horizontalZoom(1.5);
	}

	horizontalZoomOut() {
		this.horizontalZoom(0.66666666);
	}

	horizontalZoom(delta: number) {
		widthZoom = this.state.widthZoom;
		let tmp = widthZoom;
		widthZoom *= delta;
		if (widthZoom < 0.5) {
			widthZoom = 0.5;
		} else if (widthZoom > 28.5) {
			widthZoom = 28.5;
		}
		if (tmp !== widthZoom) {
			game.editor.settings.setItem('timeline-width-zoom', widthZoom);
			if (widthZoom < 1.00001) {
				widthZoom = Math.round(widthZoom * 20) / 20.0;
			} else {
				widthZoom = Math.round(widthZoom);
			}
			TimelineLineView.invalidateChartsRenderCache();
			this.setState({ widthZoom });
			this.centralizeSelection();
		}
	}

	centralizeSelection() {
		window.setTimeout(() => {
			if (selectedComponents.length > 0) {
				timeMarker.scrollInToView(selectedComponents[0].getTime());
			}
		}, 0);
	}

	nextKeyFrame() {
		let time = this.getTime();
		let allKeyframes = this._getAllKeyframes();
		for (let k of allKeyframes) {
			if (k.t > time) {
				this.selectKeyframe(k);
				return;
			}
		}
		this.selectKeyframe(allKeyframes[0]);
	}

	_getAllKeyframes() {
		let allKeyframes: TimelineKeyFrame[] = [];
		for (let m of game.editor.selection) {
			if (m instanceof MovieClip && m._timelineData) {
				for (let f of m._timelineData.f) {
					allKeyframes = allKeyframes.concat(f.t);
				}
			}
		}
		allKeyframes.sort(sortFieldsByTime);
		return allKeyframes;
	}

	prevKeyFrame() {
		let time = this.getTime();
		let allKeyframes = this._getAllKeyframes();
		if (allKeyframes.length > 0) {
			if (time === 0) {
				this.selectKeyframe(allKeyframes[allKeyframes.length - 1]);
			} else {
				let reClosestKeyframe = allKeyframes[0];
				for (let k of allKeyframes) {
					if (k.t >= time) {
						this.selectKeyframe(reClosestKeyframe);
						return;
					}
					reClosestKeyframe = k;
				}
			}
		}
	}

	prevFrame() {
		this.setTime(Math.max(0, this.getTime() - 1), true);
	}

	nextFrame() {
		this.setTime(this.getTime() + 1, true);
	}

	renderObjectsTimeline(node: MovieClip) {
		let key = node.___id;
		if (node instanceof MovieClip) {
			return h(ObjectsTimelineView, {
				owner: this, node, key,
				heightZoom,
				widthZoom
			});
		} else {
			return R.div({ key });
		}
	}

	getTime() {
		return timeMarker.state.time;
	}

	setTime(time: number, scrollInToView = false) {
		timeMarker.setTime(time, scrollInToView);
		this._syncOtherMovieClips(time);
		game.editor.refreshPropsEditor();
	}

	_syncOtherMovieClips(time: number) {
		let movieClips: MovieClip[] = game.editor.selection as any as MovieClip[];

		if (!game.__EDITOR_mode || !(movieClips[0])._timelineData) {
			return;
		}

		this.applyCurrentTimeValuesToFields(movieClips, time);

		// apply same animation state to all movieClips around
		let nextLeftLabel;
		let nextLeftLabelName;

		for (let labelName in movieClips[0]._timelineData.l) {
			let label = movieClips[0]._timelineData.l[labelName];
			if ((label.t <= time) && (!nextLeftLabel || nextLeftLabel.t < label.t)) {
				nextLeftLabel = label;
				nextLeftLabelName = labelName;
			}
		}
		if (nextLeftLabel && game.currentContainer) {
			let labelShift = time - nextLeftLabel.t;
			let a = game.currentContainer.findChildrenByType(MovieClip);
			if (game.currentContainer instanceof MovieClip) {
				a.push(game.currentContainer);
			}
			for (let m of a) {
				if (!m.__nodeExtendData.isSelected) {
					if (m.hasLabel(nextLeftLabelName as string)) {
						let time = m._timelineData.l[nextLeftLabelName as string].t + labelShift;
						m.__applyCurrentTimeValuesToFields(time);
					} else {
						m.resetTimeline();
					}
				}
			}
		}
	}

	applyCurrentTimeValuesToFields(nodes: MovieClip[], time?: number) {
		if (game.__EDITOR_mode) {
			if (time === undefined) {
				time = this.getTime();
			}
			nodes.forEach((o) => {
				o.__applyCurrentTimeValuesToFields(time!);
			});
		}
	}

	startTimeDragging() {
		isTimeDragging = true;

	}

	render() {
		return R.fragment(
			(selectedComponents.length > 0) ? R.btn('', this.deleteSelectedKeyframes, undefined, 'hidden', { key: 'Delete' }) : undefined,
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn', {key: 'Escape'}),
			R.div(
				{
					onScroll: onTimelineScroll,
					onMouseDown: this.onMouseDown,
					className: 'timeline'
				},
				R.div(fieldLabelTimelineProps,
					R.span(buttonsGroupProps,
						'\u00A0↕',
						R.btn('-', this.verticalZoomOut, 'Vertical Zoom Out'),
						R.btn('+', this.verticalZoomIn, 'Vertical Zoom In')
					),
					R.span(buttonsGroupProps,
						' ↔',
						R.btn('-', this.horizontalZoomOut, 'Horizontal Zoom Out', undefined, { key: 'Minus', ctrlKey: true }),
						R.btn('+', this.horizontalZoomIn, 'Horizontal Zoom In', undefined, { key: 'Equal', ctrlKey: true })
					),
					R.span(buttonsGroupProps,
						R.btn('copy', Timeline.copySelection, 'Copy selected keyframes and labels', undefined, { key: 'c', ctrlKey: true }, !Timeline.isElementsSelected),
						R.btn('paste', Timeline.pasteSelection, Timeline.isPasteAvailable + '', undefined, { key: 'v', ctrlKey: true }, !Timeline.isPasteAvailable)
					)
				),
				h(TimeMarker, {
					owner: this,
					ref: timeMarkerRef
				}),
				(game.editor.selection as any as MovieClip[]).map(this.renderObjectsTimeline),
				R.div({ className: 'timeline-fixed-block timeline-labels-background' })
			),
			h(KeyframePropertyEditor, {
				owner: this,
				keyframesGetter: getSelectedKeyframes
			}),
			h(TimelineSelectFrame, {
				ref: selectionFrameRef
			}),
			R.span(
				{
					style: {
						display: 'none'
					}
				},
				R.btn('<', this.prevFrame, undefined, undefined, { key: 'Comma' }),
				R.btn('>', this.nextFrame, undefined, undefined, { key: 'Period' }),
				R.btn('<<', this.prevKeyFrame, undefined, undefined, { key: 'Comma', ctrlKey: true }),
				R.btn('>>', this.nextKeyFrame, undefined, undefined, { key: 'Period', ctrlKey: true })
			)
		);
	}

	onMouseUp(ev: MouseEvent) {
		isTimeDragging = false;
		if (draggingComponent) {
			if (reduceRepeatingKeyframesInSelected()) {
				this.refresh();
			}
			if ((ev.clientX > 0) && !ev.ctrlKey && (Math.abs(draggingStartX - ev.clientX) < 2)) {
				if (selectedComponents.length > 1) {
					clearSelection();
					select(draggingComponent);
				}

			}
			draggingXShift = 0;
			draggingComponent = null;
		} else {
			let selectedRect = selectionFrame.getRectAndFinishDragging();
			if (selectedRect) {
				selectElementsInRectangle(selectedRect, ev.shiftKey);
			}
		}
	}

	onMouseDown(ev: MouseEvent) {
		isDragging = true;
		this.onMouseMove(ev);
		if (!draggingComponent && !ev.ctrlKey && !isTimeDragging) {
			selectionFrame.onMouseDown(ev);
		}
	}

	onMouseMove(ev: MouseEvent) {
		if (!Window.all.timeline) {
			return;
		}
		if (Math.abs(draggingStartX - ev.clientX) > 20) {
			draggingStartX = -10000;
		}

		isDragging = isDragging && ev.buttons > 0;

		let time = Timeline.mouseEventToTime(ev);
		if (isDragging) {
			if (draggingComponent) {
				if (ev.buttons === 1) {
					let delta = time - prevDragTime;
					if (delta !== 0) {
						for (let c of selectedComponents) {
							let t = c.getTime();
							delta = Math.max(0, t + delta) - t;
							if (delta === 0) {
								return;
							}
						}
						for (let c of selectedComponents) {
							c.setTime(c.getTime() + delta);
						}

						prevDragTime += delta;
					}
					this.setTime(prevDragTime, true);
				}
			} else {
				if (ev.ctrlKey) {
					for (let c of selectedComponents) {
						if (c instanceof TimelineKeyframeView || c instanceof TimelineLoopPoint) {
							let kf = c.props.keyFrame;
							if (kf.j !== time) {
								kf.j = time;
								c.onChanged();
								c.props.owner.forceUpdate();
								KeyframePropertyEditor.refresh();
							}
						}
					}
				}
			}
		}
		if (isTimeDragging) {
			this.setTime(time);
		}
		selectionFrame.onMouseMove(ev);
	}

	static unregisterDraggableComponent(component: TimelineSelectable) {
		let i = selectedComponents.indexOf(component);
		if (i >= 0) {
			selectedComponents.splice(i, 1);
		}
	}

	static allFieldDataChanged(movieClip: MovieClip) {
		for (let f of movieClip._timelineData.f) {
			Timeline.fieldDataChanged(f, movieClip);
		}
		Timeline._invalidateNodeCache(movieClip);
	}

	static fieldDataChanged(fieldData: TimelineFieldData, node: MovieClip) { //invalidate cache
		assert(node instanceof MovieClip, 'Movieclip expected');
		assert(node._timelineData.f.indexOf(fieldData) >= 0, 'field data is not beyond this movieclip.');
		let timeLineData = fieldData.t;

		timeLineData.sort(sortFieldsByTime);
		for (let field of timeLineData) {
			field.n = MovieClip._findNextKeyframe(timeLineData, field.j);
		}

		fieldData.___cacheTimeline = undefined;
		TimelineLineView.invalidateChartsRenderCache(fieldData);
		Timeline._invalidateNodeCache(node);
	}

	static _invalidateNodeCache(node: MovieClip) {
		node.__invalidateSerializeCache();
		TimelineLabelView.renormalizeAllLabels(node);
		game.editor.sceneModified();
	}

	static _justModifiedSelectable(keyFrame: TimelineSelectable) {
		justModifiedKeyframes.add(keyFrame);
	}

	_beforeHistoryJump() {
		justModifiedKeyframes.clear();
	}

	_afterHistoryJump() {
		window.setTimeout(() => {
			let v = Array.from(justModifiedKeyframes.values());
			if (v.length > 0) {
				clearSelection();
				for (let c of v) {
					select(c);
				}
				if (timeMarker) {
					this.setTime(v[0].getTime(), true);
				}
			}
		}, 2);
	}

	static onBeforePropertyChanged(o: Container, fieldName: string, _field: EditablePropertyDesc, _val: any, _isDelta?: boolean) {
		if ((!Timeline.timelineDOMElement) || recordingIsDisabled) {
			beforeChangeValueRemember = new WeakMap();
		}

		if (o instanceof MovieClip) {
			if (Timeline.timelineDOMElement && !recordingIsDisabled) {
				if (timelineInstance.isNeedAnimateProperty(o, fieldName)) {
					getFrameAtTimeOrCreate(o, fieldName, 0);
				}
			} else {
				let editableField = game.editor.getObjectField(o, fieldName);

				if (editableField.type === 'number') {
					beforeChangeValueRemember.set(o, (o as KeyedObject)[fieldName]);
				} else if (game.__EDITOR_mode && getFieldByName(o, fieldName)) {
					game.editor.ui.modal.showInfo('Could not change \'' + fieldName + '\' field`s  value, because \'' + fieldName + '\' field is animated and it`s type is not numeric', 'Could not change \'' + fieldName + '\' value', 30016);
				}
			}
		}
	}

	static onAfterPropertyChanged(o: Container, fieldName: string, field: EditablePropertyDesc, val: any, isDelta?: boolean) {

		if (o instanceof MovieClip) {
			if (Timeline.timelineDOMElement && !recordingIsDisabled) {
				if (timelineInstance.isNeedAnimateProperty(o, fieldName)) {
					timelineInstance.createKeyframeWithCurrentObjectsValue(o, fieldName, undefined, isDelta, val);
				}
			} else { //shift all keyframes instead of add keyframe
				let editableField = game.editor.getObjectField(o, fieldName);
				if (editableField.type === 'number') {
					let val = (o as KeyedObject)[fieldName];
					let oldVal = beforeChangeValueRemember.get(o) as number;
					if (oldVal !== val) {
						let delta = val - oldVal;
						let fld = getFieldByName(o, fieldName);
						if (fld) {
							for (let kf of fld.t) {
								let changedVal = (kf.v as number) + delta;
								if (field.hasOwnProperty('min')) {
									changedVal = Math.max(field.min!, changedVal);
								}
								if (field.hasOwnProperty('max')) {
									changedVal = Math.min(field.max!, changedVal);
								}
								kf.v = changedVal;
							}
							Timeline.fieldDataChanged(fld, o);
						}
					}
				}
				if (game.__EDITOR_mode) {
					o.resetTimeline();
				}
			}
		}

		if (timelineInstance) {
			timelineInstance.refresh();
		}
	}

	isNeedAnimateProperty(o: MovieClip, fieldName: string) {
		return (this.getTime() > 0 && game.editor.getObjectField(o, fieldName).animate) ||
			getFieldByName(o, fieldName);
	}

	static disableRecording() {
		recordingIsDisabled = true;
	}

	static enableRecording() {
		recordingIsDisabled = false;
	}

	createKeyframeWithCurrentObjectsValue(o: MovieClip, fieldName: string, time?: number, isDelta = false, deltaValue?: number) {
		let keyFrame = getFrameAtTimeOrCreate(o, fieldName, time || this.getTime());
		if (isDelta && !getFrameAtTimeOrCreateReturnedNewKeyframe) {
			let editableField = game.editor.getObjectField(o, fieldName);
			let step = editableField.step || 1;
			keyFrame.v = Math.round(((keyFrame.v as number) + deltaValue!) / step) * step;

		} else {
			keyFrame.v = (o as KeyedObject)[fieldName];
		}
		let field = getFieldByNameOrCreate(o, fieldName);
		Timeline.fieldDataChanged(field, o);
		if (isDelta && keyFrame.___view) {
			let timelineVal = MovieClip.__getValueAtTime(field, keyFrame.t) as number;
			if (!isNaN(timelineVal)) {
				(o as KeyedObject)[fieldName] = timelineVal;
			}
		}
	}

	static mouseEventToTime(ev: MouseEvent) {
		let tl = Timeline.timelineDOMElement as HTMLDivElement;
		let b = tl.getBoundingClientRect();
		let s = Window.all.timeline.renderedScale;

		let x = ev.clientX - 110 * s - b.x - draggingXShift;
		return Math.max(0, Math.round((x + tl.scrollLeft * s) / widthZoom / s));
	}

	static onAutoSelect(selectPath: string[]) {
		for (let o of game.editor.selection as any as MovieClip[]) {
			if (o._timelineData) {
				if (selectPath[2]) { // select label or keyframe.
					if (!selectPath[1]) { //label
						getTimelineWindow('#timeline-label-' + selectPath[2].replace('.', '-').replace('#', '-')).then((labelView: HTMLDivElement) => {
							shakeDomElement(labelView);
						});
						return;
					} else {
						for (let f of o._timelineData.f) {
							if (f.n === selectPath[1]) {
								let time = parseInt(selectPath[2]);
								for (let kf of f.t) {
									if (kf.t == time) {
										if (!kf.___view!.state || !kf.___view!.state.isSelected) {
											select(kf.___view!);
											let kfNode = kf.___view!.base as HTMLDivElement;
											if (kfNode) {
												scrollInToView(kfNode);
												shakeDomElement(kfNode);
											}
											timelineInstance.refresh();
										}

										getTimelineWindow('.bottom-panel').then((w) => {
											let actionEditField = w.querySelector('.props-editor-callback') as HTMLDivElement;
											shakeDomElement(actionEditField);
										});

										return;
									}
								}
							}
						}
					}
				} else { //select timeline property. Shake whole timeline window.
					shakeDomElement(window.document.querySelector('#timeline') as HTMLDivElement);
				}
			}
		}
	}

	static onDraggableMouseDown(this: TimelineSelectable, ev: PointerEvent) {
		draggingStartX = ev.clientX;
		game.editor.blurPropsInputs();
		if (!(this as TimelineKeyframeView).state || !(this as TimelineKeyframeView).state.isSelected) {
			if (!ev.ctrlKey && !ev.shiftKey) {
				clearSelection();
			}
			select(this);
		} else {
			if (!ev.shiftKey && ev.ctrlKey) {
				unselect(this);
			}
		}

		if (ev.altKey) {
			cloneSelectedKeyframes();
		}

		draggingComponent = this;
		let isInvertedShift;
		if (this instanceof TimelineLoopPoint) {
			prevDragTime = this.props.keyFrame.j;
			isInvertedShift = this.props.keyFrame.j > this.props.keyFrame.t;
		} else {
			prevDragTime = ((this as TimelineLabelView).props.label || (this as TimelineKeyframeView).props.keyFrame).t;
		}

		let bounds = (ev.currentTarget as HTMLDivElement).getBoundingClientRect();
		if (isInvertedShift) {
			draggingXShift = ev.clientX - bounds.x - bounds.width;
		} else {
			draggingXShift = ev.clientX - bounds.x;
		}
	}
}

function getTimelineWindow(childSelector: string): Promise<HTMLDivElement> {
	return new Promise((resolve) => {
		let interval = window.setInterval(() => {
			let w = document.querySelector('#timeline') as HTMLDivElement;
			if (w) {
				if (childSelector) {
					w = w.querySelector(childSelector) as HTMLDivElement;
				}
			}
			if (w) {
				clearInterval(interval);
				resolve(w);
			}
		}, 1);
	});
}

function getFieldByName(o: MovieClip, name: string) {
	if (o._timelineData) {
		let fields = o._timelineData.f;
		for (let field of fields) {
			if (field.n === name) {
				return field;
			}
		}
	}
}

function getFieldByNameOrCreate(o: MovieClip, name: string) {
	let field: TimelineFieldData = getFieldByName(o, name) as TimelineFieldData;
	if (!field) {
		if (!o._timelineData) {
			o.__initTimeline();
		}
		field = {
			n: name,
			t: [],
			/// #if EDITOR
			___timelineData: o._timelineData,
			___fieldIndex: o._timelineData.f.length
			/// #endif
		};

		o._timelineData.f.push(field);
	}
	return field;
}

let getFrameAtTimeOrCreateReturnedNewKeyframe = false;

function getFrameAtTimeOrCreate(o: MovieClip, name: string, time: number, doNotModifyEarlyKeyframes = false): TimelineKeyFrame {
	let field = getFieldByNameOrCreate(o, name);
	for (let keyFrame of field.t) {
		if (keyFrame.t === time) {
			getFrameAtTimeOrCreateReturnedNewKeyframe = false;
			return keyFrame;
		}
	}
	getFrameAtTimeOrCreateReturnedNewKeyframe = true;
	return createKeyframe(o, name, time, field, false, doNotModifyEarlyKeyframes);
}


function createKeyframe(o: MovieClip, name: string, time: number, field: TimelineFieldData, isAutomaticCreation = false, doNotModifyEarlyKeyframes = false): TimelineKeyFrame {

	let mode;
	let jumpTime = time;
	let prevField = MovieClip.__findPreviousKeyframe(field.t, time);
	if (prevField) {
		mode = prevField.m;
		if (mode === 3 || mode === 4) {
			mode = 0;
		}
		if (!doNotModifyEarlyKeyframes) {
			if (prevField.j !== prevField.t) { //takes loop point from previous keyframe if it is exists;
				let labelBetweenKeyframes = null;
				for (let lName in o.timeline!.l) {
					let lTime = o.timeline!.l[lName];
					if (lTime >= prevField.t && lTime <= time) {
						labelBetweenKeyframes = true;
						break;
					}
				}
				if (!labelBetweenKeyframes) {
					jumpTime = prevField.j;
					prevField.j = prevField.t;
				}
			}
		}
	} else {
		mode = getDefaultKeyframeTypeForField(o, name);
	}

	let keyFrame: TimelineKeyFrame = {
		v: (o as KeyedObject)[name], //target Value
		t: time, //frame triggering Time
		m: mode,
		j: jumpTime, //Jump to time. If no jump need - equal to 't'
		___react_id: MovieClip.__generateKeyframeId()
	} as any;

	if (!isAutomaticCreation && (name === 'image') && prevField) {
		let step = time - prevField.t;
		let nameStep = increaseNumberInName(prevField.v as string, 1) === o.image ? 1 : -1;
		let nextName = increaseNumberInName(prevField.v as string, nameStep);
		if ((nextName !== prevField.v) && (nextName === o.image)) {
			if (Lib.hasTexture(increaseNumberInName(o.image, nameStep)!)) {
				game.editor.ui.modal.showEditorQuestion('Animation generator', 'Do you want to create keyframes for all same images?',
					() => {
						let image = o.image;
						while (true) {
							image = increaseNumberInName(image, nameStep)!;
							if (Lib.hasTexture(image)) {
								time += step;
								o[name] = image;
								createKeyframe(o, name, time, field, true);
							} else {
								break;
							}
						}
						timelineInstance.refresh();
					}
				);
			}
		}
	}
	field.t.push(keyFrame);
	Timeline.fieldDataChanged(field, o);
	return keyFrame;
}

let draggingComponent: TimelineSelectable | null;
let draggingStartX = 0;
let draggingXShift = 0;
let prevDragTime = -1;

function cloneSelectedKeyframes() {
	for (let c of selectedComponents) {
		if (c instanceof TimelineKeyframeView) {
			c.clone();
		}
	}
}

const sortFieldsByTime = (a: TimelineKeyFrame, b: TimelineKeyFrame) => {
	if (a.t !== b.t) {
		return a.t - b.t;
	}
	return ((a.___view && a.___view.state && a.___view.state.isSelected) ? 0 : 1) -
		((b.___view && b.___view.state && b.___view.state.isSelected) ? 0 : 1);
};

function onTimelineScroll(ev: Event) {
	selectionFrame.cancelSelection();
	for (const element of (document.querySelectorAll('.timeline-fixed-block') as any as HTMLDivElement[])) {
		element.style.left = (ev.target as HTMLDivElement).scrollLeft + 'px';
	}
	(document.querySelector('.timeline-labels-background') as HTMLDivElement).style.top = (ev.target as HTMLDivElement).scrollTop + 'px';
	(document.querySelector('.time-marker-body') as HTMLDivElement).style.top = (ev.target as HTMLDivElement).scrollTop + 'px';
}

let isDragging = false;

function getSelectedKeyframes(): TimelineKeyframeView[] {
	return selectedComponents.filter((c) => {
		return c instanceof TimelineKeyframeView;
	}) as TimelineKeyframeView[];
}

function reduceRepeatingKeyframesInSelected() {
	let isModified = false;
	for (let keyframeComponent of getSelectedKeyframes()) {
		let timeLineKeyframes = keyframeComponent.props.owner.props.owner.props.field.t;
		for (let i = 0; i < timeLineKeyframes.length; i++) {
			let kf = timeLineKeyframes[i];
			for (let j = i + 1; j < timeLineKeyframes.length; j++) {
				let keyFrame = timeLineKeyframes[j];
				if ((kf !== keyFrame) && (kf.t === keyFrame.t)) {
					timeLineKeyframes.splice(j, 1);
					j--;
					isModified = true;
					Timeline.fieldDataChanged(
						keyframeComponent.props.owner.props.owner.props.field,
						keyframeComponent.props.owner.props.owner.props.owner.props.node
					);
				}
			}
		}
	}
	return isModified;
}

function selectIfInRect(rect: DOMRect, obj: TimelineKeyFrame) {
	selectViewIfInRect(rect, obj.___view!);
}

function selectViewIfInRect(rect: DOMRect, view: TimelineSelectable) {
	if (selectedComponents.indexOf(view) >= 0) {
		return;
	}
	let domElement = (view as TimelineKeyframeView).base as HTMLDivElement;
	if (!domElement) {
		return;
	}
	let r = domElement.getBoundingClientRect();

	if (r.right > rect.left && r.left < rect.right) {
		if (r.bottom > rect.top && r.top < rect.bottom) {
			select(view);
		}
	}
}

function selectElementsInRectangle(rect: DOMRect, shiftKey = false) {
	if (!shiftKey) {
		clearSelection();
	}

	for (let o of game.editor.selection) {
		if ((o instanceof MovieClip) && (o._timelineData)) {
			for (let f of o._timelineData.f) {
				for (let kf of f.t) {
					selectIfInRect(rect, kf);
					if (kf.___loopPointView) {
						selectViewIfInRect(rect, kf.___loopPointView as any as TimelineSelectable);
					}
				}
			}
			for (let labelName in o._timelineData.l) {
				let label = o._timelineData.l[labelName];
				selectIfInRect(rect, label as any);
			}
		}
	}

	timelineInstance.onMouseUp({} as any);
	timelineInstance.refresh();
}

editorEvents.on('beforePropertyChanged', Timeline.onBeforePropertyChanged);
editorEvents.on('afterPropertyChanged', Timeline.onAfterPropertyChanged);
