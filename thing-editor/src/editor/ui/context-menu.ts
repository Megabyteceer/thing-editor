import { ComponentChild, render } from "preact";

import R from "thing-editor/src/editor/preact-fabrics";
import { Hotkey } from "thing-editor/src/editor/utils/hotkey";

interface ContextMenuItemData {
	name: ComponentChild,
	onClick: ((ev?: PointerEvent) => void) | (() => void),
	disabled?: (() => boolean) | boolean,
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
let hideMenuTimeout: number;

window.addEventListener('pointerdown', (ev: PointerEvent) => {
	if(menuShown && !(ev.target as HTMLDivElement).closest('.stay-after-click-menu-item')) {
		hideMenuTimeout = setTimeout(hideMenu, 10);
	}
});

const showContextMenu = (menuTemplate: ContextMenuItem[], ev: PointerEvent) => {
	if(hideMenuTimeout) {
		clearTimeout(hideMenuTimeout);
		hideMenuTimeout = 0;
	}

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

	render(R.div({
		className: 'context-menu',
		onMouseLeave: hideMenu,
		style: {
			left: Math.max(0, ev.clientX - 3),
			top: Math.max(0, ev.clientY - menuTemplate.length * 20)
		}
	}, menuTemplate.map(renderMenuItem)), root);
	menuShown = true;
}

export default showContextMenu;

function renderMenuItem(item: ContextMenuItem) {

	if(item) {
		return R.btn(item.name, item.onClick, item.tip, item.stayAfterClick ? 'stay-after-click-menu-item' : undefined, item.hotkey);
	} else {
		return R.hr();
	}
}

export type { ContextMenuItem };
