import fs from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { ChooseListItem } from 'thing-editor/src/editor/ui/choose-list';
import game from 'thing-editor/src/engine/game';

interface ChooseTempletItem extends ChooseListItem {
	title: string;
	desc: string;
	path: string;
	isScene: boolean;
}

const newComponentWizard = async () => {

	let chosenFolder: string | undefined = await game.editor.chooseAssetsFolder('Where to create component?');

	if (!chosenFolder) {
		return;
	}

	let selectedTemplate = await game.editor.ui.modal.showListChoose('Choose template for new Custom Component', ([
		{
			title: 'Basic Game Object',
			desc: 'Creates simple game object. Then you can program this object\'s logic with javascript. This type of object will contain only basic methods of game object \'init\', \'update\', \'onRemove\', but you can add any method you want manually.',
			path: 'basic-game-object.tst',
			isScene: false
		},
		{
			title: 'Basic Scene',
			desc: 'Creates new type of scenes. Then you can create new scenes with this type.',
			path: 'basic-scene.tst',
			isScene: true
		},
		{
			title: 'Full Game Object',
			desc: 'Contains all the methods of game object. Include \'game methods\', and \'editor mode methods\'.',
			path: 'full-game-object.tst',
			isScene: false
		},
		{
			title: 'Full Scene',
			desc: 'Contains all the methods of game scene. Include \'game methods\', and \'editor mode methods\'.',
			path: 'full-scene.tst',
			isScene: true
		}
	] as ChooseTempletItem[]).map((tmp) => {
		tmp.pureName = tmp.title;
		tmp.name = R.div({ className: 'project-item-select' },
			R.div(null, tmp.title),
			R.div({ className: 'template-desc' }, tmp.desc)
		);
		return tmp;
	}), false, true);


	if (!selectedTemplate) {
		return;
	}

	let enteredClassName = await game.editor.ui.modal.showPrompt('Enter Component Name',
		selectedTemplate.isScene ? 'custom/MyNewScene' : 'custom/MyNewComponent',
		(val) => { //filter
			return val.replace(/[^a-zA-Z0-9\/]/gm, '_');
		},
		(val) => { //accept
			if (game.classes[val]) {
				return 'Component with name \'' + val + '\' already exists';
			}
		}
	);

	if (!enteredClassName) {
		return;
	}

	let selectedBaseClassName = await game.editor.chooseClass(selectedTemplate.isScene, '_baseClass', 'Choose base Component');

	if (!selectedBaseClassName) {
		return;
	}

	const selectedBaseClass = game.classes[selectedBaseClassName];
	let enteredClassNameParts = enteredClassName.split('/').filter((i: string) => i);
	enteredClassName = enteredClassNameParts.pop()!;
	if (!enteredClassName) {
		game.editor.ui.modal.showError('Wrong component name provided.', 30001);
		return;
	}
	if (enteredClassName.match('/^[\d_]/m')) {
		game.editor.ui.modal.showError('Class name can not start with digit or "_".', 30002);
		return;
	}
	enteredClassName = enteredClassName.substr(0, 1).toUpperCase() + enteredClassName.substr(1);

	let classFoldername = enteredClassNameParts.join('/');
	if (classFoldername) {
		classFoldername += '/';
	}
	let templateSrc = fs.readFile('thing-editor/src/editor/templates/' + selectedTemplate.path);

	//add or remove super method call if its exists
	let baseClassInstance = new (selectedBaseClass as any)();
	const regex = /(\/\/)(super\.)([a-zA-Z_]+)(\(\);)/gm;
	templateSrc = templateSrc.replace(regex, (_substr, _m1, m2, m3, m4) => {
		let isSuperClassHasThisMethod = (baseClassInstance as KeyedObject)[m3];
		if (isSuperClassHasThisMethod) {
			return m2 + m3 + m4;
		} else {
			return '';
		}
	});

	let baseClassPath = selectedBaseClass.__sourceFileName!.replace(/^\//, '').replace(/\.ts$/, '');

	templateSrc = templateSrc.replace(/CURRENT_PROJECT_DIR/gm, '/games/' + (game.editor.currentProjectDir.replace(/\/$/, '')));
	templateSrc = templateSrc.replace(/NEW_CLASS_NAME/gm, enteredClassName);
	templateSrc = templateSrc.replace(/BASE_CLASS_NAME/gm, selectedBaseClass.__className);
	templateSrc = templateSrc.replace(/BASE_CLASS_PATH/gm, baseClassPath);

	let fileName = enteredClassName.replace(/[A-Z]/gm, (substr: string, offset: number) => {
		return ((offset === 0 || enteredClassName[offset - 1] === '_') ? '' : '-') + substr.toLowerCase();
	});
	fileName = chosenFolder + 'src/' + classFoldername + fileName + '.c.ts';
	fs.writeFile(fileName, templateSrc);
	fs.refreshAssetsList();
	game.editor.reloadClasses().then(() => {
		game.editor.editClassSource(game.classes[enteredClassName]);
	});
};

export default newComponentWizard;
