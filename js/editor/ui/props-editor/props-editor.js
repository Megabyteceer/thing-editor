import PropsFieldWrapper from './props-field-wrapper.js';
import Group from '../group.js';
import Window from '../window.js';
import Scene from "thing-editor/js/engine/components/scene.js";
import Lib from	"thing-editor/js/engine/lib.js";
import game from "thing-editor/js/engine/game.js";

let editorProps = {
	className: 'props-editor'
};
let headerProps = {
	className: 'props-header'
};

const MIXED_ICON = {
	__EDITOR_icon: 'tree/mixed-type'
};

const NOTHING_SELECTED = R.div({style: {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	height: '100%'
}}, 'Nothing selected');

class PropsEditor extends React.Component {
	
	static showSelectClass(isScene, title) {
		let classesList;
		
		if(isScene) {
			classesList = editor.ClassesLoader.sceneClasses;
		} else {
			classesList = editor.ClassesLoader.gameObjClasses;
		}
		return editor.ui.modal.showListChoose(title, classesList.map(i => i.c));
	}

	onChangeClassClick() {
		let title;
		let isScene = editor.selection[0] instanceof Scene;
		if(isScene) {
			title = "Choose new scene type for current scene";
		} else {
			title = "Choose new type for " + editor.selection.length + " selected element";
			if(editor.selection.length > 1) {
				title += 's';
			}
		}
		PropsEditor.showSelectClass(isScene, title).then((selectedClass) => {
			if(selectedClass && (editor.selection[0].constructor !== selectedClass)) {
				let a = editor.selection.slice(0);
				let selectionData = editor.selection.saveSelection();
				
				a.some((o) => {
					if(o.constructor.__beforeChangeToThisType) {
						o.constructor.__beforeChangeToThisType(o);
					}
					o.constructor = selectedClass;
					Lib.__invalidateSerializationCache(o);
				});

				let newSceneData = Lib.__serializeObject( game.currentContainer);
				
				a.some((o) => {
					assert(o.hasOwnProperty('constructor'));
					delete o.constructor;
				});
				game.__setCurrentContainerContent(Lib._deserializeObject(newSceneData));
				editor.selection.loadSelection(selectionData);
				editor.sceneModified(true);
			}
		});
	}
	
	selectField(fieldName, focus, selectAll) {
		let a = fieldName.split(',');

		let fn = a[0];
		if(this.refs[fn]) {
			this.refs[fn].onAutoSelect(a);
		}

		setTimeout(() => {
			let fldInput = document.querySelector(".props-editor #property-editor-" + fn.replace('.', '_'));
			if(!fldInput) {
				fldInput = document.querySelector(fieldName);
			}
			if (fldInput) {

				if(fn === fieldName) {
					Window.bringWindowForward(fldInput.closest('.window-body'));
					editor.ui.scrollInToViewAndShake(fldInput);
				}
				
				if(focus || selectAll) {
					let input = fldInput.querySelector('input');
					if(input) {
						input.focus();
						if(selectAll) {
							input.select();
						}
					}
				}
			}
		}, 1);
	}

	
	render() {
		if (editor.selection.length <= 0) {
			return NOTHING_SELECTED;
		}
		
		let header;
		let firstClass = editor.selection[0].constructor;
		if(editor.selection.some((o) =>{
			return o.constructor !== firstClass;
		})) {
			header = R.fragment(R.classIcon(MIXED_ICON), ' Mixed types selected', '...');
		} else {
			header = R.fragment(R.classIcon(firstClass), ' ', R.b( {
				className: 'selectable-text',
				title: 'Ctrl+click to copy Class`s name',
				onMouseDown: window.copyTextByClick
			}, firstClass.name), '...');
		}
		let props = editor.enumObjectsProperties(editor.selection[0]);
		let propsFilter = {};
		
		for(let o of editor.selection) {
			let hidePropsEditor = __getNodeExtendData(o).hidePropsEditor;
			if(hidePropsEditor && !hidePropsEditor.visibleFields) {
				return hidePropsEditor.title || 'Not editable';
			}
			let ps = editor.enumObjectsProperties(o);
			for(let p of ps) {
				let name = p.name;
				if((!hidePropsEditor) || hidePropsEditor.visibleFields[name] || name === 'basic') {
					propsFilter[name] = propsFilter.hasOwnProperty(name) ? (propsFilter[name] + 1) : 1;
				}
			}
		}
		props = props.filter((p) => {
			return propsFilter[p.name] === editor.selection.length;
		});
		
		let groups = [];
		let curGroup, curGroupArray;
		for(let p of props) {
			if(p.visible) {
				let invisible;
				for(let o of editor.selection) {
					if(!p.visible(o)) {
						o[p.name] = editor.ClassesLoader.classesDefaultsById[o.constructor.name][p.name];
						invisible = true;
					}
				}

				if(invisible) {
					curGroupArray.push(
						R.div({key: p.name})
					);
					continue;
				}
			} 

			if (p.type === 'splitter') {
				if (curGroup) {
					groups.push(curGroup);
				}
				curGroupArray = [];
				curGroup = Group.renderGroup({key: p.name, content: curGroupArray, title: p.title});
			} else {
				curGroupArray.push(
					React.createElement(PropsFieldWrapper, {key: p.name, ref: p.name, field: p, onChange: this.props.onChange})
				);
			}
		}
		assert(curGroup, "Properties list started not with splitter.");
		groups.push(curGroup);
		return R.div(editorProps, R.div(headerProps,
			R.btn(header, this.onChangeClassClick, 'Change objects Class', undefined, undefined, !game.__EDITOR_mode)
		), groups);
	}
}

export default PropsEditor;