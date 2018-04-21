import PropsFieldWrapper from './props-field-wrapper.js';

var editorProps = {
	className: 'props-editor'
}

function isGroupHidden(groupId) {
	return EDITOR.settings.getItem(groupId, false);
}

function toggleGroup(ev) {
	var groupId = ev.target.dataset.groupid;
	var group = $('.' + groupId + ' .props-group-body');
	var isHidden = !isGroupHidden(groupId);
	EDITOR.settings.setItem(groupId, isHidden);
	if (isHidden) {
		group.addClass('hidden');
	} else {
		group.removeClass('hidden');
	}
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
				var gid = 'props-group-' + p.name;
				curGroupArray = [];
				curGroup = R.div({key: gid, className: 'props-group ' + gid},
					R.div({
						className: 'props-group-header clickable clickable-neg',
						'data-groupid': gid,
						onClick: toggleGroup
					}, p.title),
					R.div({className: 'props-group-body' + (isGroupHidden(gid) ? ' hidden' : '')}, curGroupArray)
				)
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