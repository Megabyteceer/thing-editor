import { ComponentChild } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import game from "thing-editor/src/engine/game";

interface DebugStack {
	title: ComponentChild;
	stack: string;

}

interface StackItem {
	functionName: string,
	path: string,
}

const getCurrentStack = (title: ComponentChild): DebugStack => {
	return {
		title,
		stack: (new Error()).stack as string
	};
}

const showStack = (stack: DebugStack) => {
	let a = stack.stack.split('\n');
	a.shift();
	a.shift();

	const items: StackItem[] = a.map((s) => {
		let functionName;
		if(s.indexOf(' (') > 0) {
			functionName = s.split(' (');
			s = functionName[1];
			functionName = functionName[0];
		} else {
			functionName = '';
		}

		let pathParts = s.split('/');
		pathParts.shift();
		pathParts.shift();
		pathParts.shift();
		s = pathParts.join('/');

		if(s.indexOf('?') > 0) {
			pathParts = s.split('?');
			let a = pathParts[1].split(':');
			s = pathParts[0] + ':' + a[1];
		}
		return { functionName, path: s };
	});
	game.editor.ui.modal.showModal(R.div(null, R.b(null, stack.title), ' was invoked at:', items.map((i, key) => {
		return R.div({
			key, className: 'list-item stack-item', onMouseDown: () => {
				let a = i.path.split(':');
				game.editor.editSource('/' + a[0], parseInt(a[1]), parseInt(a[2]));
			}
		}, R.b(null, i.functionName), ' (', i.path, ')');
	})));
}

export { getCurrentStack, showStack };

