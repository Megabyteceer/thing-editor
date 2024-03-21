/// #if EDITOR
import editable from 'thing-editor/src/editor/props-editor/editable';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import game from 'thing-editor/src/engine/game';
/// #endif

import Container from 'thing-editor/src/engine/lib/assets/src/basic/container.c';

export default class StaticTrigger extends Container {

	@editable({ type: 'data-path', important: true })
	dataPath = 'isMobile.any';

	@editable()
	invert = false;

	/// #if EDITOR

	__EDITOR_onCreate() {
		window.setTimeout(() => {
			editorUtils.centralizeObjectToContent(this);
		}, 0);
	}

	__afterDeserialization() {
		this.__validateStaticTrigger();
	}
	__beforeSerialization() {
		this.__validateStaticTrigger();
	}

	__validateStaticTrigger() {
		if (this.parent && (this.parent === game.stage || this.parent.parent === game.stage)) {
			game.editor.ui.status.error('StaticTrigger can not be root element or child of root element, because it does remove parent.', 32049, this);
		}
		if (this.dataPath && (this.dataPath.startsWith('this.') || this.dataPath.startsWith('all.'))) {
			game.editor.ui.status.error('StaticTrigger`s dataPath can refer to global variables only. Like isMobile.any', 32050, this, 'dataPath');
		}
	}

	static __canAcceptParent(o: Container) {
		if (o.parent === game.stage) {
			return false;
		}
		return true;
	}

	__canAcceptChild(_Class: SourceMappedConstructor) {
		return false;
	}
	/// #endif
}
/// #if EDITOR

StaticTrigger.__EDITOR_icon = 'tree/static-trigger';
StaticTrigger.__EDITOR_tip = '<b>StaticTrigger</b> - is component which permanently removes parent if condition pointed in <b>dataPath</b> is not <b>true</b>.';

/// #endif
