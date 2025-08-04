import type { ClassAttributes } from 'preact';
import { Component } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import type FieldsTimelineView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-field';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game from 'thing-editor/src/engine/game';
import MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';
import type { TimelineFieldData } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';
import showContextMenu from '../../../context-menu';
import Timeline from './timeline';
import TimelineKeyframeView from './timeline-keyframe-view';

interface TimelineFieldControlsProps extends ClassAttributes<TimelineFieldControls> {
	owner: FieldsTimelineView;
}


export default class TimelineFieldControls extends Component<TimelineFieldControlsProps> {

	render() {
		let fieldTimeline = this.props.owner;
		return R.div({ className: 'objects-timeline-labels timeline-fixed-block', onMouseDown: sp, style: { height: this.props.owner.props.owner.props.heightZoom } },
			R.span({ className: 'timeline-field-name',
				onContextMenu: (ev:PointerEvent) => {
					showContextMenu([
						{
							name: R.fragment(R.icon('clone'), 'Clone field animation to...'),
							onClick: async () => {
								const movieClip = fieldTimeline.props.owner.props.node;
								const srcField = fieldTimeline.props.field;
								const srcName = srcField.n;
								const type = typeof (movieClip as KeyedObject)[srcName];
								const names = (MovieClip as SourceMappedConstructor).__editableProps.filter((field) => {
									return field.animate && !movieClip.timeline!.f.some(f => f.n === field.name) && type === typeof (movieClip as KeyedObject)[field.name];
								});

								if (!names.length) {
									game.editor.ui.modal.notify('No other properties with type: ' + type);
									return;
								}
								const chosen = await game.editor.ui.modal.showListChoose('Select field to copy animation to', names.map(f => { return {name: f.name, value: f.name}; }));
								if (chosen) {
									const newField = {
										n: chosen?.value,
										t: srcField.t.map(src => {
											return TimelineKeyframeView.cloneKeyFrame(src);
										})
									} as TimelineFieldData;
									movieClip._timelineData!.f.splice(movieClip.timeline!.f.findIndex(f => srcField.n === f.n) + 1, 0, newField);
									Timeline._invalidateNodeCache(movieClip);
									fieldTimeline.props.owner.props.owner.refresh();
								}
							}
						},
						{
							name: R.fragment(R.icon('delete'), 'Delete field animation'),
							onClick: fieldTimeline.onRemoveFieldClick
						}
					], ev);
				}
			 },
			R.span({ className: 'props-label selectable-text' },
				fieldTimeline.props.field.n
			)
			)
		);
	}
}
