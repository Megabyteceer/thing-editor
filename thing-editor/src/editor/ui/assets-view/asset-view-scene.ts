import { ComponentChild } from "preact";
import { FileDescScene } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import AssetsView from "thing-editor/src/editor/ui/assets-view/assets-view";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import libInfo from "thing-editor/src/editor/utils/lib-info";
import { __UnknownClass } from "thing-editor/src/editor/utils/unknown-class";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy scene`s name',
	onMouseDown: copyTextByClick
};

const assetItemRendererScene = (file: FileDescScene): ComponentChild => {
	assert(file.asset.c, "rendering of prefab referenced to prefab not supported. TODO");

	const isCurrent = (file.assetName === game.editor.currentSceneName) || (AssetsView.currentItemName === game.editor.currentSceneName);

	return R.div(
		{
			className: isCurrent ? 'assets-item assets-item-scene assets-item-current' : 'assets-item assets-item-scene',
			key: file.assetName,
			onMouseDown: (ev: PointerEvent) => {
				if(!isCurrent && ev.buttons === 1) {
					game.editor.openScene(file.assetName);
				}
			},
			title: "Double click to open scene."
		},
		libInfo(file),
		R.classIcon(game.classes[file.asset.c!] || __UnknownClass),
		R.span(assetsItemNameProps, file.assetName));
}


export default assetItemRendererScene;
