import { Container } from "pixi.js";
import { ClassAttributes, Component } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import Window from "thing-editor/src/editor/ui/editor-window";
import { renderSceneNode } from "thing-editor/src/editor/ui/tree-view/tree-node";
import isEventFocusOnInputElement from "thing-editor/src/editor/utils/is-event-focus-on-input-element";
import Scene from "thing-editor/src/engine/components/scene.c";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";

let classViewProps = { className: 'vertical-layout' };

function onEmptyClick(ev: PointerEvent) {
	if(!isEventFocusOnInputElement(ev)) {
		game.editor.selection.clearSelection(true);
	}
}

interface TreeViewProps extends ClassAttributes<TreeView> {

}

export default class TreeView extends Component<TreeViewProps> {

	constructor() {
		super();
		this.selectInTree = this.selectInTree.bind(this);
	}

	selectInTree(node: Container, add = false, fieldName?: string) {
		assert(node, "Attempt to select in tree empty node");
		game.editor.selection.select(node, add);
		setTimeout(() => {

			if(fieldName && !add) {
				//TODO game.editor.ui.propsEditor.selectField(fieldName);
			}

			let e = document.querySelector('.scene-tree-view .item-selected') as HTMLElement;
			if(e) {
				Window.bringWindowForward(e.closest('.window-body') as HTMLElement);
				e.scrollIntoView({ block: "center", inline: "center" });
				(e.closest('.scene-tree-view') as HTMLElement).scrollLeft = 0;
			}
		}, 1);
	}

	render() {
		if(!game.stage) return R.span();


		return R.div(classViewProps,

			R.div({ className: 'scene-tree-view-wrap', onMouseDown: onEmptyClick },
				R.div({ className: 'scene-tree-view', onMouseDown: onEmptyClick },
					game.__getScenesStack().map(renderSceneStackItem as any),
					game.stage.children.map(renderRoots as any)
				)
			)
		);
	}
}

const renderRoots = (node: Container, i: number) => {
	if((node === game.currentContainer) || !game.__EDITOR_mode) {
		return renderSceneNode(node);
	} else {
		let style;
		if(node.__nodeExtendData.hidden) {
			style = { display: 'none' };
		}
		return R.div({ className: 'inactive-scene-item', style, key: 'na-' + i, title: 'This scene node is blocked by modal object for now.' }, R.sceneNode(node));
	}
};

const renderSceneStackItem = (s: Scene, i: number, a: Scene[]) => {
	let body;
	if((s === game.currentScene) && (i === (a.length - 1))) {
		return undefined;
	} else if(typeof s === "string") {
		body = R.span(null, "waiting for instancing: " + s);
	} else {
		body = R.sceneNode(s);
	}


	return R.div({ className: 'stacked-scene-item', title: 'This scene currently in stack.', key: i },
		body
	);
};

//TODO enumAssetsPropsRecursive; //COpy from project toproject