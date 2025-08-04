import type { Container } from 'pixi.js';
import game from 'thing-editor/src/engine/game';

const gotoLabelHelper = (context: IGoToLabelConsumer):Promise<(string|undefined)[]> => {

	return new Promise((resolve) => {

		let addedLabels: Set<string> = new Set();

		let labels = [];

		const l = context.__getLabels();

		if (l) {
			for (let name of l) {
				if (!addedLabels.has(name)) {
					labels.push(name);
					addedLabels.add(name);
				}
			}
		}

		return game.editor.ui.modal.showPrompt('Choose label to go', '', undefined, undefined, false, false, labels).then((enteredLabelName) => {
			if (enteredLabelName) {
				resolve([enteredLabelName]);
			}
			return null;
		});
	});
};

const gotoLabelRecursiveHelper = (context: Container) => {
	return new Promise((resolve) => {
		let labels = [] as string[];
		let addedLabels: Set<string> = new Set();
		const getLabels = (o:any) => {
			if (o.__getLabels) {
				const _labels = o.__getLabels();
				if (_labels) {
					for (const label of _labels) {
						if (!addedLabels.has(label)) {
							addedLabels.add(label);
							labels.push(label);
						}
					}
				}
			}
		};
		getLabels(context);
		context.forAllChildren(getLabels);

		return game.editor.ui.modal.showPrompt('Choose label to go recursive for event ' + (game.editor.currentPathChoosingField?.name || ' of keyframe.'), '', undefined, undefined, false, false, labels).then((enteredLabelName) => {
			if (enteredLabelName) {
				resolve([enteredLabelName]);
			}
			return null;
		});
	});
};

export function decorateGotoLabelMethods(constrictor: new() => IGoToLabelConsumer) {
	(constrictor.prototype.gotoLabelRecursive as SelectableProperty).___EDITOR_callbackParameterChooserFunction = gotoLabelRecursiveHelper;
	(constrictor.prototype.gotoLabelRecursive as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
	if (constrictor.prototype.gotoLabel) {
		(constrictor.prototype.gotoLabel as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
		(constrictor.prototype.gotoLabel as SelectableProperty).___EDITOR_callbackParameterChooserFunction = gotoLabelHelper;
	}
}

export { gotoLabelHelper };

