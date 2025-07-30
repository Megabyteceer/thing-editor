import type { ClassAttributes, ComponentChild } from 'preact';
import { Component } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game from 'thing-editor/src/engine/game';
import copyTextByClick from '../../utils/copy-text-by-click';

let modalRejectProps = { className: 'modal-reject-text' };

interface PromptProps extends ClassAttributes<Prompt> {
	defaultText?: string;
	filter?: (val: string) => string;
	accept?: (val: string) => string | undefined;
	multiline?: boolean;
	/** accept button tool tip */
	title?: string;
	variants?: string[];
}

interface PromptState {
	value: string;
	rejectReason?: ComponentChild;
	accepted?: boolean;
}

const variantItemNameProps = {
	className: 'selectable-text class-name',
	title: 'Ctrl+click to copy name',
	onMouseDown: copyTextByClick
};

export default class Prompt extends Component<PromptProps, PromptState> {

	constructor(props: PromptProps) {
		super(props);
		this.state = { value: props.defaultText || '' };
		this.onChange = this.onChange.bind(this);
		this.onAcceptClick = this.onAcceptClick.bind(this);
	}

	componentDidMount() {
		window.setTimeout(() => {
			let input = document.querySelector('.modal-content input') as HTMLInputElement;
			if (input) {
				try {
					input.focus();
					input.setSelectionRange(0, input.value.length);
				} catch (_er) { }
			}
		}, 1);
		this.checkAcceptance(this.state.value);
	}

	onChange(ev: InputEvent) {
		let val = this.props.filter ? this.props.filter((ev.target as HTMLInputElement).value) : (ev.target as HTMLInputElement).value;
		this.checkAcceptance(val);
	}

	checkAcceptance(val: string) {
		let reject = this.props.accept ? this.props.accept(val) : undefined;
		this.setState({
			value: val,
			rejectReason: reject,
			accepted: (val && !reject) as boolean
		});
	}

	onAcceptClick() {
		if (this.state.accepted) {
			game.editor.ui.modal.hideModal(this.state.value);
		}
	}

	render() {
		let input = (this.props.multiline ? R.textarea : R.input);

		let variantsView;
		let variantsStrings = (this.props.variants) ? this.props.variants.filter(v => !this.state.value || v.includes(this.state.value)) : undefined;
		if (variantsStrings) {
			if (variantsStrings.length > 20) {
				variantsStrings.length = 20;
			}

			const selection = R.span({className: 'selected-text'}, this.state.value);

			variantsView = variantsStrings.map((txt) => {
				const isBlocked = this.props.accept && this.props.accept(txt);

				const a = ('_' + txt).split(this.state.value);
				const labelArray = [] as any[];
				for (const txt of a) {
					if (labelArray.length) {
						labelArray.push(selection);
						labelArray.push(txt);
					} else {
						labelArray.push(txt.substring(1));
					}
				}
				const label = R.span(variantItemNameProps, labelArray);

				return R.btn(label, (ev) => {
					if (ev.ctrlKey) {
						game.editor.copyToClipboard(txt);
					} else {
						this.setState({value: txt, accepted: true});
						setTimeout(() => {
							this.onAcceptClick();
						}, 10);
					}
				}, undefined, 'prompt-variant-item', undefined, !!isBlocked);
			});
		}

		return R.fragment(
			R.div(modalRejectProps, this.state.rejectReason),
			R.div({ className: 'prompt-dialogue' },
				variantsView,
				input({ value: this.state.value, onInput: this.onChange, onKeyDown: (ev: KeyboardEvent) => {
					if (ev.key === 'Enter') {
						if (!this.props.multiline) {
							this.onAcceptClick();
							sp(ev);
						}
					}
				}
				 })
			),
			R.btn('Ok', this.onAcceptClick, this.props.title, 'main-btn', this.props.multiline ? undefined : { key: 'Enter' })
		);
	}
}
