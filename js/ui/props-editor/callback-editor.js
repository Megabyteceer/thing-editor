import DataPathEditor from "./data-path-editor.js";
import ScenesList from "../scenes-list.js";
import Lib from "/thing-engine/js/lib.js";
import {setValueByPath} from "/thing-engine/js/utils/get-value-by-path.js";
import PrefabsList from "../prefabs-list.js";

export default class CallbackEditor extends DataPathEditor {
	
	
	prepareCurrentPath(path) {
		return path ? path.split('`')[0] : null;
	}
	
	isItTargetValue(val) {
		assert(val, "empty value selected in callback chooser. Field filter need improvements: ");
		
		let type = typeof val;
		return (type === 'function') && (!val.prototype);
	}
	
	addAdditionalRoots(parent) {
		super.addAdditionalRoots(parent);
		parent['setValueByPath'] = setValueByPath;
	}
	
	finalValueChoosed(path) {
		path = path.join('.');
		
		switch(path) {
		case 'game.showModal':
			PrefabsList.choosePrefab("Choose prefab to show as modal:").then((selectedPrefabName) => {
				if(selectedPrefabName) {
					this.applyFinalPath(path + '`' + selectedPrefabName);
				}
			});
			break;
				
		case 'game.showScene':
			ScenesList.chooseScene("Choose scene to open:").then((selectedSceneName) => {
				if(selectedSceneName) {
					this.applyFinalPath(path + '`' + selectedSceneName);
				}
			});
			break;
				
		case 'FlyText.flyText':
			editor.ui.modal.showPrompt('Enter text to show', 'Text-1').then((enteredText) => {
				if(enteredText) {
					this.applyFinalPath(path + '`' + enteredText);
				}
			});
			break;
		case 'setValueByPath':
			editor.ui.modal.showPrompt('Enter data path', 'game.data.').then((enteredText1) => {
				if(enteredText1) {
					editor.ui.modal.showPrompt('Enter value', '').then((enteredText2) => {
						this.applyFinalPath(path + '`' + enteredText1 + (enteredText2 ? ',' + enteredText2 : ''));
					});
				}
			});
			break;
				
		default:
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