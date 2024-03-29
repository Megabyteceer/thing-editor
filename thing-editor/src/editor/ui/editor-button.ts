import type { ClassAttributes, ComponentChild } from 'preact';
import { Component } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { ContextMenuItem } from 'thing-editor/src/editor/ui/context-menu';
import { hideContextMenu, refreshContextMenu } from 'thing-editor/src/editor/ui/context-menu';
import Window from 'thing-editor/src/editor/ui/editor-window';
import { MAIN_MENU } from 'thing-editor/src/editor/ui/main-menu';
import DataPathFixer from 'thing-editor/src/editor/utils/data-path-fixer';
import type { Hotkey } from 'thing-editor/src/editor/utils/hotkey';
import isHotkeyHit, { hotkeyToString } from 'thing-editor/src/editor/utils/hotkey';
import isEventFocusOnInputElement from 'thing-editor/src/editor/utils/is-event-focus-on-input-element';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game from 'thing-editor/src/engine/game';

const allHotkeyButtons: EditorButton[] = [];


const findItemForHotkey = (ev: Hotkey, handlers?: ContextMenuItem[][], windowBody?: HTMLDivElement): ContextMenuItem | undefined => {
	if (handlers) {
		for (let menuGroup of handlers) {
			for (let menuItem of menuGroup) {
				if (menuItem) {
					if (typeof menuItem.disabled !== 'function' || !menuItem.disabled()) {
						if (isHotkeyHit(ev, windowBody as HTMLElement, menuItem.hotkey)) {
							return menuItem;
						}
					}
				}
			}
		}
	}
};

const findMenuItemForHotkey = (hotkey: Hotkey): ContextMenuItem | undefined => {
	for (let w of Window.allOrdered) {
		let ret = findItemForHotkey(hotkey, w.props.hotkeysHandlers, w.base as HTMLDivElement);
		if (ret) {
			return ret;
		}
	}

	for (let item of MAIN_MENU) {
		let ret = findItemForHotkey(hotkey, [item.items]);
		if (ret) {
			return ret;
		}
	}
};

window.addEventListener('keydown', (ev) => {
	if (ev.key !== 'Control' && ev.key !== 'Alt' && ev.key !== 'Shift') {
		for (let b of allHotkeyButtons) {
			if (b.onKeyDown(ev)) { //call only first button with this hotkey
				hideContextMenu();
				return;
			}
		}

		const item = findMenuItemForHotkey(ev as Hotkey);
		if (item) {
			isEventFocusOnInputElement(ev).then((isHotkeyCapturedByInputElement) => {
				if (!isHotkeyCapturedByInputElement) {
					item.onClick();
					refreshContextMenu();
					game.editor.ui.modal.notify((typeof item.name === 'function') ? item.name() : item.name, 'hotkey');
					sp(ev);
					return;
				}
			});
		}
	}
});

interface EditorButtonProps extends ClassAttributes<EditorButton> {
	label: ComponentChild;
	onClick: (ev: PointerEvent) => void;
	className?: string;
	title?: string;
	hotkey?: Hotkey;
	disabled?: boolean;
}

interface EditorButtonStats {
	title?: string;
}

class EditorButton extends Component<EditorButtonProps, EditorButtonStats> {

	onKeyDown(ev: KeyboardEvent) {
		if (!this.props.disabled && isHotkeyHit(ev as any as Hotkey, this.base as HTMLElement, this.props.hotkey)) {
			isEventFocusOnInputElement(ev).then((isHotkeyCapturedByInputElement) => {
				if (!isHotkeyCapturedByInputElement) {
					this.onMouseDown(ev as unknown as PointerEvent);
					sp(ev);
				}
			});
			return true;
		}
	}

	constructor(props: EditorButtonProps) {
		super(props);
		this.onMouseDown = this.onMouseDown.bind(this);
	}

	componentWillReceiveProps(props: EditorButtonProps) {
		if (this.props.hotkey !== props.hotkey) {
			this.unregisterHotkey();
			this.registerHotkey(props);
		}
	}

	componentDidMount() {
		this.registerHotkey(this.props);
	}

	registerHotkey(props: EditorButtonProps) {
		if (this.props.hotkey) {
			allHotkeyButtons.unshift(this);
		}

		let title = props.title;
		let hotkey = props.hotkey;
		if (hotkey) {
			title = props.title ? props.title + hotkeyToString(hotkey) : hotkeyToString(hotkey);
		}
		this.setState({ title});
	}

	unregisterHotkey() {
		if (this.props.hotkey) {
			let i = allHotkeyButtons.indexOf(this);
			if (i >= 0) {
				allHotkeyButtons.splice(i, 1);
			}
		}
	}

	componentWillUnmount() {
		this.unregisterHotkey();
	}

	onMouseDown(ev: PointerEvent) {
		if (ev.button === 2) {
			//             ↓
			this.props.onClick; // hover "onClick" and Ctrl+Click [FunctionLocation] to go to handler declaration
			debugger; //   ↑
		} else {
			if (this.props.disabled) return;
			DataPathFixer.onNameBlur();
			this.props.onClick(ev);
			(ev.target as HTMLElement).blur();
		}
		sp(ev);
	}

	render() {
		return R.button({
			disabled: this.props.disabled,
			className: (this.props.disabled ? 'unclickable ' : 'clickable ') + this.props.className,
			onMouseDown: this.onMouseDown,
			title: this.state.title
		}, this.props.label);
	}
}

export default EditorButton;
export { findMenuItemForHotkey };

