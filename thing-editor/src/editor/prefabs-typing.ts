// thing-editor auto generated file.
import Container from "thing-editor/src/engine/lib/assets/src/basic/container.c";
import Resizer from "thing-editor/src/engine/lib/assets/src/extended/resizer.c";
import Flow from "games/slot-client/assets/src/custom/flow.c";
import BuyFeatureButton from "games/slot-client/assets/src/custom/buy-feature-button.c";
import WinPopup from "games/slot-client/assets/src/custom/win-popup.c";
import Reel from "games/slot-client/assets/src/slot/reel.c";
import SlotSymbol from "games/slot-client/assets/src/slot/slot-symbol.c";
import DSprite from "thing-editor/src/engine/lib/assets/src/basic/d-sprite.c";
export default class TLib {
	static loadPrefab(prefabName: 'fader/default'):Container;
	static loadPrefab(prefabName: 'ui/sure-question'):Resizer;
	static loadPrefab(prefabName: 'flow-animation1'):Flow;
	static loadPrefab(prefabName: 'slot/buy/buy-button'):BuyFeatureButton;
	static loadPrefab(prefabName: 'slot/popups/win-popup'):WinPopup;
	static loadPrefab(prefabName: 'slot/reel'):Reel;
	static loadPrefab(prefabName: 'slot/stick-animation'):Flow;
	static loadPrefab(prefabName: 'slot/symbol'):SlotSymbol;
	static loadPrefab(prefabName: 'slot/symbols/1'):DSprite;
	static loadPrefab(prefabName: 'slot/symbols/2'):DSprite;
	static loadPrefab(prefabName: 'slot/symbols/3'):DSprite;
	static loadPrefab(prefabName: 'slot/symbols/4'):DSprite;
	static loadPrefab(prefabName: 'slot/symbols/5'):DSprite;
	static loadPrefab(prefabName: 'slot/symbols/6'):DSprite;
	static loadPrefab(prefabName: 'slot/symbols/7'):DSprite;
	static loadPrefab(prefabName: 'slot/symbols/8'):DSprite;
	static loadPrefab(prefabName: 'slot/symbols/9'):DSprite;
	static loadPrefab(prefabName: 'slot/symbols/a'):DSprite;
	static loadPrefab(prefabName: 'slot/symbols/b'):DSprite;
	static loadPrefab(prefabName: 'slot/symbols/S'):DSprite;
	static loadPrefab(prefabName: 'slot/symbols/W'):DSprite;
	static loadPrefab(prefabName: string): Container;
	static loadPrefab(prefabName: string): Container {
		return prefabName as any;
	}
}