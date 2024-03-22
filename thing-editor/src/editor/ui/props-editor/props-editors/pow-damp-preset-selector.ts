import type { Container } from 'pixi.js';
import type { ClassAttributes } from 'preact';
import { Component, h } from 'preact';
import type { SelectEditorItem } from 'thing-editor/src/editor/ui/props-editor/props-editors/select-editor';
import SelectEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/select-editor';
import game from 'thing-editor/src/engine/game';

interface PowDampPreset {
	p: number;
	d: number;
}


interface PowDampPresetSelectorProps extends ClassAttributes<PowDampPresetSelector> {
	onPresetSelected: (pow: number, damp: number) => void;
	pow: number;
	damp: number;
}


export default class PowDampPresetSelector extends Component<PowDampPresetSelectorProps> {
	constructor(props: PowDampPresetSelectorProps) {
		super(props);

		this.onSelect = this.onSelect.bind(this);
	}

	onSelect(selected: PowDampPreset) {
		if (selected.p) {
			this.props.onPresetSelected(selected.p, selected.d);
		}
	}

	getPow() {
		return this.props.pow;
	}

	getDamp() {
		return this.props.damp;
	}

	render() {
		let pow = this.getPow();
		let damp = this.getDamp();
		let presetSelectedValue = presets.find((p) => {
			return pow === p.value.p && damp === p.value.d;
		}) || presets[0];

		return h(SelectEditor, { value: presetSelectedValue.value, noCopyValue: true, onChange: this.onSelect, select: presets });
	}
}

const presets: SelectEditorItem<PowDampPreset>[] = [
	{ name: 'None', value: {} as PowDampPreset },
	{
		name: 'Alive     1s', value: {
			d: 0.85,
			p: 0.02
		}
	},
	{
		name: 'Alive   0.5s', value: {
			d: 0.7,
			p: 0.06
		}
	},
	{
		name: 'Alive  0.25s', value: {
			d: 0.55,
			p: 0.16
		}
	},


	{
		name: 'Smooth    1s', value: {
			p: 0.012,
			d: 0.8
		}
	},
	{
		name: 'Smooth  0.5s', value: {
			p: 0.032,
			d: 0.7
		}
	},
	{
		name: 'Smooth 0.25s', value: {
			p: 0.1,
			d: 0.52
		}
	},
	{
		name: 'Bouncy    3s', value: {
			d: 0.95,
			p: 0.03
		}
	},
	{
		name: 'Bouncy    1s', value: {
			d: 0.85,
			p: 0.05
		}
	},
	{
		name: 'Bouncy   0.5s', value: {
			d: 0.73,
			p: 0.3
		}
	},

	{
		name: 'Balloon', value: {
			d: 0.9,
			p: 0.001
		}
	},
	{
		name: 'Inert', value: {
			d: 0.98,
			p: 0.002
		}
	},
	{
		name: 'Discrete', value: {
			d: 0,
			p: 1
		}
	}
];

interface PowDampOwner extends Container {
	pow: number;
	damp: number;
}

export class PowDampPresetEditor extends PowDampPresetSelector {

	getPow() {
		return (game.editor.selection[0] as PowDampOwner).pow;
	}

	getDamp() {
		return (game.editor.selection[0] as PowDampOwner).damp;
	}

	onSelect(selected: PowDampPreset) {
		if (selected.p) {
			game.editor.editProperty('pow', selected.p);
			game.editor.editProperty('damp', selected.d);
		}
	}
}
