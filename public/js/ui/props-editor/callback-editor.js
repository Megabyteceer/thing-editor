import DataPathEditor from "./data-path-editor.js";
import ScenesList from "../scenes-list.js";
import Lib from "/thing-engine/js/lib.js";

export default class CallbackEditor extends DataPathEditor {
	
	
	prepareCurrentPath(path) {
		return path ? path.split('`')[0] : null;
	}
	
	isItTargetValue(val) {
		assert(val, "empty value selected in callback chooser. Field filter need improvements: ");
		
		let type = typeof val;
		
		return (type === 'function') && (!Lib.__hasClass(val.name) || (Lib.getClass(val.name) !== val));
	}
	
	finalValueChoosed(path) {
		path = path.join('.');
		
		if(path === 'game.showScene') {
			ScenesList.chooseScene("Choose scene to open:").then((selectedSceneName) => {
				if(selectedSceneName) {
					this.applyFinalPath(path + '`' + selectedSceneName);
				}
			});
		} else {
			this.applyFinalPath(path);
		}
	}
	
	
	isFieldGoodForCallbackChoose(fieldName, object) {
		if(!super.isFieldGoodForCallbackChoose(fieldName, object)) {
			return false;
		}
		
		let val = object[fieldName];
		if(!val) {
			return false;
		}
		let type = typeof val;
		return type === 'object' || type === 'function';
	}
}