import type { Container } from 'pixi.js';
import type { ComponentChild, ComponentChildren } from 'preact';
import { Fragment, h, render } from 'preact';
import type { FileDescClass, FileDescImage } from 'thing-editor/src/editor/fs';
import EditorButton from 'thing-editor/src/editor/ui/editor-button';
import Tip from 'thing-editor/src/editor/ui/tip';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import type { Hotkey } from 'thing-editor/src/editor/utils/hotkey';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';

interface ComponentProps {
	className?: string;
	onClick?: ((ev: PointerEvent) => void) | (() => void);
	[key: string]: any;
}
const _iconsCache: KeyedMap<preact.Component> = {};

const assetsItemNameProps = {
	className: 'selectable-text class-name',
	title: 'Ctrl+click to copy class`s name',
	onMouseDown: copyTextByClick
};

const renderClass = (file: FileDescClass) => {
	return R.fragment(
		R.classIcon(file.asset),
		R.span(assetsItemNameProps,
			(file.asset).__className)
	);
};

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
		assert(typeof onClick === 'function', 'Function as onClick handler expected.');
		className = className || '';
		return h(EditorButton, { label, onClick, className, title, hotkey, disabled });
	}
	static icon(name: string) {
		if (!_iconsCache.hasOwnProperty(name)) {
			assert(name, 'Icon\'s name expected.');
			let src;
			if (name.startsWith('/')) {
				src = name;
			} else {
				src = '/thing-editor/img/' + name;
			}
			src += '.png';
			_iconsCache[name] = R.img({ src });
		}
		return _iconsCache[name];
	}
	static multilineText = (txt: ComponentChild) => {
		if (typeof txt !== 'string') {
			return txt;
		}
		return R.div(null, txt.split('\n').map((line, i) => {
			const lineProps = { key: i };
			const words = line.split(/[ :;,\(\)]/gm);
			words.some((word) => {
				if (/\.(ts|js|json)$/gm.test(word)) {
					(lineProps as any).onClick = () => {
						game.editor.editFile(word);
					};
					(lineProps as any).className = 'clickable';
					return true;
				}
			});
			return R.div(lineProps, line);
		}));
	};

	static fragment(...children: ComponentChildren[]) {
		return h(Fragment, null, ...children);
	}

	static imageIcon(file: FileDescImage) {
		if (file) {
			if (file.parentAsset) {
				const frame = (file.parentAsset.asset as any).frames[file.assetName].frame;
				const textureUrl = file.asset.baseTexture.resource.src;
				const scale = Math.min(30 / frame.w, 30 / frame.h);
				const width = frame.w * scale;
				return R.div({
					style: {
						verticalAlign: 'middle',
						display: 'inline-block',
						backgroundImage: 'url(' + ((file as FileDescImage).v ? (textureUrl + '?v=' + (file as FileDescImage).v) : textureUrl) + ')',
						objectFit: 'none',
						backgroundPosition: (-frame.x * scale) + 'px -' + (frame.y * scale) + 'px',
						marginLeft: (30 - width) / 2 + 'px',
						marginRight: (50 - width) / 2 + 'px',
						width: width + 'px',
						height: '30px',
						backgroundSize: (scale * file.asset.baseTexture.width) + 'px'
					}
				});
			} else {
				return R.img({
					className: 'preview-img',
					src: (file as FileDescImage).v ? (file.fileName + '?v=' + (file as FileDescImage).v) : file.fileName,
					onMouseEnter: onImageAssetEnter,
					onMouseLeave: onImageAssetLeave
				});
			}
		} else {
			return R.img({
				className: 'preview-img',
				src: '/thing-editor/img/wrong-texture.png',
				onMouseEnter: onImageAssetEnter,
				onMouseLeave: onImageAssetLeave
			});
		}
	}

	static classIcon = (constructor: SourceMappedConstructor) => {
		return R.icon(constructor.__EDITOR_icon || 'tree/game');
	};

	static sceneNode(node: Container) {

		let desc;
		if (node.__description) {
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

	static input(props: ComponentProps): ComponentChild {
		if (props.hasOwnProperty('onChange') && !props.suspendOnChangeWarning && props.type !== 'checkbox' && props.type !== 'color') {
			debugger;
			//'onChage handler detected for "input" element. Use onInput instead', 99999, () => {
		}

		return h('input' as any, props);
	}
}

const descriptionProps = { className: 'tree-desc' };
let nameProps = {
	className: 'scene-node-name',
};
let classProps = { className: 'scene-node-class' };
let sceneNodeProps = { className: 'scene-node-item' };

for (let factoryType of ['div', 'form', 'span', 'p', 'img', 'button', 'label',
	'b', 'a', 'br', 'hr', 'svg', 'td', 'tr', 'th', 'tbody', 'thead', 'table', 'polyline',
	'textarea', 'iframe', 'h2', 'h3', 'h4', 'h5', 'script', 'meta', 'space', 'smallSpace']) {

	(R as KeyedObject)[factoryType] = (...theArgs: any[]) => {
		return h(factoryType, ...theArgs as [any]);
	};
}


let previewShown = false;
let assetPreviewTimeout = 0;

const imagePreviewContainer = window.document.createElement('div');
imagePreviewContainer.id = 'image-preview-container';
window.document.body.appendChild(imagePreviewContainer);

const hidePreview = () => {
	if (previewShown) {
		render(R.fragment(), imagePreviewContainer);
		previewShown = false;
	}
	if (assetPreviewTimeout) {
		clearTimeout(assetPreviewTimeout);
		assetPreviewTimeout = 0;
	}
};

window.addEventListener('mousedown', hidePreview);

const onImageAssetEnter = (ev: MouseEvent) => {
	hidePreview();
	let img: HTMLImageElement = (ev.target as HTMLImageElement);
	assetPreviewTimeout = window.setTimeout(() => {
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
};

const onImageAssetLeave = () => {
	hidePreview();
};


export type { ComponentProps };
export default R;

export { renderClass };
