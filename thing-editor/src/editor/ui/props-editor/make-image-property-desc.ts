import { Container } from "pixi.js";
import { KeyedObject } from "thing-editor/src/editor/env";
import { EditablePropertyDescRaw } from "thing-editor/src/editor/props-editor/editable";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";
import loadDynamicTextures from "thing-editor/src/engine/utils/load-dynamic-textures";

const makeImageSelectEditablePropertyDescriptor = (name: string, canBeEmpty?: boolean, important: boolean = false, filterName = 'image'): EditablePropertyDescRaw<Container> => {
	return {
		name: name,
		type: 'string',
		default: canBeEmpty ? '' : 'EMPTY',
		important,
		filterName,
		//@ts-ignore
		__isImage: true,
		afterEdited: () => {
			for(let o of game.editor.selection) {
				if(!Lib.hasTexture((o as KeyedObject)[name])) {
					loadDynamicTextures();
					return;
				}
			}
		},
		select: () => {
			let ret;
			if(canBeEmpty) {
				ret = Lib.__texturesList.concat();
				ret.unshift({
					"name": "none",
					"value": ""
				});
			} else {
				ret = Lib.__texturesList;
			}
			let currentVal: string | false = false;
			for(let o of game.editor.selection) {
				if(currentVal !== false && currentVal !== (o as KeyedObject)[name]) {
					return ret;
				}
				currentVal = (o as KeyedObject)[name];
			}
			if((typeof currentVal === "string") && (!ret.find((i) => {
				return i.value === currentVal;
			}))) {
				let a = [];
				for(let i of ret) {
					if(i.value.indexOf(currentVal.replace(/\.(png|jpg|webp|svg)/, '')) >= 0 || currentVal.indexOf(i.value.replace(/\.(png|jpg|webp|svg)/, '')) >= 0) {
						a.unshift(i);
					} else {
						a.push(i);
					}
				}
				ret = a;
			}
			return ret;
		}
	};
};

export default makeImageSelectEditablePropertyDescriptor;