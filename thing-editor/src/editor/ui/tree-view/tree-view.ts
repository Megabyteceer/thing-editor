import { Container } from "pixi.js";
import { ClassAttributes } from "preact";
import { KeyedObject, SourceMappedConstructor } from "thing-editor/src/editor/env";
import R from "thing-editor/src/editor/preact-fabrics";
import ComponentDebounced from "thing-editor/src/editor/ui/component-debounced";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import Window from "thing-editor/src/editor/ui/editor-window";
import { toggleIsolation } from "thing-editor/src/editor/ui/isolation";
import { renderSceneNode } from "thing-editor/src/editor/ui/tree-view/tree-node";
import { editorUtils } from "thing-editor/src/editor/utils/editor-utils";
import EDITOR_FLAGS from "thing-editor/src/editor/utils/flags";
import getParentWhichHideChildren from "thing-editor/src/editor/utils/get-parent-with-hidden-children";
import loadSafeInstanceByClassName from "thing-editor/src/editor/utils/load-safe-instance-by-class-name";
import makePathForKeyframeAutoSelect from "thing-editor/src/editor/utils/movie-clip-keyframe-select-path";
import { scrollInToView } from "thing-editor/src/editor/utils/scroll-in-view";
import Selection from "thing-editor/src/editor/utils/selection";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import Scene from "thing-editor/src/engine/lib/assets/src/basic/scene.c";
import { mouseHandlerGlobal } from "thing-editor/src/engine/utils/game-interaction";

function onEmptyClick() {
	game.editor.selection.clearSelection(true);
}

type SearchEntry = string[];
let searchEntries: Map<Container, SearchEntry> = new Map();
let currentSearchedField: string | undefined;
function addSearchEntry(o: Container, propertyName: string) {
	let a: SearchEntry;
	if(!searchEntries.has(o)) {
		a = [];
		searchEntries.set(o, a);
	} else {
		a = searchEntries.get(o) as SearchEntry;
	}
	a.push(propertyName);
}

const onContextMenu = (ev: PointerEvent) => {
	showContextMenu([
		{
			name: R.fragment(R.icon('paste'), "Paste"),
			onClick: editorUtils.onPasteClick,
			disabled: () => !editorUtils.canPaste()
		}
	], ev);
};

let highlightedDragItem: HTMLDivElement | null = null;
let pointerToItemRelationY = 0;
let dragTargetNode: Container;
let dragTargetExpandTimeOut = 0;
let dragTargetExpandTimeOutTarget: null | Container = null;

function hideDragTarget() {
	if(highlightedDragItem) {
		highlightedDragItem.classList.remove('drag-target-top');
		highlightedDragItem.classList.remove('drag-target-bottom');
		highlightedDragItem.classList.remove('drag-target-mid');
		highlightedDragItem = null;
	}
}

function canBeDragAccepted(ev: DragEvent) {
	for(let i of ev.dataTransfer!.items) {
		if(i.type === "text/thing-editor-class-id") {
			return i;
		}
	}
}

function clearDragExpandTimeOut() {
	if(dragTargetExpandTimeOut) {
		clearTimeout(dragTargetExpandTimeOut);
		dragTargetExpandTimeOut = 0;
		dragTargetExpandTimeOutTarget = null;
	}
}

function addToParentSafe(ClassId: string, parent: Container, at?: number) {
	const Class = game.classes[ClassId];
	if(game.editor.isCanBeAddedAsChild(Class, parent)) {
		const node = loadSafeInstanceByClassName(ClassId, false);
		game.editor.selection.clearSelection();
		game.editor.addTo(parent, node);
		if(typeof at !== 'undefined') {
			parent.addChildAt(node, at);
		}
		return node;
	} else {
		game.editor.ui.modal.notify('cant drop this object here.');
	}
}

interface TreeViewState {
	search: string
}

export default class TreeView extends ComponentDebounced<ClassAttributes<TreeView>, TreeViewState> {

	treeViewProps: any;

	constructor() {
		super();
		this.onSearchKeyDown = this.onSearchKeyDown.bind(this);
		this.onSearchChange = this.onSearchChange.bind(this);


		this.treeViewProps = {
			className: 'scene-tree-view window-scrollable-content',
			onMouseDown: onEmptyClick,
			onContextMenu,
			onDragOver: this.onDragOver.bind(this),
			onDragLeave: this.onDragLeave.bind(this),
			onDrop: this.onDrop.bind(this)
		};
	}

