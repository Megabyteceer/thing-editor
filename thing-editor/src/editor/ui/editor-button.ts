import { Component, ComponentChild } from "preact";
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

const hotkeysBlockedWhenInputFocused = {
	8: true,
	13: true,
	37: true,
	38: true,
	39: true,
	40: true,
	46: true,
	90: true,
	188: true,
	190: true,
	1067: true,
	1088: true,
	1086: true
};
function isHotkeyBlockedOnInput(btn: EditorButton) {
	return btn.props.hotkey && hotkeysBlockedWhenInputFocused.hasOwnProperty(btn.props.hotkey);
}

interface EditorButtonProps {
	label: ComponentChild
	onClick: (ev: PointerEvent) => void
	className?: string
	title?: string
	hotkey?: number
	disabled?: boolean
}

class EditorButton extends Component<EditorButtonProps> {

	onKeyDown(e: KeyboardEvent) {
		if(!this.props.hotkey) {
			return;
		}
		let needCtrl = this.props.hotkey > 1000;

		if(
			this.props.disabled ||
			((this.props.hotkey === 1067) && (window.getSelection() || '').toString()) ||
			(isEventFocusOnInputElement(e) && (isHotkeyBlockedOnInput(this))) ||
			((this.props.hotkey !== 112) && game.editor.ui.modal.isUIBlockedByModal(this.base as HTMLElement)) // F1 - help hotkey works always
		) {
			return;
		}

		if((e.keyCode === (this.props.hotkey % 1000)) && (needCtrl === e.ctrlKey)) {
			this.onMouseDown(e as unknown as PointerEvent);
			sp(e);
			return true;
		}
	}

	constructor() {
		super();
		this.state = {};
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
			game.editor.ui.modal.showModal(this.props.onClick.name, "Button's Handler:");
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
			//TODO: un clickable -> un-clickable renamed
			className: (this.props.disabled ? 'un-clickable ' : 'clickable ') + this.props.className,
			onMouseDown: this.onMouseDown,
			title: this.props.title,
			onClick: this.props.onClick
		}, this.props.label);
	}
}

export default EditorButton;