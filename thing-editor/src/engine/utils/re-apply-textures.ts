import game from 'thing-editor/src/engine/game';

const texturesRefreshSchedulledNames = new Set();
let texturesRefreshSchedulledTimeout = 0;

function reApplyTextures(name: string) {
	if (texturesRefreshSchedulledTimeout) {
		clearTimeout(texturesRefreshSchedulledTimeout);
	}
	texturesRefreshSchedulledTimeout = window.setTimeout(refreshAllTextures, 10);
	texturesRefreshSchedulledNames.add(name);
}

function refreshAllTextures() {
	texturesRefreshSchedulledTimeout = 0;
	game.forAllChildrenEverywhere((o: any) => {
		if (o.image && texturesRefreshSchedulledNames.has(o.image)) {
			let tmp = o.image;
			o.image = 'EMPTY';
			o.image = tmp;
		}
	});
	texturesRefreshSchedulledNames.clear();
}

export default reApplyTextures;
