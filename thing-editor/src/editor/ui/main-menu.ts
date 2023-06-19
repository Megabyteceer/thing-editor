import { Component } from "preact";
import fs from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";

import showContextMenu, { ContextMenuItem } from "thing-editor/src/editor/ui/context-menu";
import Build from "thing-editor/src/editor/utils/build";
import newComponentWizard from "thing-editor/src/editor/utils/new-component-wizard";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import { onNewSceneClick, onSaveAsSceneClick } from "thing-editor/src/editor/utils/scene-utils";
import game from "thing-editor/src/engine/game";

const menuProps = {
	className: 'main-menu',
	"data-help": 'editor.MainMenu' //TODO check help
}

const chooseProjectClick = (_ev?: PointerEvent) => {
	game.editor.chooseProject();
}

const saveSceneClick = (_ev?: PointerEvent) => {
	game.editor.saveCurrentScene();
}

const savePrefabClick = (_ev?: PointerEvent) => {
	PrefabEditor.acceptPrefabEdition();
}

const exitClick = (_ev?: PointerEvent) => {
	fs.exitWithResult('exit menu click');
}

const browseClick = (_ev?: PointerEvent) => {
	fs.browseDir(game.editor.currentProjectDir);
}

const projectPropsClick = (_ev?: PointerEvent) => {
	game.editor.editSource(game.editor.currentProjectDir + 'thing-project.json');
}

const buildReleaseClick = (_ev?: PointerEvent) => {
	Build.build(false);
}

const buildDebugClick = (_ev?: PointerEvent) => {
	Build.build(true);
}

interface MainMenuItem {
	name: string,
	id: string,
	items: ContextMenuItem[]
}

const MAIN_MENU: MainMenuItem[] = [
	{
		name: 'File',
		id: 'file',
		items: [
			{
				name: 'Save scene',
				onClick: saveSceneClick,
				hotkey: { key: 's', ctrlKey: true },
				disabled: () => !game.editor.isCurrentContainerModified || PrefabEditor.currentPrefabName as any as boolean
			},
			{
				name: 'Save prefab',
				onClick: savePrefabClick,
				hotkey: { key: 's', ctrlKey: true },
				disabled: () => !game.editor.isCurrentContainerModified || !PrefabEditor.currentPrefabName as any as boolean
			},
			null,
			{
				name: 'New Component...',
				onClick: newComponentWizard
			},
			null,
			{
				name: "New scene...",
				onClick: onNewSceneClick,
				hotkey: { key: 'n', ctrlKey: true }
			},
			{
				name: "Save scene as...",
				onClick: onSaveAsSceneClick,
				hotkey: { key: 's', ctrlKey: true, shiftKey: true }
			},
			null,
			{
				name: 'Exit',
				onClick: exitClick,
				hotkey: { key: 'w', ctrlKey: true }
			}
		]
	},
	{
		name: 'Edit',
		id: 'edit',
		items: []
	},
	{
		name: 'Project',
		id: 'edit',
		items: [
			{
				name: 'Open project...',
				onClick: chooseProjectClick,
				hotkey: { key: 'o', ctrlKey: true }
			},
			{
				name: 'Browse project folder...',
				tip: 'Reveal project folder in Explorer',
				onClick: browseClick,
				hotkey: { key: 'b', ctrlKey: true }
			},
			null,
			{
				name: 'Project Properties...',
				tip: 'Edit thing-project.json file',
				onClick: projectPropsClick
			},
			null,
			{
				name: 'Build release...',
				onClick: buildReleaseClick
			},
			{
				name: 'Build debug...',
				onClick: buildDebugClick
			}
		]
	}
];

export default class MainMenu extends Component {

	static injectMenu(targetMenuId: string, items: ContextMenuItem[]) {
		let menu: MainMenuItem | undefined = MAIN_MENU.find(i => i.id === targetMenuId);
		if(!menu) {
			menu = {
				id: targetMenuId,
				name: targetMenuId,
				items: []
			}
		}
		menu.items = menu.items.concat(items);
	}

	render() {
		if(!game.editor) {
			return R.fragment();
		}
		return R.div(menuProps,
			MAIN_MENU.map((menuItem: MainMenuItem) => {
				return R.btn(menuItem.name, (ev: PointerEvent) => {
					showContextMenu(menuItem.items, ev);
				});
			}));
		/*
		R.btn('File',
	
			R.btn('Browse...', this.onOpenProjectFolderClick, "Reveal in File Explorer", 'menu-btn'),
			R.btn('Build', this.onBuildClick, "Build release version of game.", 'menu-btn'),
			R.btn('Build debug', this.onBuildDebugClick, "Build debug version of game.\nContains asserts.", 'menu-btn'),
			h(LanguageView),
			h(TexturesView),
			game.editor.history.buttonsRenderer(),
			R.btn('Project settings', game.editor.openProjectDescToEdit, undefined, 'menu-btn'),
			editor.__preBuildAutoTest && R.btn('Test', editor.testProject, "Launch auto-tests", 'menu-btn'),
			editor.fs.filesExt && editor.fs.filesExt.scripts.map((s) => {
				return R.span({ key: s.name }, R.btn(s.name.replace('scripts/', '').replace(/\.js$/, ''), () => {
					editor.fs.exec(s.name);
				}, undefined, 'menu-btn'));
			})
		);*/

	}

}

export { MAIN_MENU };

