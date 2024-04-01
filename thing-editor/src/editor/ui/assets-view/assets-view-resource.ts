import type { FileDescPrefab } from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import libInfo from 'thing-editor/src/editor/utils/lib-info';

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy resource`s name',
	onMouseDown: copyTextByClick
};

const assetItemRendererResource = (file: FileDescPrefab) => {
	return R.div({
		key: file.assetName
	},
	libInfo(file),
	' resource: ',
	R.span(assetsItemNameProps, file.assetName));
};

export default assetItemRendererResource;
