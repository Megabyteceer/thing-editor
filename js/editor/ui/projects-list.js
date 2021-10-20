import fs from "../utils/fs.js";
import group from "./group.js";

function getIconPath(desc) {
	return '/games/' + desc.dir + '/' + desc.icon;
}

function renderProjectItem(desc) {
	let icon;
	if (desc.icon) {
		icon = R.img({src: getIconPath(desc)});
	}
	let key = (desc.__group && !desc.dir.startsWith(desc.__group + '/')) ? desc.__group + '/' + desc.dir : desc.dir;
	let isProjectWrong;
	let wrongSymbol = fs.hasWrongSymbol(desc.dir);
	if(wrongSymbol) {
		isProjectWrong = 'Project is blocked because of wrong symbol "' + wrongSymbol + '" in its folder name.';
	}
	return R.div({
		className: isProjectWrong ? 'project-item-select unclickable' : 'project-item-select clickable', key, onClick: () => {
			editor.ui.modal.hideModal(desc.dir);
		}
	}, icon,
	R.div({className: 'project-item-title'}, desc.title,
		R.div({className: 'small-text'}, desc.dir.split('/').pop()),
	),
	isProjectWrong ? R.span({className: 'danger small-text'}, ' (' + isProjectWrong + ')') : undefined);
}

export default class ProjectsList extends React.Component {
	
	static chooseProject (enforced) {
		editor.ui.viewport.stopExecution();
		fs.getJSON('/fs/projects').then((data) => {
			const projectOrder = (projDesc) => {
				return editor.settings.getItem(projDesc.dir + '_EDITOR_lastOpenTime', 0);
			};
			data.sort((a, b) => {
				return projectOrder(b) - projectOrder(a);
			});
			editor.ui.modal.showModal(React.createElement(ProjectsList, {data}), R.span(null, R.icon('open'), 'Choose project to open:'), enforced)
				.then((projDir) => {
					if(projDir) {
						editor.openProject(projDir);
					}
				});
		});
		
	}
	constructor(props) {
		super(props);
		let filter = editor.settings.getItem('projects-filter', '');
		this.state = {filter};
		this.searchInputProps = {
			className: 'projects-search-input',
			onChange: this.onSearchChange.bind(this),
			placeholder: 'Search',
			defaultValue: filter,
			autoFocus: true
		};
	}

	onSearchChange(ev) {
		let filter= ev.target.value.toLowerCase();
		editor.settings.setItem('projects-filter', filter);
		this.setState({filter});
	}

	render() {
		let f = this.state.filter.toLowerCase();
		let items = this.props.data;
		if(f) {
			items = items.filter((i) => {
				return i.title.toLowerCase().indexOf(f) >= 0 || i.dir.toLowerCase().indexOf(f) >= 0;
			}).map(renderProjectItem);
		} else {
			items = group.groupArray(items.map(renderProjectItem), undefined, undefined, true).sort((a, b) => {
				// sort projects groups
				if(a.key < b.key) return -1;
				if(a.key > b.key) return 1;
				return 0;
			});
		}

		return R.div({className:'project-open-chooser'},
			R.input(this.searchInputProps),
			R.div({className: 'projects-list'}, 
				items
			)
		);
	}
}