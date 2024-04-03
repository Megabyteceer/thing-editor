import type { ComponentChild } from 'preact';
import { render } from 'preact';

import R from 'thing-editor/src/editor/preact-fabrics';
import { hotkeyToString, type Hotkey } from 'thing-editor/src/editor/utils/hotkey';

interface ContextMenuItemData {
	name: ComponentChild | (() => ComponentChild);
	onClick: ((ev?: PointerEvent) => void) | (() => void);
	disabled?: (() => boolean);
	hidden?: boolean;
	stayAfterClick?: boolean;
	tip?: string;
	hotkey?: Hotkey;
}

const hotkeyTipProps = {
	className: 'context-menu-item-hotkey'
};

type ContextMenuItem = ContextMenuItemData | null;

const root = document.getElementById('context-menu-root') as HTMLElement;

const hideContextMenu = () => {
	render(R.fragment(), root);
	menuShown = false;
};

let menuShown = false;
let hideMenuTimeout = 0;

window.addEventListener('pointerdown', (ev: PointerEvent) => {
	if (menuShown) {
		hideMenuTimeout = window.setTimeout(() => {
			if ((ev.target as HTMLDivElement).closest('.stay-after-click-menu-item') || (ev.target as HTMLDivElement).classList.contains('context-menu')) {
				refreshContextMenu();
			} else {
				hideContextMenu();
			}
		}, 10);
	}
});

let shownMenuTemplate: ContextMenuItem[];
let shownMenuEvent: PointerEvent;

const toggleContextMenu = (menuTemplate: ContextMenuItem[], ev: PointerEvent) => {
	if (menuShown && shownMenuTemplate === menuTemplate) {
		hideContextMenu();
	} else {
		showContextMenu(menuTemplate, ev);
	}
};

const isItemActive = (item: ContextMenuItem) => {
	if (item) {
		if ((typeof item.disabled === 'function') ? item.disabled() : item.disabled) {
			return false;
		}
	}
	return true;
};

const showContextMenu = (menuTemplate: ContextMenuItem[], ev: PointerEvent) => {
	if (hideMenuTimeout) {
		clearTimeout(hideMenuTimeout);
		hideMenuTimeout = 0;
	}

	shownMenuTemplate = menuTemplate;
	shownMenuEvent = ev;

	//menuTemplate = menuTemplate.filter(isItemDisabled);

	while (menuTemplate[0] === null) { //trim splitters
		menuTemplate.shift();
	}
	while (menuTemplate[menuTemplate.length - 1] === null) {
		menuTemplate.pop();
	}

	for (let i = menuTemplate.length - 3; i >= 0; i--) { // cut double splitters
		if (menuTemplate[i] === null && menuTemplate[i - 1] === null) {
			menuTemplate.splice(i, 1);
		}
	}

	const menuHeight = menuTemplate.length * 40;


	const style = {
		left: Math.max(0, Math.min(window.innerWidth - 200, ev.clientX - 3)),
		top: Math.max(0, Math.min(window.innerHeight - menuHeight, ev.clientY - menuHeight / 2 - 10))
	};
	if ((ev.target as HTMLDivElement).closest('.main-menu')) {
		const mainMenuButton = (ev.target as HTMLDivElement).closest('button') as HTMLButtonElement;
		if (!mainMenuButton) {
			return;
		}
		const bounds = mainMenuButton.getBoundingClientRect();
		style.left = bounds.left;
		style.top = bounds.bottom;
	}

	if (menuTemplate.length > 0) {
		render(R.div({
			className: 'context-menu',
			style,
		}, menuTemplate.map(renderMenuItem)), root);
		menuShown = true;
	}
};

const refreshContextMenu = () => {
	if (menuShown) {
		showContextMenu(shownMenuTemplate, shownMenuEvent);
	}
};


export default showContextMenu;

function renderMenuItem(item: ContextMenuItem) {

	if (item) {
		return R.btn(
			R.fragment(
				R.span(null, (typeof item.name === 'function') ? item.name() : item.name),
				item.hotkey ? R.span(hotkeyTipProps, hotkeyToString(item.hotkey)) : undefined),
			item.onClick,
			item.tip,
			item.stayAfterClick ? 'context-menu-item stay-after-click-menu-item' : 'context-menu-item',
			item.hotkey,
			!isItemActive(item));
	} else {
		return R.hr();
	}
}

export { hideContextMenu, refreshContextMenu, toggleContextMenu };
export type { ContextMenuItem };

