import { Color } from 'pixi.js';
import R from 'thing-editor/src/engine/basic-preact-fabrics';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import type Scene from 'thing-editor/src/engine/lib/assets/src/basic/scene.c';
import { AssetType, type FileDesc } from '../../fs';
import { editorEvents } from '../../utils/editor-events';
import exportAsPng from '../../utils/export-as-png';

const NO_PREVIEW_IMG = document.createElement('img');
NO_PREVIEW_IMG.src = '/thing-editor/img/broken-image.png';
const prefabsPreviewsCache = new Map() as Map<string, HTMLCanvasElement>;
const scenesPreviewsCache = new Map() as Map<string, HTMLCanvasElement>;

editorEvents.on('prefabUpdated', (prefabName:string) => {
	prefabsPreviewsCache.delete(prefabName);
});

editorEvents.on('sceneUpdate', (sceneName:string) => {
	prefabsPreviewsCache.delete(sceneName);
});

export const assetPreview = (file: FileDesc, width = 30, height = 30) => {
	return R.span({
		className: 'assets-item-preview-pic',
		ref: (ref: HTMLSpanElement) => {
			if (ref && !game.editor.buildProjectAndExit) {

				const isScene = file.assetType === AssetType.SCENE;

				const cache = isScene ? scenesPreviewsCache : prefabsPreviewsCache;

				const img = cache.get(file.assetName);
				if (img) {
					ref.appendChild(img);
				} else {
					setTimeout(() => {
						const o = isScene ? ((game.editor.currentSceneName === file.assetName && game.currentScene) ? game.currentScene : Lib.__loadSceneNoInit(file.assetName)) : Lib.__loadPrefabNoInit(file.assetName);
						const bgColor = isScene ? new Color((o as Scene).backgroundColor).toHex() : '#000';
						(exportAsPng(o, width, height, -1, undefined, true, !o.parent) as any).then((canvas: HTMLCanvasElement) => {
							if (!canvas) {
								canvas = NO_PREVIEW_IMG as any;
							} else {
								canvas.style.backgroundColor = bgColor;
							}
							cache.set(file.assetName, canvas);
							ref.querySelector('canvas')?.remove();
							ref.appendChild(canvas);
						});
					}, 10);
				}
			}
		},
	});
};
