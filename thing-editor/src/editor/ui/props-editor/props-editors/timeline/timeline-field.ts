import type { ClassAttributes } from 'preact';
import { h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import ComponentDebounced from 'thing-editor/src/editor/ui/component-debounced';
import type ObjectsTimelineView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/objects-timeline';
import Timeline from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline';
import TimelineFieldControls from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-field-controls';
import TimelineLineView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-line-view';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';
import type { TimelineFieldData, TimelineKeyFrame } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';


interface FieldsTimelineViewProps extends ClassAttributes<FieldsTimelineView> {
	owner: ObjectsTimelineView;
	field: TimelineFieldData;
	fieldIndex: number;
}


export default class FieldsTimelineView extends ComponentDebounced<FieldsTimelineViewProps> {
	constructor(props: FieldsTimelineViewProps) {
		super(props);
		this.onRemoveFieldClick = this.onRemoveFieldClick.bind(this);
		this.toggleKeyframe = this.toggleKeyframe.bind(this);
		props.field.___view = this;
	}

	componentWillReceiveProps(props: FieldsTimelineViewProps) {
		let k1 = this.props.field;
		let k2 = props.field;
		if (k1.___view === this) {
			k1.___view = null;
		}
		k2.___view = this;
	}

	componentWillUnmount() {
		if (this.props.field.___view === this) {
			this.props.field.___view = null;
		}
	}

	toggleKeyframe(time: number) {
		let field = this.props.field;
		let currentKeyframe = MovieClip._findNextKeyframe(field.t, time - 1);
		if (currentKeyframe.t !== time) {
			this.props.owner.createKeyframeWithTimelineValue(field, time);
			this.refresh();
		} else {
			this.deleteKeyframe(currentKeyframe);
		}
	}

	deleteKeyframe(keyFrame: TimelineKeyFrame) {
		let f = this.props.field;
		let i = f.t.indexOf(keyFrame);
		assert(i >= 0, 'can\'t delete keyFrame.');
		if (i > 0) {
			Timeline.unselectKeyframe(keyFrame);
			f.t.splice(i, 1);
			this.onChanged();
			this.refresh();
		}
	}

	onRemoveFieldClick() {
		game.editor.ui.modal.showEditorQuestion('Field animation delete', 'Are you sure you want to delete animation track for field \'' + this.props.field.n + '\'?',
			() => {
				this.props.owner.deleteAnimationField(this.props.field);
			}, 'Delete'
		);
	}

	gotoNextKeyframe(direction: number) {
		let field = this.props.field;
		let timeline = this.props.owner.props.owner;
		let currentTime = timeline.getTime();
		let currentKeyframe = MovieClip._findNextKeyframe(field.t, currentTime - 1);

		let i = field.t.indexOf(currentKeyframe);

		let moved = (currentKeyframe.t - currentTime);

		if (!(((direction > 0) === (moved > 0)) && ((direction < 0) === (moved < 0)))) {
			i += direction;
			if (i < 0) {
				i = field.t.length - 1;
			}
			else if (i >= field.t.length) {
				i = 0;
			}
		}
		timeline.selectKeyframe(field.t[i]);
	}

	onChanged() {
		let node = this.props.owner.props.node;
		let field = this.props.field;
		Timeline.fieldDataChanged(field, node);
		this.refresh();
		node.__applyValueToMovieClip(field, this.props.owner.props.owner.getTime());
	}

	render() {
		let p = this.props.owner.props;
		let height = p.heightZoom;
		return R.div({
			className: 'field-timeline',
			style: {
				backgroundSize: (60 * p.widthZoom) + 'px ' + (height - 10) + 'px',
				height
			}
		}, h(TimelineFieldControls, { owner: this }), h(TimelineLineView, { owner: this })
		);
	}
}
