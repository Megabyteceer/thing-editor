import type { DataPathEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-editors/data-path-editor';
import DataPathEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/data-path-editor';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';


export default class CallbackEditor extends DataPathEditor {

	constructor(props: DataPathEditorProps) {
		super(props);
		this.itIsCallbackEditor = true;
	}

	cleanupPath(path: string): string {
		return path ? path.split(',')[0] : '';
	}

	isItTargetValue(val: any) {
		assert(val, 'empty value selected in callback chooser. Field filter need improvements: ');

		let type = typeof val;
		return (type === 'function') && (!CallbackEditor.isFunctionIsClass(val));
	}

	finalValueChoosed(_path: string[], val: any, parent: any) {
		let path = _path.join('.');

		if (val.___EDITOR_callbackParameterChooserFunction) {
			val.___EDITOR_callbackParameterChooserFunction(parent).then((params: any[] | any) => {
				if (!params) {
					return;
				}
				if (!Array.isArray(params)) {
					params = [params];
				}
				params = params.map((p: any) => {
					if (typeof p === 'number') {
						return p.toString();
					}
					return p;
				});

				for (let p of params) {
					assert((p.indexOf(',') < 0), 'parameter chooser returned parameter containing wrong symbol (, or `)');
				}
				params = params.join(',');
				if (params) {
					this.applyFinalPath(path + ',' + params);
				}
			});
		} else {
			if ((typeof (val) === 'function') && (val.length > 0)) {
				path += ',';
				game.editor.ui.propsEditor.selectField(this.props.field ? this.props.field.name : '.keyframe-callback-editor', true);
			}
			this.applyFinalPath(path);
		}
	}

	get chooseButtonTip() {
		return 'Choose call-back function';
	}

	isFieldGoodForCallbackChoose(fieldName: string, object: KeyedObject, val: SelectableProperty, isChild = false) {
		if (!super.isFieldGoodForCallbackChoose(fieldName, object, val, isChild)) {
			return false;
		}

		if (typeof val === 'undefined') {
			val = object[fieldName];
		}
		if (!val) {
			return false;
		}
		let type = typeof val;
		return (type === 'object' || type === 'function') && !val.___EDITOR_isHiddenForCallbackChooser;
	}

}
