import game from 'thing-editor/src/engine/game';

const ButtonOnlyPropertyDesc = {
	get: () => {
		return !game.editor.currentPathChoosingField || game.editor.currentPathChoosingField.name.toLocaleLowerCase().indexOf('click') < 0; // TODO check if button callback can choose it
	}
};
export { ButtonOnlyPropertyDesc };
