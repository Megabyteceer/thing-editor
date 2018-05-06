import PropsFieldWrapper from './props-field-wrapper.js';
import Group from '../group.js';

var editorProps = {
	className: 'props-editor'
}
var headerProps = {
	className: 'props-header'
}
var headerTextProps = {
	className: 'mid-text-align'
}

class PropsEditor extends React.Component {
	
	onChangeClassClick() {
		var classesList;
		var title;
		if(editor.selection[0] instanceof Scene) {
			classesList = editor.ClassesLoader.sceneClasses;
			title = "Choose new scene type for current scene";
		} else {
			classesList = editor.ClassesLoader.gameObjClasses;
			title = "Choose new type for " + editor.selection.length + " selected element";
			if(editor.selection.length > 1) {
				title += 's';
			}
		}
		
		editor.ui.modal.showListChoose('Choose new class for ', classesList.map(i => i.c)).then((selectedClass) => {
			if(selectedClass && (editor.selection[0].constructor !== selectedClass)) {
				var a = editor.selection.slice(0);
				var selectionData = editor.selection.saveSelection();
				
				a.some((o) => {
					o.constructor = selectedClass;
				});

				var newSceneData = Lib.__serializeObject( game.currentContainer);
				
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
	
	render() {
		if (editor.selection.length <= 0) {
			return 'Nothing selected';
		}
		
		var header;
		var firstClass = editor.selection[0].constructor;
		if(editor.selection.some((o) =>{
			return o.constructor !== firstClass;
		})) {
			header =  R.div(headerProps,'Mixed types selected');
		} else {
			header = R.div(headerProps,
				R.classIcon(firstClass),
				R.span(headerTextProps,
					R.b(null, firstClass.name), ' selected ',
					R.btn('...', this.onChangeClassClick, 'Change objects Class')
				)
			);
		}
		
		var props = editor.enumObjectsProperties(editor.selection[0]);
		var propsFilter = {};
		
		editor.selection.some((o) => {
			var ps = editor.enumObjectsProperties(o);
			ps.some((p) => {
				var name = p.name;
				propsFilter[name] = propsFilter.hasOwnProperty(name) ? (propsFilter[name] + 1) : 1;
			});
		})
		props = props.filter((p) => {
			return propsFilter[p.name] === editor.selection.length;
		});
		
		var groups = [];
		var curGroup, curGroupArray;
		props.some((p) => {
			if (p.type === 'splitter') {
				if (curGroup) {
					groups.push(curGroup);
				}
				curGroupArray = [];
				curGroup = Group.renderGroup({key: p.name, content: curGroupArray, title: p.title});
			} else {
				curGroupArray.push(
					React.createElement(PropsFieldWrapper, {key: p.name, field: p, onChange: this.props.onChange})
				);
			}
			
		});
		groups.push(curGroup);
		return R.div(editorProps, header, groups);
	}
}

export default PropsEditor;