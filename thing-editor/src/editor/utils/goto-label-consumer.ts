import type { Container } from 'pixi.js';
import R from 'thing-editor/src/engine/basic-preact-fabrics';
import game from 'thing-editor/src/engine/game';

const gotoLabelHelper = (context: IGoToLabelConsumer) => {

	return new Promise((resolve) => {

		let addedLabels: Set<string> = new Set();

		const CUSTOM_LABEL_ITEM = { name: 'Custom label...' };

		let labels = [];

		const l = context.__getLabels();

		for (let name in l) {
			if (!addedLabels.has(name)) {
				labels.push({ name: R.b(null, name), pureName: name });
				addedLabels.add(name);
			}
		}

		labels.push(CUSTOM_LABEL_ITEM);

		return game.editor.ui.modal.showListChoose('Choose label to go', labels).then((choosed) => {
			if (choosed) {
				if (choosed === CUSTOM_LABEL_ITEM) {
					game.editor.ui.modal.showPrompt('Enter value', '').then((enteredText) => {
						resolve([enteredText]);
					});
				} else {
					resolve([choosed.pureName]);
				}
			}
			return null;
		});
	});
};

const gotoLabelRecursiveHelper = (context: Container) => {
	return new Promise((resolve) => {
		let labels = [];
		let addedLabels: Set<string> = new Set();
		const getLabels = (o:any) => {
			if (o.__getLabels) {
				const ls = o.__getLabels();
				if (ls) {
					for (const a of ls) {
						if (!addedLabels.has(a)) {
							addedLabels.add(a);
							labels.push({ name: R.b(null, a), pureName: a });
						}
					}
				}
			}
		};
		getLabels(context);
		context.forAllChildren(getLabels);

		const CUSTOM_LABEL_ITEM = { name: 'Custom label...' };
		labels.push(CUSTOM_LABEL_ITEM);

		return game.editor.ui.modal.showListChoose('Choose label to go recursive for event ' + (game.editor.currentPathChoosingField?.name || ' of keyframe.'), labels).then((chosen) => {
			if (chosen) {
				if (chosen === CUSTOM_LABEL_ITEM) {
					game.editor.ui.modal.showPrompt('Enter value', '').then((enteredText) => {
						resolve([enteredText]);
					});
				} else {
					resolve([chosen.pureName]);
				}
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
