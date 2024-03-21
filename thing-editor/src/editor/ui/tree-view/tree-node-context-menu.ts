import type { Container } from 'pixi.js';
import { Sprite } from 'pixi.js';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { ContextMenuItem } from 'thing-editor/src/editor/ui/context-menu';
import showContextMenu from 'thing-editor/src/editor/ui/context-menu';
import { toggleIsolation } from 'thing-editor/src/editor/ui/isolation';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import EDITOR_FLAGS from 'thing-editor/src/editor/utils/flags';
import game from 'thing-editor/src/engine/game';
import Scene from 'thing-editor/src/engine/lib/assets/src/basic/scene.c';


const selectInvisibleParent = (node: Container) => {
	let o = editorUtils.findInvisibleParent(node);
	if (o) {
		if (!o.visible) {
			game.editor.selection.select(o);
			game.editor.ui.propsEditor.selectField('visible', true);
		} else if (o.alpha < 0.01) {
			game.editor.selection.select(o);
			game.editor.ui.propsEditor.selectField('alpha', true);
		} else if (o.scale.x < 0.001) {
			game.editor.selection.select(o);
			game.editor.ui.propsEditor.selectField('scale.x', true);
		} else if (o.scale.y < 0.001) {
			game.editor.selection.select(o);
			game.editor.ui.propsEditor.selectField('scale.y', true);
		} else if (o.__hideInEditor) {
			game.editor.selection.select(o);
			game.editor.ui.propsEditor.selectField('__hideInEditor', true);
		} else if ((o instanceof Sprite) && (o.image === 'EMPTY') && (o === game.editor.selection[0])) {
			game.editor.ui.propsEditor.selectField('image', true);
		} else {
			selectInvisibleParent(o);
		}
	}
};

const TREE_NODE_CONTEXT_MENU: ContextMenuItem[] = [
	{
		name: R.fragment(R.icon('copy'), 'Copy'),
		onClick: editorUtils.onCopyClick,
		disabled: () => {
			return game.editor.selection.length === 0;
		},
		hotkey: { key: 'c', ctrlKey: true }
	},
	{
		name: R.fragment(R.icon('copy'), 'Copy name'),
		onClick: () => {
			if (game.editor.selection[0]?.name) {
				game.editor.copyToClipboard(game.editor.selection[0].name as string);
			}
		},
		disabled: () => !game.editor.selection[0]?.name
	},
	{
		name: R.fragment(R.icon('cut'), 'Cut'),
		onClick: editorUtils.onCutClick,
		disabled: () => !editorUtils.canDelete(),
		hotkey: { key: 'x', ctrlKey: true }
	},
	{
		name: R.fragment(R.icon('paste'), 'Paste'),
		onClick: editorUtils.onPasteClick,
		disabled: () => !editorUtils.canPaste(),
		hotkey: { key: 'v', ctrlKey: true }
	},
	{
		name: R.fragment(R.icon('paste-wrap'), 'Paste wrap'),
		tip: 'Wrap selected content with clipboard container.',
		onClick: editorUtils.onPasteWrapClick,
		hotkey: { key: 'v', ctrlKey: true, altKey: true }
	},
	null,
	{
		name: R.fragment(R.icon('clone'), 'Clone'),
		onClick: editorUtils.clone,
		hotkey: { key: 'd', ctrlKey: true },
		disabled: () => !game.editor.selection.length || game.editor.selection[0] === game.currentContainer
	},
	{
		name: R.fragment(R.icon('export-selected'), 'Export as PNG...'),
		onClick: editorUtils.onExportAsPngClick
	},
	{
		name: 'Arrange ❯',
		onClick: (ev?: PointerEvent) => {
			showContextMenu(TREE_NODE_CONTEXT_ARRANGE_MENU, ev!);
		}
	},
	null,
	{
		name: 'Change type...',
		onClick: () => { game.editor.ui.propsEditor.onChangeClassClick(); },
	},
	{
		name: 'Go to Source code >>>',
		tip: 'Double click on tree node to go to it`s source code.',
		onClick: () => {
			const Class = game.editor.selection[0].constructor as SourceMappedConstructor;
			game.editor.editClassSource(Class, Class.__className);
		}
	},
	{
		name: 'Why invisible? >>>',
		onClick: () => selectInvisibleParent(game.editor.selection[0]),
		disabled: () => {
			return !editorUtils.findInvisibleParent(game.editor.selection[0]);
		}
	},
	{
		name: R.fragment(R.icon('asset-prefab'), 'Save as prefab...'),
		onClick: () => {
			editorUtils.savePrefab(game.editor.selection[0]);
		},
		disabled: () => game.editor.selection.length !== 1 || game.editor.selection[0] instanceof Scene
	},
	null,
	{
		name: R.fragment(R.icon('isolate-selected'), 'Isolate'),
		tip: 'Temporary hides other content to focus on current selection.',
		onClick: toggleIsolation,
		disabled: () => EDITOR_FLAGS.isolationEnabled || game.editor.selection.indexOf(game.currentContainer) >= 0,
		hotkey: { key: 'i', ctrlKey: true }
	},
	{
		name: R.fragment(R.icon('exit-isolation'), 'Exit isolation'),
		tip: 'Unhide temporary hidden objects.',
		onClick: toggleIsolation,
		disabled: () => !EDITOR_FLAGS.isolationEnabled,
		hotkey: { key: 'i', ctrlKey: true }
	},
	{
		name: R.fragment(R.icon('delete'), 'Delete'),
		onClick: editorUtils.deleteSelected,
		disabled: () => !editorUtils.canDelete(),
		hotkey: { key: 'Delete' }
	},
	{
		name: R.fragment(R.icon('unwrap'), 'Unwrap'),
		tip: 'Remove selected contaner but keeps children.',
		onClick: editorUtils.onUnwrapClick,
		disabled: () => !editorUtils.isCanBeUnwrapped(),
		hotkey: { key: 'Delete', ctrlKey: true }
	}
];

