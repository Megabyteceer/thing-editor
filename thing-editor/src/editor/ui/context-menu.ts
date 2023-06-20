import { ComponentChild, render } from "preact";

import R from "thing-editor/src/editor/preact-fabrics";
import { Hotkey } from "thing-editor/src/editor/utils/hotkey";

interface ContextMenuItemData {
	name: ComponentChild | (() => ComponentChild),
	onClick: ((ev?: PointerEvent) => void) | (() => void),
	disabled?: (() => boolean),
	hidden?: boolean,
	stayAfterClick?: boolean,
	tip?: string,
	hotkey?: Hotkey
}

type ContextMenuItem = ContextMenuItemData | null;

const root = document.getElementById('context-menu-root') as HTMLElement;

const hideMenu = () => {
	render(R.fragment(), root);
	menuShown = false;
}

let menuShown = false;
let hideMenuTimeout = 0;

window.addEventListener('pointerdown', (ev: PointerEvent) => {
	if(menuShown) {
		hideMenuTimeout = setTimeout(() => {
			if((ev.target as HTMLDivElement).closest('.stay-after-click-menu-item')) {
				refreshContextMenu();
			} else {
				hideMenu();
			}
		}, 10);
	}
});

let shownMenuTemplate: ContextMenuItem[];
let shownMenuEvent: PointerEvent;

const showContextMenu = (menuTemplate: ContextMenuItem[], ev: PointerEvent) => {
	if(hideMenuTimeout) {
		clearTimeout(hideMenuTimeout);
		hideMenuTimeout = 0;
	}

	shownMenuTemplate = menuTemplate;
	shownMenuEvent = ev;

	menuTemplate = menuTemplate.filter((item: ContextMenuItem) => {
		if(item) {
			if((typeof item.disabled === "function") ? item.disabled() : item.disabled) {
				return false
			}
		}
		return true;
	});

	while(menuTemplate[0] === null) {
		menuTemplate.shift();
	}
	while(menuTemplate[menuTemplate.length - 1] === null) {
		menuTemplate.pop();
	}

	const menuHeight = menuTemplate.length * 40;


	const style = {
		left: Math.max(0, Math.min(window.innerWidth - 200, ev.clientX - 3)),
		top: Math.max(0, Math.min(window.innerHeight - menuHeight, ev.clientY - menuHeight / 2 - 10))
	}
	if((ev.target as HTMLDivElement).closest('.main-menu')) {
		const mainMenuButton = ((ev.target as HTMLDivElement).closest('button') || ev.target) as HTMLButtonElement;
		const bounds = mainMenuButton.getBoundingClientRect();
		style.left = bounds.left;
		style.top = bounds.bottom;
	}

	if(menuTemplate.length > 0) {
		render(R.div({
			className: 'context-menu',
			style,
		}, menuTemplate.map(renderMenuItem)), root);
		menuShown = true;
	}
}

const refreshContextMenu = () => {
	if(menuShown) {
		showContextMenu(shownMenuTemplate, shownMenuEvent);
	}
}


export default showContextMenu;

function renderMenuItem(item: ContextMenuItem) {

	if(item) {
		return R.btn((typeof item.name === 'function') ? item.name() : item.name, item.onClick, item.tip, item.stayAfterClick ? 'stay-after-click-menu-item' : undefined, item.hotkey);
	} else {
		return R.hr();
	}
}

export type { ContextMenuItem };

export { refreshContextMenu };

