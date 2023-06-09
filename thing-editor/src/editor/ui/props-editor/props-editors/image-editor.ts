import R from "thing-editor/src/editor/preact-fabrics";
import { EditablePropertyEditorProps } from "thing-editor/src/editor/ui/props-editor/props-field-wrapper";

const ImageEditor = (props: EditablePropertyEditorProps) => {
	return R.fragment();


	/*




sound select type

крестик очистки.

кнопка плей текущего звука.

приклике по полю - выбор звука на замену.

в choose - опцию фильтрНейм для сохранения восстановления текста фильтра.
для звуков и префабов восстанавливать фильтр если задан фильтрНейм

	*/
};

ImageEditor.parser = (val: string) => {
	return val || null;
};

export default ImageEditor;