import game from "thing-editor/src/engine/game";

const texturesRefreshSchedulledNames = new Set();
let texturesRefreshSchedulledTimeout: number | null;

function reApplyTextures(name: string) {
	if(texturesRefreshSchedulledTimeout) {
		clearTimeout(texturesRefreshSchedulledTimeout);
	}
	texturesRefreshSchedulledTimeout = setTimeout(refreshAllTextures, 10);
	texturesRefreshSchedulledNames.add(name);
}

function refreshAllTextures() {
	texturesRefreshSchedulledTimeout = null;
	game.forAllChildrenEverywhere((o: any) => {
		if(o.image && texturesRefreshSchedulledNames.has(o.image)) {
			let tmp = o.image;
			o.image = 'EMPTY';
			o.image = tmp;
		}
	});
	texturesRefreshSchedulledNames.clear();
}

export default reApplyTextures;