	onDragOver(ev: DragEvent) {
		if(canBeDragAccepted(ev)) {
			let treeItem = this.getClosestTreeItem(ev);
			if(treeItem) {
				hideDragTarget();
				highlightedDragItem = treeItem;

				if(Math.abs(pointerToItemRelationY) < 4) {
					if(!dragTargetNode.__nodeExtendData.childrenExpanded && dragTargetNode.children.length) { // can expand tree item
						if(dragTargetExpandTimeOutTarget !== dragTargetNode) {
							clearDragExpandTimeOut();
							dragTargetExpandTimeOutTarget = dragTargetNode;
							dragTargetExpandTimeOut = setTimeout(() => {
								dragTargetNode.__nodeExtendData.childrenExpanded = true;
								this.refresh();
								dragTargetExpandTimeOut = 0;
								dragTargetExpandTimeOutTarget = null;
							}, 600);
						}
					} else {
						clearDragExpandTimeOut();
					}
					treeItem.classList.add('drag-target-mid');
				} else {
					clearDragExpandTimeOut();
				}


				if(pointerToItemRelationY < 0) {
					treeItem.classList.add('drag-target-top');
				} else {
					treeItem.classList.add('drag-target-bottom');
				}
			} else {
				hideDragTarget();
			}
			ev.dataTransfer!.effectAllowed = "copy";
			ev.dataTransfer!.dropEffect = "copy";
			ev.preventDefault();
		}
	}

	onDragLeave() {
		clearDragExpandTimeOut();
		hideDragTarget();
	}

	onDrop(ev: DragEvent) {
		mouseHandlerGlobal(ev as any);
		if(highlightedDragItem) {
			const ClassId = ev.dataTransfer!.getData('text/thing-editor-class-id');

			if(highlightedDragItem!.classList.contains('drag-target-mid')) {
				addToParentSafe(ClassId, dragTargetNode); // drop as children
			} else if(highlightedDragItem!.classList.contains('drag-target-bottom')) {
				if(dragTargetNode.__nodeExtendData.childrenExpanded && dragTargetNode.children.length) {
					addToParentSafe(ClassId, dragTargetNode, 0); //drop to top of children list
				} else {
					addToParentSafe(ClassId, dragTargetNode.parent, dragTargetNode.parent.children.indexOf(dragTargetNode) + 1); //drop after
				}
			} else {
				addToParentSafe(ClassId, dragTargetNode.parent, dragTargetNode.parent.children.indexOf(dragTargetNode)); //drop before
			}

			clearDragExpandTimeOut();
			hideDragTarget();
		}
	}

	getClosestTreeItem(ev: DragEvent) {
		let treeItem = (ev.target as HTMLDivElement).closest('.scene-node-item') as HTMLDivElement;
		if(!treeItem) {
			const allItems = (this.base as HTMLDivElement).closest('.window-content')!.querySelectorAll('.scene-node-item') as any as HTMLDivElement[];
			let closestDist = Number.MAX_VALUE;
			for(let item of allItems) {
				const itemBox = item.getBoundingClientRect();
				const dist = Math.abs(ev.clientY - (itemBox.y + itemBox.height / 2));
				if(dist < closestDist) {
					closestDist = dist;
					treeItem = item;

				}
			}
		}
		if(treeItem) {
			const itemBox = treeItem.getBoundingClientRect();
			pointerToItemRelationY = ev.clientY - (itemBox.y + itemBox.height / 2);
			dragTargetNode = game.currentContainer;
			game.currentContainer.forAllChildren((c: Container) => {
				if(treeItem.innerText.endsWith('#' + c.___id)) {
					dragTargetNode = c;
				}
			});
		}
		return treeItem;
	}

	selectInTree(node: Container, add = false, fieldName?: string) {
		assert(node, "Attempt to select in tree empty node");
		game.editor.selection.select(node, add);
		setTimeout(() => {

			if(fieldName && !add) {
				game.editor.ui.propsEditor.selectField(fieldName);
			}

			let e = document.querySelector('.scene-tree-view .item-selected') as HTMLElement;
			if(e) {
				Window.bringWindowForward(e.closest('.window-body') as HTMLElement);
				scrollInToView(e);
				(e.closest('.scene-tree-view') as HTMLElement).scrollLeft = 0;
			}
		}, 2);
	}

