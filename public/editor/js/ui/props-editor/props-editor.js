import PropsFieldWrapper from './props-field-wrapper.js';
import Group from '../group.js';

var editorProps = {
	className: 'props-editor'
}

class PropsEditor extends React.Component {
	
	render() {
		if (EDITOR.selection.length <= 0) {
			return 'Nothing selected';
		}
		
		var props = EDITOR.enumObjectsProperties(EDITOR.selection[0]);
		var propsFilter = {};
		
		EDITOR.selection.some((o) => {
			var ps = EDITOR.enumObjectsProperties(o);
			ps.some((p) => {
				var name = p.name;
				propsFilter[name] = propsFilter.hasOwnProperty(name) ? (propsFilter[name] + 1) : 1;
			});
		})
		props = props.filter((p) => {
			return propsFilter[p.name] === EDITOR.selection.length;
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
		return R.div(editorProps, groups);
	}
}

export default PropsEditor;