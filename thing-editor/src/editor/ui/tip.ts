import type { ClassAttributes } from 'preact';
import { Component } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import game from 'thing-editor/src/engine/game';

const tipProps = { className: 'tip-container' };

function renderTextBlock(t: string, i: number) {
	return R.div({ className: 'tip-paragraph', key: i, dangerouslySetInnerHTML: { __html: t } });
}

interface TipProps extends ClassAttributes<Tip> {
	id: string;
	text: string;
	header: string;
}

export default class Tip extends Component<TipProps> {

	constructor(props: TipProps) {
		super(props);
		this.onDiscardClick = this.onDiscardClick.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
	}

	onDiscardClick() {
		game.editor.settings.setItem('tip-discard-' + this.props.id, true);
		game.editor.ui.modal.hideModal();
		game.editor.ui.refresh();
	}

	onMouseDown() {
		game.editor.ui.modal.showModal(R.span(tipProps, R.btn('× discard', this.onDiscardClick, 'Discard this tooltip permanently', 'tip-discard-btn'),
			this.props.text.split('\n').map(renderTextBlock)
		), this.props.header);
	}

	render() {
		if (game.editor.settings.getItem('tip-discard-' + this.props.id)) {
			return R.span();
		}
		return R.span({ className: 'tip-icon', onMouseDown: this.onMouseDown }, '?');
	}
}
