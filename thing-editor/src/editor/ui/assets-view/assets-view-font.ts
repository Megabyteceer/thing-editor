import type { FileDescPrefab } from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import libInfo from 'thing-editor/src/editor/utils/lib-info';

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy resource`s name',
	onMouseDown: copyTextByClick
};

const assetItemRendererFont = (file: FileDescPrefab) => {
	return R.div({
		key: file.assetName
	},
	libInfo(file),
	' font: ',
	R.span(assetsItemNameProps, file.assetName.split('/').pop()!.split('.woff')[0]));
};

export default assetItemRendererFont;
