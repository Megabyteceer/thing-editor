import type { ComponentChild } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import game from 'thing-editor/src/engine/game';

interface DebugStack {
	title: ComponentChild;
	stack: string;

}

interface StackItem {
	functionName: string;
	path: string;
}

const getCurrentStack = (title: string): DebugStack => {
	let stack = (new Error(title)).stack as string;

	stack = stack.replace('Error: ', '');
	stack = stack.split('http://localhost:5173').join('');
	const a = stack.split('\n');
	a.splice(1, 1);
	stack = a.join('\n');

	return {
		title,
		stack
	};
};

const showStack = (stack: DebugStack) => {
	let a = stack.stack.split('\n');
	a.shift();
	a.shift();

	const items: StackItem[] = a.map((s) => {
		let functionName;
		if (s.indexOf(' (') > 0) {
			functionName = s.split(' (');
			s = functionName[1].split(')').shift()!;
			functionName = functionName[0];
		} else {
			functionName = '';
		}

		if (s.indexOf('?') > 0) {
			let pathParts = s.split('?');
			let a = pathParts[1].split(':');
			s = pathParts[0] + ':' + a[1];
		}
		return { functionName, path: s };
	});
	game.editor.ui.modal.showModal(R.div(null, R.b(null, stack.title), ' was invoked at:', items.map((i, key) => {
		return R.div({
			key, className: 'list-item stack-item', onMouseDown: async () => {
				if (i.path) {
					game.editor.editSource(i.path.startsWith('/') ? i.path : '/' + i.path);
				}
			}
		}, R.b(null, i.functionName), ' (', i.path, ')');
	})));
};


export { getCurrentStack, showStack };
export type { DebugStack };

