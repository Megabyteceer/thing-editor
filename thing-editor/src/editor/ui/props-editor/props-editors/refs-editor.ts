import { Container } from 'pixi.js';
import { Component, isValidElement } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';
import highlightObject from 'thing-editor/src/editor/utils/highlight-object';
import game from 'thing-editor/src/engine/game';


interface RefFieldEditorState {
	toggled?: boolean;
	filter?: string;
}


export default class RefFieldEditor extends Component<EditablePropertyEditorProps, RefFieldEditorState> {

	RENDER_PROPS = { onMouseEnter: this.onMouseEnter.bind(this) };

	onMouseEnter() {
		if (this.props.value instanceof Container) {
			highlightObject(this.props.value);
		}
	}

	render() {

		let val = this.props.value;

		if (val instanceof Container) {
			return R.span(this.RENDER_PROPS, R.btn(R.sceneNode(val),
				() => {
					if (this.props.value) {
						game.editor.selection.select(this.props.value);
					}
				}
			));
		} else {

			let title;
			if (val) {
				if (typeof val === 'object') {
					title = '[object]';
				} else if (typeof val === 'function') {
					title = 'function: ' + val.name;
				} else {
					title = '' + val;
				}
			} else {
				title = '' + val;
			}
			if (!this.props.value) {
				return '' + this.props.value;
			}
			return R.btn(title, () => {
				if (this.props.value) {
					if (isValidElement(this.props.value)) {
						game.editor.ui.modal.showModal(this.props.value);
					} else if (this.props.field.onClick) {
						this.props.field.onClick(this.props.value);
					} else {
						try {
							game.editor.ui.modal.showModal(R.fragment(
								R.b({ className: '' }, (game.editor.selection[0].constructor as SourceMappedConstructor).__className + '.' + this.props.field.name + ' content:'),
								R.textarea({ readonly: true, value: JSON.stringify(this.props.value, undefined, ' ') })
							));
						} catch (_er) {
							game.editor.ui.modal.showInfo('Object has circular structures and can not be represented as text. Please check browser\'s console to see reference\'s value.', undefined, 32039);
						}
					}
					console.dir(this.props.value);
				}
			});
		}
	}
}
