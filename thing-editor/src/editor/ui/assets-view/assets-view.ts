import { ComponentChild, h } from "preact";
import { KeyedMap, KeyedObject } from "thing-editor/src/editor/env";
import fs, { AllAssetsTypes, AssetType, FileDesc, FileDescClass } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import assetItemRendererClass from "thing-editor/src/editor/ui/assets-view/asset-view-class";
import assetItemRendererImage from "thing-editor/src/editor/ui/assets-view/asset-view-image";
import assetItemRendererScene from "thing-editor/src/editor/ui/assets-view/asset-view-scene";
import assetItemRendererPrefab from "thing-editor/src/editor/ui/assets-view/assets-view-prefab";
import Window, { WindowProps, WindowState } from "thing-editor/src/editor/ui/editor-window";
import group from "thing-editor/src/editor/ui/group";
import WindowMenu from "thing-editor/src/editor/ui/window-menu";
import { searchByRegexpOrText } from "thing-editor/src/editor/utils/searc-by-regexp-or-text";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";

const SETTINGS_KEY = '__EDITOR_assetsView_list';

const assetsItemsRenderers: Map<AssetType, (file: FileDesc) => ComponentChild> = new Map();
assetsItemsRenderers.set(AssetType.IMAGE, assetItemRendererImage);

assetsItemsRenderers.set(AssetType.SOUND, (file: FileDesc) => {
	return R.div({ className: 'assets-item assets-item-sound', key: file.assetName }, assetTypesIcons.get(AssetType.SOUND), file.assetName);
});
assetsItemsRenderers.set(AssetType.SCENE, assetItemRendererScene as (file: FileDesc) => ComponentChild);
assetsItemsRenderers.set(AssetType.PREFAB, assetItemRendererPrefab as (file: FileDesc) => ComponentChild);
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

let allWindowsIds: string[] = [];

function __saveWindowsIds() {
	game.editor.settings.setItem(SETTINGS_KEY, allWindowsIds);
}

interface AssetsViewProps extends WindowProps {
	filter: KeyedMap<boolean>,
}

interface AssetsViewState extends WindowState {
	filter: KeyedMap<boolean>,
	filtersActive?: boolean,
	search: string
}

export default class AssetsView extends Window<AssetsViewProps, AssetsViewState> {

	searchInputProps: KeyedObject;

	constructor(props: AssetsViewProps) {
		super(props);
		if(!this.state.filter) {
			this.setState({ filter: {} });
		}
		this.searchInputProps = {
			className: 'search-input',
			onInput: this.onSearchChange.bind(this),
			placeholder: 'Search',
			defaultValue: this.state.search
		};
	}

	onSearchChange(ev: InputEvent) {
		let search = (ev.target as HTMLInputElement).value.toLowerCase();
		this.setState({ search });
	}

	static renderAssetsViews(): ComponentChild {
		if(allWindowsIds.length === 0) {
			allWindowsIds = game.editor.settings.getItem(SETTINGS_KEY);
			if(!allWindowsIds) {
				allWindowsIds = [];
				let idCounter = 0;
				for(let state of [
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

		const menu = AllAssetsTypes.map((assetType) => {
			return R.span({ key: 'Filters/' + assetType }, R.btn(assetTypesIcons.get(assetType), () => {
				this.state.filter[assetType] = !this.state.filter[assetType];
				this.setState({ filtersActive: Object.values(this.state.filter).some(v => v) });
			}, undefined, this.state.filter[assetType] ? 'toggled-button' : undefined)
			);
		});

		menu.push(R.span({ key: 'Settings/rename' }, R.btn('...', () => {
			enterNameForAssetsWindow(this.state.title as string).then((title) => {
				if(title) {
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

		if(allWindowsIds.length > 1) {
			menu.push(R.span({ key: 'Settings/close' }, R.btn('×', () => {
				game.editor.ui.modal.showEditorQuestion('Are you sure?', 'You about to close "' + this.state.title + '" window.', () => {
					this.eraseSettings();
					allWindowsIds.splice(allWindowsIds.indexOf(this.props.id), 1);
					__saveWindowsIds();
					game.editor.ui.forceUpdate();
				});
			}, 'Close window', 'close-btn')));
		}

		if(this.state.filtersActive) {
			files = files.filter(
				asset => this.state.filter[asset.assetType]
			)
		}
		let clearSearchBtn;
		if(this.state.search) {
			files = files.filter(asset => searchByRegexpOrText(asset.assetName, this.state.search));
			clearSearchBtn = R.btn('×', () => {
				this.setState({ search: '' });
				((this.base as HTMLElement).querySelector('.search-input') as HTMLInputElement).value = '';
			}, 'Discard search filter', 'close-btn clear-search-btn');
		}

		let items = files.map(file => (assetsItemsRenderers.get(file.assetType) as (file: FileDesc) => ComponentChild)(file));

		if(!this.state.search) {
			items = group.groupArray(items, undefined, undefined, undefined, this.props.id);
		}


		return R.fragment(h(WindowMenu, { menu: group.groupArray(menu, undefined, undefined, true, this.props.id) }),
			R.input(this.searchInputProps),
			clearSearchBtn,
			R.div({ className: 'assets-view window-scrollable-content' },
				items
			));
	}
}

function enterNameForAssetsWindow(defaultTitle?: string) {
	return game.editor.ui.modal.showPrompt('Enter name for assets window:',
		defaultTitle,
		undefined,
		(val: string) => { //accept
			if(Lib.hasScene(val)) {
				return "Scene with such name already exists";
			}
			if(val.endsWith('/') || val.startsWith('/')) {
				return 'name can not begin or end with "/"';
			}
		}
	)

}