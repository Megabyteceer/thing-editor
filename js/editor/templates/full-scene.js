// this class automatically generated with Thing-Editor's component's Wizard,
// and contain full list of scene's methods, include scene
// For details: https://github.com/Megabyteceer/thing-editor/wiki/Custom-Components#custom-component-methods

import BASE_CLASS_NAME from "BASE_CLASS_PATH";

export default class NEW_CLASS_NAME extends BASE_CLASS_NAME {

	init() {
		//super.init();
		// Add initialization code here

	}

	onShow() {
		// Add each time scene appears on game screen

		//super.onShow();
	}

	update() {
		// Add your update code here

		//super.update();
	}

	onHide() {
		// Add each time scene disappears from game screen

		//super.onHide();
	}

	onRemove() {
		// Add on scene destroying code here

		//super.onRemove();
	}

	onMouseDown(gameMouse, pixiEvent) { //eslint-disable-line no-unused-vars

	}

	onMouseMove(gameMouse, pixiEvent) { //eslint-disable-line no-unused-vars

	}

	onMouseUp(gameMouse, pixiEvent) { //eslint-disable-line no-unused-vars

	}

	onLanguageChanged() {
		//super.onLanguageChanged();

	}

	_onRenderResize() {
		//super._onRenderResize();

	}

	/// #if EDITOR
	__EDITOR_onCreate() {
		//super.__EDITOR_onCreate();

	}

	__onSelect() {
		//super.__onSelect();

	}

	__onUnselect() {
		//super.__onUnselect();

	}

	__beforeSerialization() {
		//super.__beforeSerialization();

	}

	__afterSerialization() {
		//super.__afterSerialization();

	}

	__beforeDeserialization() {
		//super.__beforeDeserialization();

	}

	__afterDeserialization() {
		//super.__afterDeserialization();

	}

	__onChildSelected() {
		//super.__onChildSelected();

	}
	/// #endif
}

/// #if EDITOR

__EDITOR_editableProps(NEW_CLASS_NAME, [ //list of editable properties
	{
		type: 'splitter',
		title: 'NEW_CLASS_NAME',
		name: 'NEW_CLASS_NAME-props'
	}/*,
	{
		name:'mySceneProperty',
		type:Number,
		default: 1,
		step: 0.01
	}*/
]);
/// #endif