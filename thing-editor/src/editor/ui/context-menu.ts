import { ComponentChild, render } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";

interface ContextMenuItem {
	name: ComponentChild,
	onClick: () => void,
	disabled?: true,
	tip?: string
}

const root = document.getElementById('context-menu-root') as HTMLElement;

const hideMenu = () => {
	render(R.fragment(), root);
}

const showContextMenu = (menuTemplate: (ContextMenuItem | null)[], ev: PointerEvent) => {
	render(R.div({
		className: 'context-menu',
		onMouseLeave: hideMenu,
		style: {
			left: Math.max(0, ev.clientX - 64),
			top: Math.max(128, ev.clientY - menuTemplate.length * 20)
		}
	}, menuTemplate.map(renderMenuItem)), root);
}

export default showContextMenu;



function renderMenuItem(item: ContextMenuItem | null) {
	if(item) {
		return R.btn(item.name, () => {
			item.onClick();
			hideMenu();
		}, item.tip);
	} else {
		return R.hr(null);
	}
}