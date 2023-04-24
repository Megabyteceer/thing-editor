import { ComponentChildren, h } from 'preact';

type PreactProps = Parameters<typeof h>;
type P1 = PreactProps[1];

class R {
	static span(_props:P1, ..._children:ComponentChildren[]) {
		const a = Array.from(arguments)
		a.unshift('span');
		//@ts-ignore
		return h.apply(null, a);
	}
	static div(_props:P1, ..._children:ComponentChildren[]) {
		const a = Array.from(arguments)
		a.unshift('div');
		//@ts-ignore
		return h.apply(null, a);
	}
}

export default R;