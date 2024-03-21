import type { ClassAttributes } from 'preact';
import { Component, h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import Timeline from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline';
import FieldsTimelineView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-field';
import TimelineLabelView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-label-view';
import TimelineLineView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-line-view';
import StatusBar from 'thing-editor/src/editor/ui/status-bar';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import type MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';
import type { TimelineFieldData, TimelineLabelData } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';

const objectsTimelineProps = { className: 'objects-timeline' };


interface ObjectsTimelineViewProps extends ClassAttributes<ObjectsTimelineView> {
	node: MovieClip;
	owner: Timeline;
	widthZoom: number;
	heightZoom: number;
}

export default class ObjectsTimelineView extends Component<ObjectsTimelineViewProps> {


	componentDidMount() {
		this.props.owner.applyCurrentTimeValuesToFields([this.props.node]);
	}

	renderTimeLabel(labelName: string, labelsNamesList: string[]) {
		return h(TimelineLabelView, {
			key: labelName,
			owner: this,
			label: this.props.node._timelineData.l[labelName],
			labelName,
			labelsNamesList
		});
	}

	onLabelChange(label: TimelineLabelData) {
		let o = this.props.node;
		TimelineLabelView.renormalizeLabel(label, this.props.node);
		Timeline.allFieldDataChanged(o);
		this.forceUpdate();
	}

	createKeyframeWithTimelineValue(fieldData: TimelineFieldData, time: number) { //used for toggle keyframe
		this.props.owner.setTime(time);
		this.props.owner.createKeyframeWithCurrentObjectsValue(this.props.node, fieldData.n, time);
		Timeline.fieldDataChanged(fieldData, this.props.node);
	}

	deleteAnimationField(fieldData: TimelineFieldData) {
		let timelineData = this.props.node._timelineData;
		let i = timelineData.f.indexOf(fieldData);
		for (let k of fieldData.t) {
			Timeline.unselectKeyframe(k);
		}
		assert(i >= 0, 'Can\'t find field in timeline');
		timelineData.f.splice(i, 1);
		this.props.node._disposePlayers();
		TimelineLineView.invalidateChartsRenderCache(fieldData);
		this.props.node.__invalidateSerializeCache();
		game.editor.sceneModified();
		this.forceUpdate();
	}

	render() {
		let tl = this.props.node._timelineData;

		let labelsNames = tl ? Object.keys(tl.l) : [];
		let width = 0;
		if (tl) {
			for (let f of tl.f) {
				if (f.t[f.t.length - 1].t > width) {
					width = f.t[f.t.length - 1].t;
				}
			}
		}
		width += 500;
		width *= this.props.widthZoom;

		let previewMarker;
		if (this.props.node.__previewFrame) {
			previewMarker = R.div({
				className: 'preview-frame-marker', style: {
					left: this.props.node.__previewFrame * this.props.widthZoom
				}
			}, 'Preview frame');
		}

		let labelsPanel = R.div({
			onMouseDown: (ev: PointerEvent) => { //create new label by right click
				if (tl && ev.buttons === 2) {
					let time = Timeline.mouseEventToTime(ev);

					TimelineLabelView.askForLabelName(labelsNames, 'Create new label:').then((name) => {
						if (name) {
							let label: TimelineLabelData = { t: time } as TimelineLabelData;
							tl.l[name] = label;
							TimelineLabelView.renormalizeLabel(label, this.props.node);
							this.onLabelChange(label);
						}
					});
				} else if (ev.ctrlKey) {
					game.editor.onObjectsPropertyChanged(this.props.node, '__previewFrame', Timeline.mouseEventToTime(ev));
				} else {
					this.props.owner.setTime(Timeline.mouseEventToTime(ev));
					this.props.owner.startTimeDragging();
				}
			},
			style: { width },
			onMouseOver: () => {
				StatusBar.addStatus('Right click to add time label. Ctrl + click to set preview frame', 'timeline-header', 1);
			},
			onMOuseOut: () => {
				StatusBar.removeStatus('timeline-header');
			},
			title: tl && 'Right click to add time label\nCtrl + click to set preview frame',
			className: 'timeline-labels-panel'
		}, previewMarker, labelsNames
			.sort((l1, l2) => {
				const t1 = this.props.node._timelineData.l[l1].t;
				const t2 = this.props.node._timelineData.l[l2].t;
				return t1 === t2 ? l2.length - l1.length : t2 - t1;
			})
			.map((labelName) => {
				return this.renderTimeLabel(labelName, labelsNames);
			}));


		return R.div(objectsTimelineProps,
			labelsPanel,
			tl && tl.f.map((field, i) => {
				return h(FieldsTimelineView, { field, fieldIndex: i, key: field.n, owner: this });
			})
		);
	}
}