const TREE_NODE_CONTEXT_ARRANGE_MENU: ContextMenuItem[] = [
	{
		name: R.fragment(R.icon('bring-up'), 'Bring top'),
		onClick: editorUtils.onBringUpClick,
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowUp', altKey: true, ctrlKey: true }
	},
	{
		name: R.fragment(R.icon('move-up'), 'Move top'),
		onClick: editorUtils.onMoveUpClick,
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowUp', altKey: true }
	},
	{
		name: R.fragment(R.icon('move-down'), 'Move bottom'),
		onClick: editorUtils.onMoveDownClick,
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowDown', altKey: true }
	},
	{
		name: R.fragment(R.icon('bring-down'), 'Bring bottom'),
		onClick: editorUtils.onBringDownClick,
		disabled: () => game.editor.selection.length < 1,
		stayAfterClick: true,
		hotkey: { key: 'ArrowDown', altKey: true, ctrlKey: true }
	},
	null,
	{
		name: '← shift left',
		onClick: () => {
			game.editor.editProperty('x', -1, true);
		},
		disabled: () => !game.editor.ui.propsEditor.editableProps.x,
		stayAfterClick: true,
		hotkey: { key: 'ArrowLeft' }
	},
	{
		name: '→ shift right',
		onClick: () => {
			game.editor.editProperty('x', 1, true);
		},
		disabled: () => !game.editor.ui.propsEditor.editableProps.x,
		stayAfterClick: true,
		hotkey: { key: 'ArrowRight' }
	},
	{
		name: '↑ shift up',
		onClick: () => {
			game.editor.editProperty('y', -1, true);
		},
		disabled: () => !game.editor.ui.propsEditor.editableProps.y,
		stayAfterClick: true,
		hotkey: { key: 'ArrowUp' }
	},
	{
		name: '↓ shift down',
		onClick: () => {
			game.editor.editProperty('y', 1, true);
		},
		disabled: () => !game.editor.ui.propsEditor.editableProps.y,
		stayAfterClick: true,
		hotkey: { key: 'ArrowDown' }
	},
	{
		name: '⬅ shift left x10',
		onClick: () => {
			game.editor.editProperty('x', -10, true);
		},
		disabled: () => !game.editor.ui.propsEditor.editableProps.x,
		stayAfterClick: true,
		hotkey: { key: 'ArrowLeft', ctrlKey: true }
	},
	{
		name: '⮕ shift right x10',
		onClick: () => {
			game.editor.editProperty('x', 10, true);
		},
		disabled: () => !game.editor.ui.propsEditor.editableProps.x,
		stayAfterClick: true,
		hotkey: { key: 'ArrowRight', ctrlKey: true }
	},
	{
		name: '⬆ shift up x10',
		onClick: () => {
			game.editor.editProperty('y', -10, true);
		},
		disabled: () => !game.editor.ui.propsEditor.editableProps.y,
		stayAfterClick: true,
		hotkey: { key: 'ArrowUp', ctrlKey: true }
	},
	{
		name: '⬇ shift down x10',
		onClick: () => {
			game.editor.editProperty('y', 10, true);
		},
		disabled: () => !game.editor.ui.propsEditor.editableProps.y,
		stayAfterClick: true,
		hotkey: { key: 'ArrowDown', ctrlKey: true }
	}
];

export { TREE_NODE_CONTEXT_ARRANGE_MENU, TREE_NODE_CONTEXT_MENU };

