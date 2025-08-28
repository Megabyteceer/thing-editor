import type { FileDescL10n } from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import libInfo from 'thing-editor/src/editor/utils/lib-info';
import { CTRL_READABLE } from 'thing-editor/src/engine/utils/utils';
import LanguageView from '../language-view';

const assetsItemNameProps = {
	className: 'selectable-text',
	title: CTRL_READABLE + '+click to copy resource`s name',
	onMouseDown: copyTextByClick
};

const assetItemRendererL10n = (file: FileDescL10n) => {
	return R.div(
		{
			key: file.assetName,
			title: file.fileName,
			onDblClick: () => {
				const key = Object.keys(file.asset)[0];
				LanguageView.editKey(key);
			}
		},
		libInfo(file),
		' language: ',
		R.span(assetsItemNameProps, file.lang)
	);
};

export default assetItemRendererL10n;
