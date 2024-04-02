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

		let pathParts = s.split('/');
		pathParts.shift();
		pathParts.shift();
		pathParts.shift();
		s = pathParts.join('/');

		if (s.indexOf('?') > 0) {
			pathParts = s.split('?');
			let a = pathParts[1].split(':');
			s = pathParts[0] + ':' + a[1];
		}
		return { functionName, path: s };
	});
	game.editor.ui.modal.showModal(R.div(null, R.b(null, stack.title), ' was invoked at:', items.map((i, key) => {
		return R.div({
			key, className: 'list-item stack-item', onMouseDown: async () => {
				if (i.path) {
					const a = i.path.split(':');
					const url = a[0];
					if (url) {
						const line = a[1];
						const SourceMapConsumer = (await (import('source-map-js'))).default.SourceMapConsumer;
						const src = await (await fetch('/' + url + '?' + Date.now())).text();
						if (src) {
							const sourceMapUrl = src.split('sourceMappingURL=')[1];
							const sourceMap = await (await fetch(sourceMapUrl)).text();
							if (sourceMap) {
								const consumer = new SourceMapConsumer(sourceMap as any);
								const ret = consumer.originalPositionFor({ line: parseInt(line), column: 0 });
								game.editor.editSource('/' + url, ret.line as any, ret.column as any);
								return;
							}
						}
					}
					game.editor.editSource('/' + i.path);
				}
			}
		}, R.b(null, i.functionName), ' (', i.path, ')');
	})));
};


export { getCurrentStack, showStack };
export type { DebugStack };