	shouldComponentUpdate() {
		return false;
	}

	onSearchKeyDown(ev: KeyboardEvent) {
		if(this.state.search && (ev.code === "Enter") && !ev.repeat) {
			this.fundNextBySearch();
		}
	}

	onSearchChange(ev: InputEvent) {
		let search = (ev.target as HTMLInputElement).value.toLowerCase();
		let needSearch = !this.state.search || (this.state.search.length < search.length);
		this.setState({ search }, () => {
			if(needSearch) {
				this.fundNextBySearch();
			}
		});
	}

	fundNextBySearch() {

		this.findNext((o: Container) => {
			let ret;
			if(getParentWhichHideChildren(o)) {
				return;
			}

			if((o.constructor as SourceMappedConstructor).__className.toLowerCase().indexOf(this.state.search) >= 0) return true;

			let props = (o.constructor as SourceMappedConstructor).__editableProps;
			for(let p of props) {
				if(p.type === 'timeline') {
					let timeline = (o as KeyedObject)[p.name];
					if(timeline) {
						for(let field of timeline.f) {
							for(let k of field.t) {
								if(k.a && (k.a.toLowerCase().indexOf(this.state.search) >= 0)) {
									addSearchEntry(o, makePathForKeyframeAutoSelect(p, field, k));
									ret = true;
								}
							}
						}
						for(let label in timeline.l) {
							if(label.toLowerCase().indexOf(this.state.search) >= 0) {
								addSearchEntry(o, p.name + ',,' + label);
								ret = true;
							}
						}
					}
				} else if(p.type !== 'splitter') {
					let val = '' + (o as KeyedObject)[p.name];
					if(val.toLowerCase().indexOf(this.state.search) >= 0) {
						addSearchEntry(o, p.name);
						ret = true;
					}
				}
			}
			return ret;
		}, 1);
	}

	findNext(condition: (o: Container) => boolean | undefined, direction: -1 | 1) {
		searchEntries.clear();

		let a = new Selection();

		const searchIn = (o: Container) => {
			if(!o.__nodeExtendData.isolate) {
				if(condition(o)) {
					a.push(o);
				}
				o.forAllChildren((o) => {
					if(condition(o)) {
						a.push(o);
					}
				});
			}
		};

		if(game.__EDITOR_mode) {
			searchIn(game.currentContainer);
		} else {
			game.stage.forAllChildren((o) => {
				if(condition(o)) {
					a.push(o);
				}
			});
		}

		if(a.length > 0) {

			a.sortSelectedNodes();

			let field: string | undefined;
			let i = a.indexOf(game.editor.selection[0]);
			if(i >= 0) {
				let o = game.editor.selection[0];
				if(searchEntries.has(o)) {
					let entries = searchEntries.get(o) as SearchEntry;
					let i = entries.findIndex(e => (e === currentSearchedField));
					if(i >= 0) {
						i++;
						field = entries[i];
					} else {
						field = entries[0];
					}
				}
				if(!field) {
					i += direction;
					if(i < 0) i = a.length - 1;
					if(i >= a.length) i = 0;
				}
			} else {
				i = 0;
			}
			if(!field) {
				let o = a[i];
				if(searchEntries.has(o)) {
					field = (searchEntries.get(o) as SearchEntry)[0];
				}
			}

			currentSearchedField = field;
			this.selectInTree(a[i], false, field);
		} else {
			game.editor.selection.clearSelection(true);
		}
	}

	render() {
		if(!game.stage) return R.span();
		return R.fragment(
			R.input({ onKeyDown: this.onSearchKeyDown, onInput: this.onSearchChange, className: 'tree-view-search', value: this.state.search, placeholder: 'Search' }),

			EDITOR_FLAGS.isolationEnabled ? R.btn('exit isolation', toggleIsolation, undefined, 'clickable isolation-warning', { key: 'i', ctrlKey: true }) : undefined,
			R.div(this.treeViewProps,
				game.__getScenesStack().map(renderSceneStackItem as any),
				game.stage.children.map(renderRoots as any)
			)
		)
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
