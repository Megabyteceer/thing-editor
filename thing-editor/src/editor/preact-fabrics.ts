import { ComponentChild, ComponentChildren, Fragment, h } from 'preact';
import { KeyedMap } from 'thing-editor/src/editor/env';
import EditorButton from 'thing-editor/src/editor/ui/editor-button';
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
	static input: (props?: ComponentProps | null, ...children: ComponentChildren[]) => preact.Component;
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

	static btn(label: ComponentChild, onClick: (ev: PointerEvent) => void, title?: string, className?: string, hotkey?: number, disabled = false) {
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
}

for(let factoryType of ['div', 'form', 'span', 'p', 'img', 'button', 'input', 'label',
	'b', 'a', 'br', 'hr', 'svg', 'td', 'tr', 'th', 'tbody', 'thead', 'table', 'polyline',
	'textarea', 'iframe', 'h2', 'h3', 'h4', 'h5', 'script', 'meta']) {
	//@ts-ignore
	R[factoryType] = (...theArgs: any[]) => {
		//@ts-ignore
		return h.call(this, factoryType, ...theArgs);
	};
}

export type { ComponentProps };
export default R;