import Spine from './spine.js';

/**
 * It's an usual spine component, but it hides spineContent while spine isn't playing and shows all children (except spineContent)
 * 99999
 */
export default class ReplaceableSpine extends Spine {
	update() {
		super.update();

		if (!this.isReplacerShowed && !this.isPlaying) {
			this.showReplacers();
		} else if (this.isReplacerShowed && this.isPlaying) {
			this.hideReplacers();
		}
		
		if (this.isReplacerShowed) {
			for (let c of this.children) {
				if(c !== this.spineContent) {
					c.tint = this.tint;
				}
			}
		}
		
	}

	showReplacers() {
		this.isReplacerShowed = true;

		if (this.spineContent) {
			this.spineContent.visible = false;
		}

		for (let c of this.children) {
			if(c !== this.spineContent) {
				c.visible = true;
			}
		}
	}

	hideReplacers() {
		this.isReplacerShowed = false;
		
		if (this.spineContent) {
			this.spineContent.visible = true;
		}
		
		for (let c of this.children) {
			if(c !== this.spineContent) {
				c.visible = false;
			}
		}
	}
	
	onRemove() {
		super.onRemove();
		this.isReplacerShowed = null;
	}
}

/// #if EDITOR
ReplaceableSpine.__EDITOR_group = 'Extended';
ReplaceableSpine.__EDITOR_icon = 'tree/spine';

__EDITOR_editableProps(ReplaceableSpine, [
	{
		type: 'splitter',
		title: 'Replaceable spine:',
		name: 'replaceable-spine'
	}
]);
/// #endif
