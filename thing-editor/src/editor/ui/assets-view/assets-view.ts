import type { ComponentChild } from 'preact';
import { h } from 'preact';
import type { FileDesc, FileDescClass } from 'thing-editor/src/editor/fs';
import fs, { AllAssetsTypes, AssetType } from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import assetItemRendererClass from 'thing-editor/src/editor/ui/assets-view/asset-view-class';
import assetItemRendererImage from 'thing-editor/src/editor/ui/assets-view/asset-view-image';
import assetItemRendererScene from 'thing-editor/src/editor/ui/assets-view/asset-view-scene';
import assetItemRendererSound from 'thing-editor/src/editor/ui/assets-view/asset-view-sound';
import assetItemRendererFont from 'thing-editor/src/editor/ui/assets-view/assets-view-font';
import assetItemRendererPrefab from 'thing-editor/src/editor/ui/assets-view/assets-view-prefab';
import assetItemRendererResource from 'thing-editor/src/editor/ui/assets-view/assets-view-resource';
import type { ContextMenuItem } from 'thing-editor/src/editor/ui/context-menu';
import type { WindowProps, WindowState } from 'thing-editor/src/editor/ui/editor-window';
import Window from 'thing-editor/src/editor/ui/editor-window';
import group from 'thing-editor/src/editor/ui/group';
import WindowMenu from 'thing-editor/src/editor/ui/window-menu';
import { EDITOR_BACKUP_PREFIX } from 'thing-editor/src/editor/utils/flags';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import scrollInToViewAndShake from 'thing-editor/src/editor/utils/scroll-in-view';
import { searchByRegexpOrText } from 'thing-editor/src/editor/utils/searc-by-regexp-or-text';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import assetItemRendererL10n from './assets-view-l10n';

const SETTINGS_KEY = '__EDITOR_assetsView_list';

const assetsItemsRenderers: Map<AssetType, (file: FileDesc) => ComponentChild> = new Map();
assetsItemsRenderers.set(AssetType.IMAGE, assetItemRendererImage as any);

assetsItemsRenderers.set(AssetType.SOUND, assetItemRendererSound);

assetsItemsRenderers.set(AssetType.SCENE, assetItemRendererScene as (file: FileDesc) => ComponentChild);
assetsItemsRenderers.set(AssetType.PREFAB, assetItemRendererPrefab as (file: FileDesc) => ComponentChild);

assetsItemsRenderers.set(AssetType.BITMAP_FONT, assetItemRendererResource as (file: FileDesc) => ComponentChild);
assetsItemsRenderers.set(AssetType.RESOURCE, assetItemRendererResource as (file: FileDesc) => ComponentChild);
assetsItemsRenderers.set(AssetType.FONT, assetItemRendererFont as (file: FileDesc) => ComponentChild);
assetsItemsRenderers.set(AssetType.L10N, assetItemRendererL10n as (file: FileDesc) => ComponentChild);


(assetsItemsRenderers as Map<AssetType, (file: FileDescClass) => ComponentChild>).set(AssetType.CLASS, assetItemRendererClass);

const assetTypesIcons: Map<AssetType, ComponentChild> = new Map();
assetTypesIcons.set(AssetType.IMAGE, R.img({
	src: './img/asset-image.png',
	title: 'Show Images'
}));


assetTypesIcons.set(AssetType.SOUND, R.img({
	src: './img/asset-sound.png',
	title: 'Show Sounds'
}));
assetTypesIcons.set(AssetType.SCENE, R.img({
	src: './img/asset-scene.png',
	title: 'Show Scenes'
}));
assetTypesIcons.set(AssetType.PREFAB, R.img({
	src: './img/asset-prefab.png',
	title: 'Show Prefabs'
}));
assetTypesIcons.set(AssetType.CLASS, R.img({
	src: './img/asset-class.png',
	title: 'Show Components'
}));
assetTypesIcons.set(AssetType.RESOURCE, R.img({
	src: './img/asset-resource.png',
	title: 'Show Resources'
}));

let allWindowsIds: string[] = [];

function __saveWindowsIds() {
	game.editor.settings.setItem(SETTINGS_KEY, allWindowsIds);
}

interface AssetsViewProps extends WindowProps {
	filter: KeyedMap<boolean>;
	hideMenu?: boolean;
	currentValue?: string;
	onItemSelect?: (assetName: string) => void;
	onItemPreview?: (assetName: string) => void;
	filterCallback?: (f: FileDesc) => boolean;
}

interface AssetsViewState extends WindowState {
	filter: KeyedMap<boolean>;
	filtersActive?: boolean;
	search: string;
}

