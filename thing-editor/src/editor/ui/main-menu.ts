import { Component, ComponentChild, h } from "preact";
import fs from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";

import showContextMenu, { ContextMenuItem } from "thing-editor/src/editor/ui/context-menu";
import Build from "thing-editor/src/editor/utils/build";
import newComponentWizard from "thing-editor/src/editor/utils/new-component-wizard";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import { onNewSceneClick, onSaveAsSceneClick } from "thing-editor/src/editor/utils/scene-utils";
import game from "thing-editor/src/engine/game";

const CHECKED = h('span', { className: '.menu-icon' }, '☑');
const UNCHECKED = h('span', { className: '.menu-icon' }, '☐');

let unmutedIconsCache: ComponentChild;
const UNMUTED_ICON = (): ComponentChild => {
	if(!unmutedIconsCache) {
		unmutedIconsCache = R.icon('asset-sound');
	}
	return unmutedIconsCache;
}

let mutedIconsCache: ComponentChild;
const MUTED_ICON = (): ComponentChild => {
	if(!mutedIconsCache) {
		mutedIconsCache = R.icon('sound-mute');
	}
	return mutedIconsCache;
}

const menuProps = {
	className: 'main-menu',
	"data-help": 'editor.MainMenu' //TODO check help
}

const chooseProjectClick = () => {
	game.editor.chooseProject();
}

const saveSceneClick = () => {
	game.editor.saveCurrentScene();
}

const savePrefabClick = () => {
	PrefabEditor.acceptPrefabEdition();
}

const exitClick = () => {
	fs.exitWithResult('exit menu click');
}

const browseClick = () => {
	fs.browseDir(game.editor.currentProjectDir);
}

const projectPropsClick = () => {
	game.editor.editSource(game.editor.currentProjectDir + 'thing-project.json');
}

const buildReleaseClick = () => {
	Build.build(false);
}

const buildDebugClick = () => {
	Build.build(true);
}

interface MainMenuItem {
	name: string,
	id: string,
	items: ContextMenuItem[]
}

const MUTE_SOUND_MENU_ITEM: ContextMenuItem = {
	name: () => {
		return R.fragment(game.editor.settings.getItem('sound-muted') ? MUTED_ICON() : UNMUTED_ICON(), ' Mute game sounds');
	},
	onClick: () => {
		game.editor.toggleSoundMute();
	},
	stayAfterClick: true,
	hotkey: { key: 'm', ctrlKey: true }
}

const MAIN_MENU: MainMenuItem[] = [
	{
		name: 'File',
		id: 'file',
		items: [
			{
				name: 'Open project...',
				onClick: chooseProjectClick,
				hotkey: { key: 'o', ctrlKey: true }
			},
			null,
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
	/*{
		name: 'Edit',
		id: 'edit',
		items: []
	},*/
	{
		name: 'Project',
		id: 'project',
		items: [
			{
				name: 'Browse project folder...',
				tip: 'Reveal project folder in Explorer',
				onClick: browseClick,
				hotkey: { key: 'b', ctrlKey: true }
			},
			null,
			{
				name: 'Build release...',
				onClick: buildReleaseClick
			},
			{
				name: 'Build debug...',
				onClick: buildDebugClick
			},
			null,
			{
				name: 'Project Properties...',
				tip: 'Edit thing-project.json file',
				onClick: projectPropsClick
			}
		]
	},
	{
		name: 'Settings',
		id: 'settings',
		items: [
			MUTE_SOUND_MENU_ITEM,
			{
				name: () => {
					return R.fragment(game.isMobile.any ? CHECKED : UNCHECKED, ' isMobile.any');
				},
				onClick: () => {
					game.editor.toggleIsMobileAny();
				},
				stayAfterClick: true
			},
			{
				name: () => {
					return R.fragment(game.editor.settings.getItem('hide-helpers') ? CHECKED : UNCHECKED, ' Hide helpers');
				},
				tip: 'Hides gizmo and selection outline.',
				onClick: () => {
					game.editor.toggleHideHelpers();
				},
				stayAfterClick: true,
				hotkey: { key: 'h', ctrlKey: true }
			},
			null,
			{
				name: () => {
					return R.fragment(game.editor.settings.getItem('show-system-assets') ? CHECKED : UNCHECKED, ' Show editor`s system assets');
				},
				onClick: () => {
					game.editor.toggleShowSystemAssets();
				},
				stayAfterClick: true
			},
			{
				name: () => {
					return R.fragment(game.editor.settings.getItem('vs-code-excluding') ? UNCHECKED : CHECKED, ' VScode excluding');
				},
				tip: 'Does VSCode should exclude other projects from workspace.',
				onClick: () => {
					game.editor.toggleVSCodeExcluding();
				},
				stayAfterClick: true
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
	}

}

export { MAIN_MENU, MUTE_SOUND_MENU_ITEM };

