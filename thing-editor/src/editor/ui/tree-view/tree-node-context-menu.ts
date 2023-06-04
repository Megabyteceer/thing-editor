import { SourceMappedConstructor } from "thing-editor/src/editor/env";
import R from "thing-editor/src/editor/preact-fabrics";
import showContextMenu, { ContextMenuItem } from "thing-editor/src/editor/ui/context-menu";
import { editorUtils } from "thing-editor/src/editor/utils/editor-utils";
import Scene from "thing-editor/src/engine/components/scene.c";
import game from "thing-editor/src/engine/game";


const TREE_NODE_CONTEXT_MENU: ContextMenuItem[] = [
	{
		name: R.fragment(R.icon('copy'), "Copy"),
		onClick: editorUtils.onCopyClick,
		disabled: () => {
			return game.editor.selection.length === 0;
		},
		hotkey: { key: 'c', ctrlKey: true }
	},
	{
		name: R.fragment(R.icon('copy'), "Copy name"),
		onClick: () => {
			if(game.editor.selection[0]?.name) {
				game.editor.copyToClipboard(game.editor.selection[0].name as string);
			}
		},
		disabled: () => !game.editor.selection[0]?.name
	},
	{
		name: R.fragment(R.icon('cut'), "Cut"),
		onClick: editorUtils.onCutClick,
		disabled: () => !editorUtils.canDelete(),
		hotkey: { key: 'x', ctrlKey: true }
	},
	{
		name: R.fragment(R.icon('paste'), "Paste"),
		onClick: editorUtils.onPasteClick,
		disabled: () => !editorUtils.canPaste(),
		hotkey: { key: 'v', ctrlKey: true }
	},
	{
		name: R.fragment(R.icon('paste-wrap'), "Paste wrap"),
		tip: "Wrap selected content with clipboard container.",
		onClick: editorUtils.onPasteWrapClick,
		hotkey: { key: 'v', ctrlKey: true, altKey: true }
	},
	null,
	{
		name: R.fragment(R.icon('clone'), "Clone"),
		onClick: editorUtils.clone,
		hotkey: { key: 'd', ctrlKey: true }
	},
	{
		name: R.fragment(R.icon('export-selected'), "Export as PNG..."),
		onClick: editorUtils.onExportAsPngClick
	},
	{
		name: "Arrange ❯",
		onClick: (ev?: PointerEvent) => {
			showContextMenu(TREE_NODE_CONTEXT_ARRANGE_MENU, ev!);
		}
	},
	null,
	{
		name: "Change type...",
		onClick: () => { game.editor.ui.propsEditor.onChangeClassClick() },
	},
	{
		name: "Go to Source code >>>",
		tip: "Double click on tree node to go to it`s source code.",
		onClick: () => {
			const Class = game.editor.selection[0].constructor as SourceMappedConstructor;
			game.editor.editClassSource(Class, Class.__className);
		}
	},
	{
		name: R.fragment(R.icon('asset-prefab'), "Create prefab..."),
		onClick: () => {
			editorUtils.savePrefab(game.editor.selection[0]);
		},
		disabled: () => game.editor.selection.length !== 1 || game.editor.selection[0] instanceof Scene
	},
	null,
	{
		name: R.fragment(R.icon('isolate-selected'), "Isolate"),
		tip: "Temporary hides other content to focus on current selection.",
		onClick: editorUtils.onIsolateClick,
		disabled: () => game.editor.selection.indexOf(game.currentContainer) >= 0
	},
	{
		name: R.fragment(R.icon('delete'), "Delete"),
		onClick: editorUtils.deleteSelected,
		disabled: () => !editorUtils.canDelete(),
		hotkey: { key: 'Delete' }
	},
	{
		name: R.fragment(R.icon('unwrap'), "Unwrap"),
		tip: "Remove selected contaner but keeps children.",
		onClick: editorUtils.onUnwrapClick,
		disabled: () => !editorUtils.isCanBeUnwrapped(),
		hotkey: { key: 'Delete', ctrlKey: true }
	}
];

const TREE_NODE_CONTEXT_ARRANGE_MENU: ContextMenuItem[] = [
	{
		name: R.fragment(R.icon('bring-up'), "Bring top"),
		onClick: editorUtils.onBringUpClick,
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowUp', altKey: true, ctrlKey: true }
	},
	{
		name: R.fragment(R.icon('move-up'), "Move top"),
		onClick: editorUtils.onMoveUpClick,
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowUp', altKey: true }
	},
	{
		name: R.fragment(R.icon('move-down'), "Move bottom"),
		onClick: editorUtils.onMoveDownClick,
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowDown', altKey: true }
	},
	{
		name: R.fragment(R.icon('bring-down'), "Bring bottom"),
		onClick: editorUtils.onBringDownClick,
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowDown', altKey: true, ctrlKey: true }
	},
	null,
	{
		name: "← shift left",
		onClick: () => {
			game.editor.onSelectedPropsChange('x', -1, true);
		},
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowLeft' }
	},
	{
		name: "→ shift right",
		onClick: () => {
			game.editor.onSelectedPropsChange('x', 1, true);
		},
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowRight' }
	},
	{
		name: "↑ shift up",
		onClick: () => {
			game.editor.onSelectedPropsChange('y', -1, true);
		},
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowUp' }
	},
	{
		name: "↓ shift down",
		onClick: () => {
			game.editor.onSelectedPropsChange('y', 1, true);
		},
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowDown' }
	},
	{
		name: "⬅ shift left x10",
		onClick: () => {
			game.editor.onSelectedPropsChange('x', -10, true);
		},
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowLeft', ctrlKey: true }
	},
	{
		name: "⮕ shift right x10",
		onClick: () => {
			game.editor.onSelectedPropsChange('x', 10, true);
		},
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowRight', ctrlKey: true }
	},
	{
		name: "⬆ shift up x10",
		onClick: () => {
			game.editor.onSelectedPropsChange('y', -10, true);
		},
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowUp', ctrlKey: true }
	},
	{
		name: "⬇ shift down x10",
		onClick: () => {
			game.editor.onSelectedPropsChange('y', 10, true);
		},
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowDown', ctrlKey: true }
	}
]

export { TREE_NODE_CONTEXT_MENU, TREE_NODE_CONTEXT_ARRANGE_MENU };

