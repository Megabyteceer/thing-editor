import type { ComponentChild } from 'preact';
import { Component, h } from 'preact';
import fs from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import group from 'thing-editor/src/editor/ui/group';
import game from 'thing-editor/src/engine/game';

function getIconPath(desc: ProjectDesc) {
	return '/games/' + desc.dir + '/' + desc.icon;
}

let topItem: ProjectDesc | null;

function renderProjectItem(desc: ProjectDesc): ComponentChild {
	if (!topItem) {
		topItem = desc;
	}
	let icon;
	if (desc.icon) {
		icon = R.img({ src: getIconPath(desc) });
	}
	let key = (desc.__group && !desc.dir.startsWith(desc.__group + '/')) ? desc.__group + '/' + desc.dir : desc.dir;
	let isProjectWrong;
	let wrongSymbol = fs.getWrongSymbol(desc.dir);
	if (wrongSymbol) {
		isProjectWrong = 'Project is blocked because of wrong symbol "' + wrongSymbol + '" in its folder name.';
	}
	const isCurrentProject = ('games/' + desc.dir + '/') === game.editor.currentProjectDir;

	let className = (isProjectWrong || isCurrentProject) ? 'project-item-select unclickable' : 'project-item-select clickable';

	return R.div({
		className,
		key,
		onClick: () => {
			game.editor.ui.modal.hideModal(desc.dir);
		}
	},
	icon,
	R.div({ className: 'project-item-title' }, desc.title,
		R.div({ className: 'small-text' }, desc.dir.split('/').pop()),
	),
	isProjectWrong ? R.span({ className: 'danger small-text' }, ' (' + isProjectWrong + ')') : undefined);
}

interface ProjectsListProps {
	projects: ProjectDesc[];

}

interface ProjectsListState {
	filter: string;
	searchInputProps: KeyedObject;
}

export default class ProjectsList extends Component<ProjectsListProps, ProjectsListState> {

	static __chooseProject(noCloseable = false) {

		game.editor.ui.viewport.stopExecution();
		const projects = fs.enumProjects();


		projects.sort((a, b) => {
			return projectOrder(b) - projectOrder(a);
		});
		return game.editor.ui.modal.showModal(h(ProjectsList, { projects }), R.span(null, R.icon('open'), 'Choose project to open:'), noCloseable);
	}

	constructor(props: ProjectsListProps) {
		super(props);
		let filter = game.editor.settings.getItem('projects-filter', '');
		this.state = {
			filter, searchInputProps: {
				className: 'projects-search-input',
				onKeyDown: (e: KeyboardEvent) => {
					if (e.key === 'Enter' && topItem) {
						game.editor.ui.modal.hideModal(topItem.dir);
					}
				},
				onInput: this.onSearchChange.bind(this),
				placeholder: 'Search',
				value: filter
			}
		};
	}

	onSearchChange(ev: Event) {
		let filter = (ev.target as any).value.toLowerCase();
		game.editor.settings.setItem('projects-filter', filter);
		this.state.searchInputProps.value = filter;
		this.setState({ filter });
	}

	render() {
		topItem = null;
		let f = this.state.filter.toLowerCase();
		let items;
		const projects = this.props.projects;
		if (f) {
			items = projects.filter((i: ProjectDesc) => {
				return i.title.toLowerCase().indexOf(f) >= 0 || i.dir.toLowerCase().indexOf(f) >= 0;
			}).map(renderProjectItem);
		} else {

			items = group.groupArray(projects.map(renderProjectItem), undefined, undefined, true).sort((a: any, b: any) => {
				// sort projects groups
				if (a.key < b.key) return -1;
				if (a.key > b.key) return 1;
				return 0;
			});
		}

		return R.div({ className: 'project-open-chooser' },
			R.div(null,
				R.input(this.state.searchInputProps)
			),
			R.div({ className: 'projects-list' },
				items
			)
		);
	}
}

const projectOrder = (projDesc: ProjectDesc) => {
	return game.editor.settings.getItem(projDesc.dir + '_EDITOR_lastOpenTime', 0);
};
