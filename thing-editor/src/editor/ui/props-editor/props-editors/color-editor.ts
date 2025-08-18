import { Component, h, render } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';
import game from 'thing-editor/src/engine/game';

let pickerContainer: undefined | HTMLDivElement;

let sliderShown = false;
const hide = () => {
	if (sliderShown) {
		render(R.fragment(), pickerContainer!);
		sliderShown = false;
	}
};

class ColorEditor extends Component<EditablePropertyEditorProps> {

	componentWillUnmount(): void {
		if (sliderShown) {
			hide();
		}
	}

	render () {
		let val = this.props.value || 0;

		return R.div({
			className: 'color-input',
		},
		R.div({
			className: 'clickable color-input-eyedropper',
			onMouseUp: (ev:MouseEvent) => {
				if (ev.which === 1) {

					const eyeDropper = new (window as any).EyeDropper();
					eyeDropper.open().then((color: any) => {
						const newVal = parseInt(color.sRGBHex.replace('#', ''), 16);
						if (newVal !== val) {
							this.props.onChange(newVal);
							game.editor.history.scheduleHistorySave();
						}
					}).catch((_er:any) => undefined);
				}
			},
		}, R.icon('eyedropper')
		),
		R.span({
			disabled: true,
			className: 'clickable color-input-sample',
			onMouseDown: (ev: PointerEvent) => {
				import('./color-slider').then((ColorSlider) => {

					if (!pickerContainer) {
						pickerContainer = window.document.createElement('div');
						pickerContainer.id = 'color-picker-container';
						window.document.body.appendChild(pickerContainer);
					}
					sliderShown = true;
					render(h(ColorSlider.default, {
						color: val,
						x: ev.clientX + 20,
						y: ev.clientY - 200,
						hide,
						onChange: (newVal:number) => {
							this.props.onChange(newVal);
						}
					}
					), pickerContainer);
				});
			},
			style: { backgroundColor: '#' + val.toString(16).padStart(6, '0')}
		})
		);
	}
}

export default ColorEditor;
