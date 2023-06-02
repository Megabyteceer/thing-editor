import { ComponentChild, render } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";

interface ContextMenuItem {
	name: ComponentChild,
	onClick: () => void,
	disabled?: boolean,
	hidden?: boolean,
	tip?: string
}

const root = document.getElementById('context-menu-root') as HTMLElement;

const hideMenu = () => {
	render(R.fragment(), root);
	menuShown = false;
}

let menuShown = false;
let hideMenuTimeout: number;

window.addEventListener('pointerdown', () => {
	if(menuShown) {
		hideMenuTimeout = setTimeout(hideMenu, 10);
	}
});

const showContextMenu = (menuTemplate: (ContextMenuItem | null)[], ev: PointerEvent) => {
	if(hideMenuTimeout) {
		clearTimeout(hideMenuTimeout);
		hideMenuTimeout = 0;
	}
	render(R.div({
		className: 'context-menu',
		onMouseLeave: hideMenu,
		style: {
			left: Math.max(0, ev.clientX - 64),
			top: Math.max(0, ev.clientY - menuTemplate.length * 20)
		}
	}, menuTemplate.map(renderMenuItem)), root);
	menuShown = true;
}

export default showContextMenu;

function renderMenuItem(item: ContextMenuItem | null) {

	if(item) {
		if(item.disabled) {
			return R.fragment();
		} else {
			return R.btn(item.name, item.onClick, item.tip);
		}
	} else {
		return R.hr();
	}
}