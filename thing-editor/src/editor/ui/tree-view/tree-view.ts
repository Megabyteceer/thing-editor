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
import isEventFocusOnInputElement from "thing-editor/src/editor/utils/is-event-focus-on-input-element";
import Selection from "thing-editor/src/editor/utils/selection";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import Scene from "thing-editor/src/engine/lib/assets/src/basic/scene.c";

function onEmptyClick(ev: PointerEvent) {
	if(!isEventFocusOnInputElement(ev)) {
		setTimeout(() => {
			game.editor.selection.clearSelection(true);
		}, 1);
	}
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

const treeViewProps = {
	className: 'scene-tree-view window-scrollable-content',
	onMouseDown: onEmptyClick,
	onContextMenu
};

interface TreeViewState {
	search: string
}

export default class TreeView extends ComponentDebounced<ClassAttributes<TreeView>, TreeViewState> {

	constructor() {
		super();
		this.onSearchKeyDown = this.onSearchKeyDown.bind(this);
		this.onSearchChange = this.onSearchChange.bind(this);
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
				e.scrollIntoView({ block: "center", inline: "center" });
				(e.closest('.scene-tree-view') as HTMLElement).scrollLeft = 0;
			}
		}, 1);
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
					/*let timeline = (o as KeyedObject)[p.name]; //TODO
					if(timeline) { TODO timeline search
						for(let field of timeline.f) {
							for(let k of field.t) {
								if(k.a && (k.a.toLowerCase().indexOf(this.state.search) >= 0)) {
									addSearchEntry(o, Timeline.makePathForKeyframeAutoSelect(p, field, k));
									ret = true;
								}
							}
						}
						for(let label in timeline.l) {
							if(label.toLowerCase().indexOf(this.searchString) >= 0) {
								addSearchEntry(o, p.name + ',,' + label);
								ret = true;
							}
						}
					}*/
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
			R.input({ onKeyDown: this.onSearchKeyDown, onInput: this.onSearchChange, className: 'tree-view-search', defaultValue: this.state.search, placeholder: 'Search' }),

			EDITOR_FLAGS.isolationEnabled ? R.btn('exit isolation', toggleIsolation, undefined, 'clickable isolation-warning', { key: 'i', ctrlKey: true }) : undefined,
			R.div(treeViewProps,
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

//TODO enumAssetsPropsRecursive; //COpy from project toproject