const addSharedAssetContextMenu = (file: FileDesc, menu: ContextMenuItem[]) => {
	const i = menu.lastIndexOf(null);
	if (file.lib) {
		menu.splice(i + 1, 0, {
			name: 'Override asset in project',
			onClick: () => {
				fs.copyAssetToProject(file);
			}
		});
	}
	if (file.assetType !== AssetType.CLASS) {
		menu.splice(i + 1, 0, {
			name: 'Rename...',
			onClick: () => {
				fs.renameAsset(file);
			}
		});
	}
	menu.splice(i + 1, 0, {
		name: 'Reveal in Explorer',
		onClick: () => {
			fs.showFile(file.fileName);
		}
	});
	return menu;
};

export default class AssetsView extends Window<AssetsViewProps, AssetsViewState> {

	static currentItemName?: string = undefined;

	searchInputProps: KeyedObject;

	constructor(props: AssetsViewProps) {
		super(props);

		if (!this.state.filter) {
			this.setState({ filter: {} });
		}

		if (this.props.hideMenu) {
			this.setState({ filter: props.filter, filtersActive: true });
		}

		this.searchInputProps = {
			className: 'search-input',
			onInput: this.onSearchChange.bind(this),
			placeholder: 'Search'
		};
	}

	componentDidMount(): void {
		super.componentDidMount();
		const input = (this.base as HTMLDivElement).querySelector('.search-input') as HTMLInputElement;
		if (input) {
			input.value = this.state.search || '';
			if (this.props.onItemSelect) {
				input.select();
			}
		}
	}

	onSearchChange(ev: InputEvent) {
		let search = (ev.target as HTMLInputElement).value.toLowerCase();
		this.setState({ search });
	}

	static scrollAssetInToView(assetName: string) {
		for (let windowId of allWindowsIds) {
			const windowElement = document.getElementById(windowId) as HTMLDivElement;
			let items = windowElement.querySelectorAll('.assets-item') as any as HTMLElement[];
			for (let item of items) {
				if (item.textContent === assetName) {
					window.setTimeout(() => {
						scrollInToViewAndShake(item);
					}, 10);
					break;
				}
			}
		}
	}

	static renderAssetsViews(): ComponentChild {
		if (!game.editor.isProjectOpen) {
			return R.span();
		}
		if (allWindowsIds.length === 0) {
			allWindowsIds = game.editor.settings.getItem(SETTINGS_KEY);
			if (!allWindowsIds) {
				allWindowsIds = [];
				let idCounter = 0;
				for (let state of [
					{
						x: 0,
						y: 70,
						w: 20,
						h: 30,
						filter: { [AssetType.CLASS]: true },
						filtersActive: true,
						title: 'Classes',
						search: ''
					},
					{
						x: 20,
						y: 70,
						w: 20,
						h: 30,
						filter: { [AssetType.PREFAB]: true },
						filtersActive: true,
						title: 'Prefabs',
						search: ''
					},
					{
						x: 40,
						y: 70,
						w: 20,
						h: 30,
						filter: { [AssetType.IMAGE]: true },
						filtersActive: true,
						title: 'Images',
						search: ''
					},
					{
						x: 60,
						y: 70,
						w: 20,
						h: 30,
						filter: { [AssetType.SOUND]: true },
						filtersActive: true,
						title: 'Sounds',
						search: ''
					},
					{
						x: 80,
						y: 70,
						w: 20,
						h: 30,
						filter: { [AssetType.SCENE]: true },
						filtersActive: true,
						title: 'Scenes',
						search: ''
					}
				] as AssetsViewState[]) {
					const windowId = (Date.now() + idCounter++).toString();
					allWindowsIds.push(windowId);
					Window.saveWindowState(windowId, state);
				}
				__saveWindowsIds();
			}
		}

		return allWindowsIds.map((id) => {
			const props: AssetsViewProps = {
				id,
				x: 0,
				y: 70,
				w: 100,
				h: 30,
				minW: 150,
				minH: 100,
				content: undefined,
				title: 'Assets',
				helpId: 'Assets',
				key: id,
				filter: { [AssetType.CLASS]: true }
			};
			return h(AssetsView, props);
		});
	}

