import { ComponentChild, render } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";

interface ContextMenuItem {
	name: ComponentChild,
	onClick: () => void,
	disabled?: boolean,
	tip?: string
}

const root = document.getElementById('context-menu-root') as HTMLElement;

const hideMenu = () => {
	render(R.fragment(), root);
	menuShown = false;
}

let menuShown = false;

window.addEventListener('pointerdown', () => {
	if(menuShown) {
		setTimeout(hideMenu, 10);
	}
});

const showContextMenu = (menuTemplate: (ContextMenuItem | null)[], ev: PointerEvent) => {
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
		return R.btn(item.name, item.onClick, item.tip, undefined, undefined, item.disabled);
	} else {
		return R.hr();
	}
}