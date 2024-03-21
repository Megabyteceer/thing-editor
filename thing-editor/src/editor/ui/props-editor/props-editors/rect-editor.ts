import type { Container } from 'pixi.js';
import { Component, h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditableRect } from 'thing-editor/src/editor/props-editor/editable';
import BooleanEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/boolean-editor';
import type { NumberEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-editors/number-editor';
import NumberEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/number-editor';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import ___RectGuide from 'thing-editor/src/engine/lib/assets/src/___system/___rect-guide.c';

interface RectEditorState {
	focus: boolean;
}

const rectEditorProps = { className: 'rect-editor' };
const propGroupProps = { className: 'rect-editor-group' };

const propLabelProps = { className: 'rect-prop-label' };
const xLabel = R.div(propLabelProps, 'x ');
const yLabel = R.div(propLabelProps, 'y ');
const wLabel = R.div(propLabelProps, 'w ');
const hLabel = R.div(propLabelProps, 'h ');


export default class RectEditor extends Component<EditablePropertyEditorProps, RectEditorState> {

	itIsCallbackEditor = false;

	constructor(props: EditablePropertyEditorProps) {
		super(props);
		this.onXChange = this.onXChange.bind(this);
		this.onYChange = this.onYChange.bind(this);
		this.onWChange = this.onWChange.bind(this);
		this.onHChange = this.onHChange.bind(this);
		this.onNullCheckboxChange = this.onNullCheckboxChange.bind(this);
	}

	timeout = 0;

	componentWillMount() {
		this.checkNullability();
	}

	UNSAFE_componentWillReceiveProps() {
		if (!this.timeout) {
			this.timeout = window.setTimeout(() => {
				this.checkNullability();
				clearTimeout(this.timeout);
				this.timeout = 0;
			}, 6);
		}
	}

	componentWillUnmount() {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = 0;
		}
	}

	checkNullability() {
		if (!(game.editor.selection[0] as KeyedObject)[this.props.field.name] && !this.props.field.canBeEmpty) {
			this.onNullCheckboxChange();
		}
	}

	onXChange(val: number, isDelta: boolean, delta: number) {
		this.changeRectProperty(val, isDelta, delta, 'x');
	}

	onYChange(val: number, isDelta: boolean, delta: number) {
		this.changeRectProperty(val, isDelta, delta, 'y');
	}

	onWChange(val: number, isDelta: boolean, delta: number) {
		this.changeRectProperty(val, isDelta, delta, 'w');
	}

	onHChange(val: number, isDelta: boolean, delta: number) {
		this.changeRectProperty(val, isDelta, delta, 'h');
	}

	changeRectProperty(val: number, isDelta: boolean, delta: number, name: string) {
		let fieldName = this.props.field.name;
		let updated = false;

		for (let o of game.editor.selection as KeyedObject[]) {
			if (isDelta && delta !== 0) {
				o[fieldName][name] += delta;
				Lib.__invalidateSerializationCache(o as Container);
				updated = true;
			} else if (o[fieldName][name] !== val) {
				o[fieldName][name] = val;
				Lib.__invalidateSerializationCache(o as Container);
				updated = true;
			}
			if (this.props.field.hasOwnProperty('parser')) {
				o[fieldName] = this.props.field.parser!(o[fieldName]);
			}
		}
		if (updated) {
			this.forceUpdate();
			game.editor.sceneModified();
		}
	}

	onNullCheckboxChange() {
		const field = this.props.field;
		let fieldName = field.name;
		const rectKey = '___deletedRectangle_' + field.name;
		for (let o of game.editor.selection) {
			let extData = o.__nodeExtendData as KeyedObject;
			const rect = (o as KeyedObject)[fieldName] as EditableRect;
			if (rect) {
				extData[rectKey] = rect;
				(o as KeyedObject)[fieldName] = null;
			} else {
				(o as KeyedObject)[fieldName] = extData[rectKey] || { x: 0, y: 0, w: 100, h: 50 };
			}
		}
		this.forceUpdate();
		game.editor.sceneModified();
	}

	render() {
		let f = this.props.field;

		game.editor.selection.forEach((o) => {
			let r = (o as KeyedObject)[f.name];
			___RectGuide.show(o, f, r);
		});

		let r = (game.editor.selection[0] as KeyedObject)[f.name];
		let body;
		if (r) {
			body = R.div(null,
				R.div(propGroupProps,
					xLabel,
					h(NumberEditor, { field: { min: f.rect_minX, max: f.rect_maxX }, disabled: this.props.disabled, onChange: this.onXChange, value: r.x } as NumberEditorProps)
				),
				R.div(propGroupProps,
					yLabel,
					h(NumberEditor, { field: { min: f.rect_minY, max: f.rect_maxY }, disabled: this.props.disabled, onChange: this.onYChange, value: r.y } as NumberEditorProps),
				),
				R.div(propGroupProps,
					wLabel,
					h(NumberEditor, { field: { min: f.rect_minW, max: f.rect_maxW }, disabled: this.props.disabled, onChange: this.onWChange, value: r.w } as NumberEditorProps),
				),
				R.div(propGroupProps,
					hLabel,
					h(NumberEditor, { field: { min: f.rect_minH, max: f.rect_maxH }, disabled: this.props.disabled, onChange: this.onHChange, value: r.h } as NumberEditorProps)
				)
			);
		}

		return R.div(rectEditorProps,
			f.canBeEmpty ? BooleanEditor({ disabled: this.props.disabled!, onChange: this.onNullCheckboxChange, value: r !== null } as any as EditablePropertyEditorProps) : undefined,
			body
		);
	}
}
