import { Container } from 'pixi.js';
import { ComponentChild, ComponentChildren, Fragment, h, render } from 'preact';
import { KeyedMap, SourceMappedConstructor } from 'thing-editor/src/editor/env';
import EditorButton from 'thing-editor/src/editor/ui/editor-button';
import Tip from 'thing-editor/src/editor/ui/tip';
import { Hotkey } from 'thing-editor/src/editor/utils/hotkey';
import assert from 'thing-editor/src/engine/debug/assert';

interface ComponentProps {
	className?: string;
	onClick?: Function;
	[key: string]: any;
}
const _iconsCache: KeyedMap<preact.Component> = {};

class R {
	static div: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static form: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static span: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static p: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static img: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static button: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static label: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static b: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static a: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static br: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static hr: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static svg: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static td: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static tr: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static th: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static tbody: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static thead: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static table: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static polyline: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static textarea: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static iframe: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static h2: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static h3: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static h4: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static h5: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static script: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static meta: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static space: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
	static smallSpace: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;


	static btn(label: ComponentChild, onClick: (ev: PointerEvent) => void, title?: string, className?: string, hotkey?: Hotkey, disabled = false) {
		assert(typeof onClick === 'function', "Function as onClick handler expected.");
		className = className || '';
		return h(EditorButton, { label, onClick, className, title, hotkey, disabled });
	};
	static icon(name: string) {
		if(!_iconsCache.hasOwnProperty(name)) {
			assert(name, "Icon's name expected.");
			let src;
			if(name.startsWith('/')) {
				src = name;
			} else {
				src = '/thing-editor/img/' + name;
			}
			src += '.png';
			_iconsCache[name] = R.img({ src });
		}
		return _iconsCache[name];
	};
	static multilineText = (txt: ComponentChild) => {
		if(typeof txt !== 'string') {
			return txt;
		}
		return R.div(null, txt.split('\n').map((r, i) => {
			return R.div({ key: i }, r);
		}));
	};

	static fragment(...children: ComponentChildren[]) {
		return h(Fragment, null, ...children);
	}

	static libInfo(_libName: string, _fileName: string) {
		return R.span(null, _libName);
	}

	static textreIcon(fileName: string) {
		return R.img({
			src: fileName,
			onMouseEnter: onImageAssetEnter,
			onMouseLeave: onImageAssetLeave
		});
	}

	static classIcon = (constructor: SourceMappedConstructor) => {
		return R.icon(constructor.__EDITOR_icon || 'tree/game');
	};

	static sceneNode(node: Container) {

		let desc;
		if(node.__description) {
			desc = R.div(descriptionProps, node.__description.split('\n')[0]);
		}
		return R.div(sceneNodeProps,
			R.classIcon(node.constructor as SourceMappedConstructor),
			node.name ? R.span(nameProps, node.name) : undefined,
			R.span(classProps,
				'(' + (node.__nodeExtendData.unknownConstructor ||
					(node.constructor as SourceMappedConstructor).__className) + ') #' + node.___id
			),
			desc);
	}

	static tip = (id: string, header: string, text: string) => {
		return h(Tip, { id, header, text });
	};

	static input(props: ComponentProps): preact.Component {
		if(props.hasOwnProperty('onChange') && !props.suspendOnChangeWarning && props.type !== 'checkbox') {
			debugger;
			//'onChage handler detected for "input" element. Use onInput instead', 99999, () => {
		}
		//@ts-ignore
		return h('input', props);
	}
}

const descriptionProps = { className: 'tree-desc' };
let nameProps = {
	className: 'scene-node-name',
};
let classProps = { className: 'scene-node-class' };
let sceneNodeProps = { className: 'scene-node-item' };

for(let factoryType of ['div', 'form', 'span', 'p', 'img', 'button', 'label',
	'b', 'a', 'br', 'hr', 'svg', 'td', 'tr', 'th', 'tbody', 'thead', 'table', 'polyline',
	'textarea', 'iframe', 'h2', 'h3', 'h4', 'h5', 'script', 'meta', 'space', 'smallSpace']) {
	//@ts-ignore
	R[factoryType] = (...theArgs: any[]) => {
		//@ts-ignore
		return h.call(this, factoryType, ...theArgs);
	};
}



let previewShown = false;
let assetPreviewTimeout = 0;

const imagePreviewContainer = window.document.createElement('div');
imagePreviewContainer.id = 'image-preview-container';
window.document.body.appendChild(imagePreviewContainer);

const hidePreview = () => {
	if(previewShown) {
		render(R.fragment(), imagePreviewContainer);
		previewShown = false;
	}
	if(assetPreviewTimeout) {
		clearTimeout(assetPreviewTimeout);
		assetPreviewTimeout = 0;
	}
}

const onImageAssetEnter = (ev: MouseEvent) => {
	hidePreview();
	let img: HTMLImageElement = (ev.target as HTMLImageElement);
	assetPreviewTimeout = setTimeout(() => {
		previewShown = true;
		render(R.div({
			onMouseLeave: onImageAssetLeave,
			style: {
				left: Math.max(0, ev.clientX - 128) + 'px',
				top: Math.max(128, ev.clientY) + 'px'
			},
			className: 'image-preview-tooltip fadein-animation'
		},
			R.div({
				className: 'image-preview-img',
				style: {
					backgroundImage: 'url("' + img.src + '")'
				}
			}),
			'(' + img.naturalWidth + ' × ' + img.naturalHeight + ')'
		), imagePreviewContainer);
	}, 100);
}

const onImageAssetLeave = () => {
	hidePreview();
};




export type { ComponentProps };
export default R;