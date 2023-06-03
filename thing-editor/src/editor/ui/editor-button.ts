import { ClassAttributes, Component, ComponentChild } from "preact";
import { Hotkey, KeyedObject } from "thing-editor/src/editor/env";
import R from "thing-editor/src/editor/preact-fabrics";
import isEventFocusOnInputElement from "thing-editor/src/editor/utils/is-event-focus-on-input-element";
import sp from "thing-editor/src/editor/utils/stop-propagation";
import game from "thing-editor/src/engine/game";

const allHotkeyButtons: EditorButton[] = [];
window.addEventListener("keydown", (ev) => {
	for(let b of allHotkeyButtons) {
		if(b.onKeyDown(ev)) { //call only first button with this hotkey
			return;
		}
	}
});

const hotkeysBlockedWhenInputFocused: KeyedObject = {
	'Backspace': null,
	'Enter': null,
	'ArrowLeft': null,
	'ArrowRight': null,
	'ArrowUp': null,
	'ArrowDown': null,
	'Delete': null,
	',': null,
	'.': null,
	'z': true,
	'x': true,
	'c': true,
	'v': true,
};

function isHotkeyBlockedOnInput(btn: EditorButton) {
	const isCtrlRequired = hotkeysBlockedWhenInputFocused[btn.props.hotkey!.key];
	if(isCtrlRequired === undefined || isCtrlRequired === null) {
		return false;
	}
	return isCtrlRequired === btn.props.hotkey!.ctrlKey;
}

interface EditorButtonProps extends ClassAttributes<EditorButton> {
	label: ComponentChild
	onClick: (ev: PointerEvent) => void
	className?: string
	title?: string
	hotkey?: Hotkey
	disabled?: boolean
}

interface EditorButtonStats {
	title?: string;
}

class EditorButton extends Component<EditorButtonProps, EditorButtonStats> {

	onKeyDown(e: KeyboardEvent) {
		const hotkey = this.props.hotkey;
		if(!hotkey) {
			return;
		}

		if(
			this.props.disabled ||
			((hotkey.ctrlKey && hotkey.key === 'c') && (window.getSelection() || '').toString()) ||
			(isEventFocusOnInputElement(e) && (isHotkeyBlockedOnInput(this))) ||
			((hotkey.key !== 'F1') && game.editor.ui.modal.isUIBlockedByModal(this.base as HTMLElement)) // F1 - help hotkey works always
		) {
			return;
		}

		if((e.key === hotkey.key) && (e.ctrlKey === (hotkey.ctrlKey === true))) {
			this.onMouseDown(e as unknown as PointerEvent);
			sp(e);
			return true;
		}
	}

	constructor(props: EditorButtonProps) {
		super();
		var title = props.title;
		let hotkey = props.hotkey;
		if(hotkey) {
			let help = [];
			if(hotkey.ctrlKey) {
				help.push('Ctrl');
			}
			if(hotkey.altKey) {
				help.push('Alt');
			}
			if(hotkey.shiftKey) {
				help.push('Shift');
			}
			help.push('"' + hotkey.key.toUpperCase() + '"');
			title = (title || '') + ' (' + help.join(' + ') + ')';
		}
		this.state = { title };
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
	}

	componentWillReceiveProps(props: EditorButtonProps) {
		if(this.props.hotkey !== props.hotkey) {
			if(!props.hotkey && this.props.hotkey) {
				this.unregisterHotkey();
			} else if(props.hotkey && !this.props.hotkey) {
				this.registerHotkey();
			}
		}
	}

	componentDidMount() {
		if(this.props.hotkey) {
			this.registerHotkey();
		}
	}

	registerHotkey() {
		allHotkeyButtons.unshift(this);
	}

	unregisterHotkey() {
		if(this.props.hotkey) {
			let i = allHotkeyButtons.indexOf(this);
			if(i >= 0) {
				allHotkeyButtons.splice(i, 1);
			}
		}
	}

	componentWillUnmount() {
		this.unregisterHotkey();
	}

	onMouseDown(ev: PointerEvent) {
		if(ev.button === 2) {
			//             ↓
			this.props.onClick; // hover "onClick" and Ctrl+Click [FunctionLocation] to go to handler declaration
			debugger; //   ↑
		} else {
			if(this.props.disabled) return;
			//TODO:
			//DataPathFixer.onNameBlur();
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