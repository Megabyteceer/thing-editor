import { Color } from 'pixi.js';
import type { ClassAttributes, ComponentChild } from 'preact';
import { Component, h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import game from 'thing-editor/src/engine/game';
import NumberEditor from './number-editor';

interface ColorSliderProps extends ClassAttributes<ColorSlider> {
	color: number;
	x: number;
	y: number;
	hide: () => void;
	onChange: (val: number) => void;
}

interface ColorSliderState {
	color: Color;
}

let lastHue = 0;
let lastSaturation = 0;
let hexString = 'ffffff';

const colorFromHSL = (hue: number, saturation: number, light: number) => {
	return new Color('hsl(' + (hue * 360) + ' ' + (saturation * 100) + '% ' + (light * 100) + '%)');
};

let startX = 0;
let startY = 0;

export default class ColorSlider extends Component<ColorSliderProps, ColorSliderState> {

	constructor(props: ColorSliderProps) {
		super(props);
		const color = new Color(props.color);
		this.state = { color };
		this.applyHexEditor(color);
		this.onSLPick = this.onSLPick.bind(this);
		this.onHuePick = this.onHuePick.bind(this);
	}

	applyHexEditor(color:Color) {
		hexString = color.toHex().replace('#', '').toLowerCase();
	}

	onSLPick(ev:PointerEvent) {
		if (!ev.buttons) {
			window.removeEventListener('pointermove', this.onSLPick);
			return;
		}

		const saturation = Math.max(0, Math.min(1, (ev.clientX - startX) / 255));
		const light = 1 - Math.max(0, Math.min(1, ((ev.clientY - startY) / 255)));
		this.setSL(saturation, light / (1 + saturation));
	}

	onHuePick(ev:PointerEvent) {
		 if (!ev.buttons) {
			window.removeEventListener('pointermove', this.onHuePick);
			return;
		}
		this.setHue((255.9 - (Math.max(0, Math.min(255.9, ev.clientY - startY)))) / 256);
	}

	setSL(saturation:number, light:number) {
		const hsl = this.toHsl();
		hsl[1] = saturation;
		hsl[2] = light;
		lastSaturation = saturation;
		this.fromHSL(...hsl);
	}

	setHue(hue:number) {
		const hsl = this.toHsl();
		hsl[0] = hue;
		lastHue = hue;
		this.fromHSL(...hsl);
	}

	toHsl(): [h: number, s: number, l: number] {
		const r = this.state.color.red;
		const g = this.state.color.green;
		const b = this.state.color.blue;

		let max = Math.max(r, g, b);
		let min = Math.min(r, g, b);
		let d = max - min;
		let h = lastHue;
		if (d === 0) h = lastHue;
		else if (max === r) h = (g - b) / d % 6;
		else if (max === g) h = (b - r) / d + 2;
		else if (max === b) h = (r - g) / d + 4;
		let l = (min + max) / 2;
		let s = d === 0 ? lastSaturation : d / (1 - Math.abs(2 * l - 1));

		if (h < 0) {
			h += 6;
		}

		s = Math.min(s, 1.5 - l);


		lastHue = h;
		lastSaturation = s;

		return [h / 6, s, l];
	}

	fromHSL(h: number, s: number, l: number) {
		const color = colorFromHSL(h, s, l);
		this.setState({color});
		this.props.onChange(color.toNumber());
		this.applyHexEditor(color);
	}

	setColor(val: number, dontSetHexValue = false) {
		const color = new Color(val);
		this.setState({color});
		if (!dontSetHexValue) {
			this.applyHexEditor(color);
		}
		this.props.onChange(val);
	}

	accept() {
		this.props.hide();
		game.editor.history.scheduleHistorySave();
	}

	cancel() {
		if (this.props.color !== this.state.color.toNumber()) {
			this.props.onChange(this.props.color);
		}
		this.props.hide();
	}

	componentDidMount(): void {
		(window.document.querySelector('.color-slider #hex-color') as HTMLInputElement).select();
	}

	render(): ComponentChild {
		const colorNumber = this.state.color.toNumber();
		const hsl = this.toHsl();
		const hue = hsl[0];
		const saturation = hsl[1];
		const light = hsl[2];
		hsl[1] = 1;
		hsl[2] = 0.5;
		const color = colorFromHSL(...hsl);
		return R.div(null,
			R.div({className: 'modal-blackout', style: {opacity: 0}, onMouseDown: (ev:PointerEvent) => {
				if ((ev.target as HTMLDivElement).classList.contains('modal-blackout')) {
					this.accept();
				}
			}
			}),
			R.div({ className: 'color-slider', style: {
				left: Math.min(Math.max(0, this.props.x), window.document.body.clientWidth - 314),
				top: Math.min(Math.max(0, this.props.y), window.document.body.clientHeight - 500)
			} },
			R.div({
				style: {
					border: '1px solid #888888',
					marginBottom: 3,
					width: 80,
					height: 30
				}},
			R.div({
				style: {
					display: 'inline-block',
					width: 40,
					height: 30,
					background: this.state.color.toHex()
				}
			}),
			R.div({
				style: {
					display: 'inline-block',
					width: 40,
					height: 30,
					background: new Color(this.props.color).toHex()
				}
			})
			),
			R.div({
				className: 'color-slider-sl',
				onMouseDown: (ev:PointerEvent) => {
					if (ev.buttons === 1) {
						startX = ev.clientX - ev.layerX;
						startY = ev.clientY - ev.layerY;
						window.addEventListener('pointermove', this.onSLPick);
						this.onSLPick(ev);
					}
				},
				style: {
					background: 'linear-gradient(transparent 0%, #000000 100%), linear-gradient(to left, transparent 0%, #ffffff 100%),' + color.toRgbaString()
				}
			},
			R.div({className: 'color-slider-sl-point', style: {top: Math.min(255, Math.max(0, 255 - (light * (1 + saturation)) * 255)) - 3, left: Math.min(255, Math.max(0, saturation * 255)) - 3}})
			),
			R.div({
				className: 'color-slider-hue',
				onMouseDown: (ev:PointerEvent) => {
					if (ev.buttons === 1) {
						startX = ev.clientX - ev.layerX;
						startY = ev.clientY - ev.layerY;
						window.addEventListener('pointermove', this.onHuePick);
						this.onHuePick(ev);
					}
				}
			}, R.div({className: 'color-slider-hue-point', style: {top: 255 - (hue) * 255 - 3}})),
			R.div(null,
				'#', R.input({
					id: 'hex-color',
					onInput: (ev:InputEvent) => {
						hexString = (ev.target as HTMLInputElement).value.replace('#', '');
						let num = parseInt(hexString.substring(0, 6), 16);
						if (!isNaN(num)) {
							this.setColor(num, true);
						}
					},
					value: hexString
				}),
				R.span({
					className: 'clickable color-input-eyedropper',
					onMouseUp: (ev:MouseEvent) => {
						if (ev.which === 1) {
							const eyeDropper = new (window as any).EyeDropper();
							eyeDropper.open().then((color: any) => {
								const newVal = parseInt(color.sRGBHex.replace('#', ''), 16);
								if (newVal !== parseInt(hexString, 16)) {
									this.setColor(newVal);
								}
							}).catch((_er:any) => undefined);;
						}
					},
				}, R.icon('eyedropper')),
				R.br(),
				R.br(),
				'R: ', h(NumberEditor, {
					value: Math.floor(this.state.color.red * 255),
					min: 0,
					max: 255,
					onChange: (val) => {
						this.setColor((colorNumber & 0xFFFF) | (val << 16));
					}
				}),
				'G: ', h(NumberEditor, {
					value: Math.floor(this.state.color.green * 255),
					min: 0,
					max: 255,
					onChange: (val) => {
						this.setColor((colorNumber & 0xFF00FF) | (val << 8));
					}
				}),
				'B: ', h(NumberEditor, {
					value: Math.floor(this.state.color.blue * 255),
					min: 0,
					max: 255,
					onChange: (val) => {
						this.setColor((colorNumber & 0xFFFF00) | val);
					}
				})
			),
			R.br(),
			R.btn('Cancel', () => this.cancel(), undefined, undefined, {key: 'Escape'}),
			R.btn('Ok', () => this.accept(), undefined, 'main-btn', {key: 'Enter'}),

			)
		);
	}
}