	renderWindowContent(): ComponentChild {
		let files = fs.getAssetsList();
		let menu;

		if (!this.props.hideMenu) {
			menu = AllAssetsTypes.map((assetType) => {
				return R.span({ key: 'Filters/' + assetType }, R.btn(assetTypesIcons.get(assetType), () => {
					this.state.filter[assetType] = !this.state.filter[assetType];
					this.setState({ filtersActive: Object.values(this.state.filter).some(v => v) });
				}, undefined, this.state.filter[assetType] ? 'toggled-button' : undefined)
				);
			});

			menu.push(R.span({ key: 'Settings/rename' }, R.btn('...', () => {
				enterNameForAssetsWindow(this.state.title as string).then((title) => {
					if (title) {
						this.setState({ title });
					}
				});
			}, 'Rename window')));

			menu.push(R.span({ key: 'Settings/clone' }, R.btn('+', () => {
				const cloneWindowId = Date.now().toString();
				const w = this.state.w / 2;
				let cloneState: AssetsViewState = JSON.parse(JSON.stringify(this.state));
				delete (cloneState as any).id;
				cloneState.w = w;
				cloneState.x += w;
				Window.saveWindowState(cloneWindowId, cloneState);
				allWindowsIds.push(cloneWindowId);
				__saveWindowsIds();
				this.setSize(w, this.state.h);
				this.saveState();
				game.editor.ui.refresh();
			}, 'Clone window')));

			if (allWindowsIds.length > 1) {
				menu.push(R.span({ key: 'Settings/close' }, R.btn('×', () => {
					game.editor.ui.modal.showEditorQuestion('Are you sure?', 'You about to close "' + this.state.title + '" window.', () => {
						this.eraseSettings();
						allWindowsIds.splice(allWindowsIds.indexOf(this.props.id), 1);
						__saveWindowsIds();
						game.editor.ui.forceUpdate();
					});
				}, 'Close window', 'close-btn')));
			}

			menu = h(WindowMenu, { menu: group.groupArray(menu, undefined, undefined, true, this.props.id) });
		}

		const showSystemAssets = game.editor.settings.getItem('show-system-assets', false);

		files = files.filter((asset) => {
			if (asset.assetName.startsWith(EDITOR_BACKUP_PREFIX)) {
				return false;
			}
			if (!this.state.filtersActive) {
				return true;
			}

			if (!showSystemAssets) {
				if (asset.assetName.startsWith('___') || asset.assetName.indexOf('/___') > 0) {
					return false;
				}
			}

			return this.state.filter[asset.assetType];
		});

		let clearSearchBtn;
		if (this.state.search) {
			files = files.filter((asset) => {
				if (asset.assetName === AssetsView.currentItemName) {
					return true;
				} else if (asset.assetType === AssetType.SCENE) {
					if (asset.assetName === game.editor.currentSceneName) {
						return true;
					}
				} else if (asset.assetType === AssetType.PREFAB) {
					if (asset.assetName === PrefabEditor.currentPrefabName) {
						return true;
					}
				}

				return searchByRegexpOrText(asset.assetName, this.state.search);
			});

			clearSearchBtn = R.btn('×', () => {
				this.setState({ search: '' });
				((this.base as HTMLElement).querySelector('.search-input') as HTMLInputElement).value = '';
			}, 'Discard search filter', 'close-btn clear-search-btn');
		}
		AssetsView.currentItemName = this.props.currentValue;

		if (this.props.filterCallback) {
			files = files.filter(this.props.filterCallback);
		}

		let items = files.map(AssetsView.renderAssetItem);

		if (!this.state.search) {
			items = group.groupArray(items, undefined, undefined, true, this.props.id);
		}

		return R.fragment(menu,
			R.input(this.searchInputProps),
			this.props.onItemSelect ?
				R.btn('auto accept', (ev) => {
					let itemElement = (ev.target as HTMLDivElement).closest('.window-content')?.querySelector('.assets-item') as HTMLDivElement;
					this.selectItem(itemElement, ev);
				}, undefined, 'hidden', { key: 'Enter' })
				: undefined,
			clearSearchBtn,
			R.div({
				title: this.props.onItemPreview ? 'Click to choose. Ctrl + Click to preview.' : undefined,
				className: 'assets-view window-scrollable-content',
				onMouseDown: this.props.onItemSelect ? (ev: MouseEvent) => {
					let itemElement = (ev.target as HTMLDivElement).closest('.assets-item') as HTMLDivElement;
					this.selectItem(itemElement, ev);
				} : undefined
			},
			items
			));
	}

	resetLayout() {
		game.editor.settings.removeItem(SETTINGS_KEY);
	}

	selectItem(itemElement: HTMLDivElement, ev: MouseEvent) {
		if (itemElement) {
			let chosen = (itemElement.querySelector('.selectable-text') as HTMLSpanElement).innerText;
			if (ev.ctrlKey && this.props.onItemPreview) {
				this.props.onItemPreview!(chosen);
			} else {
				if (this.props.currentValue !== chosen) {
					this.props.onItemSelect!(chosen);
				}
			}
		}
	}

	static renderAssetItem(file: FileDesc) {
		return assetsItemsRenderers.get(file.assetType)!(file);
	}
}

function enterNameForAssetsWindow(defaultTitle?: string) {
	return game.editor.ui.modal.showPrompt('Enter name for assets window:',
		defaultTitle,
		undefined,
		(val: string) => { //accept
			if (Lib.hasScene(val)) {
				return 'Scene with such name already exists';
			}
			if (val.endsWith('/') || val.startsWith('/')) {
				return 'name can not begin or end with "/"';
			}
		}
	);

}

export { addSharedAssetContextMenu, assetTypesIcons };

