export default {

    init() {

		//========= PIXI.DisplayObject ===========================================
    	Object.defineProperties(PIXI.DisplayObject.prototype, {
    	'scale.x':{
    		get:function(){return this.transform.scale.x},
    		set:function(val) {this.transform.scale.x = val}
    	},'scale.y':{
    		get:function(){return this.transform.scale.y},
    		set:function(val) {this.transform.scale.y = val}
    	},
    	'skew.x':{
    		get:function(){return this.transform.skew.x},
    		set:function(val) {this.transform.skew.x = val}
    	},'skew.y':{
    		get:function(){return this.transform.skew.y},
    		set:function(val) {this.transform.skew.y = val}
    	},
    	'pivot.x':{
    		get:function(){return this.transform.pivot.x},
    		set:function(val) {this.transform.pivot.x = val}
    	},'pivot.y':{
    		get:function(){return this.transform.pivot.y},
    		set:function(val) {this.transform.pivot.y = val}
    	}
    	});

        PIXI.DisplayObject.EDITOR_editableProps = [
			{
				type: 'splitter',
				title: 'Basic props:',
				name: 'basic'
			},
			{
				name:'name',
				type:String
			},
			{
				name: 'x',
				type: Number
			},
			{
				name: 'y',
				type: Number
			},
			{
				name: 'rotation',
				type: Number,
				step: 0.001
			},
			{
				name: 'alpha',
				type: Number,
				step: 0.01,
				min: 0,
				max: 1
			},
			{
				name: 'visible',
				type: Boolean,
			},
			{
				type: 'splitter',
				title: 'Transform:',
				name: 'transform'
			},
			{
				name: 'scale.x',
				type: Number,
				step:0.01
			},
			{
				name: 'scale.y',
				type: Number,
				step:0.01
			},
			{
				name: 'skew.x',
				type: Number,
				step:0.01
			},
			{
				name: 'skew.y',
				type: Number,
				step:0.01
			},
			{
				name: 'pivot.x',
				type: Number
			},
			{
				name: 'pivot.y',
				type: Number
			}
		   
		];

		
		//========= PIXI.Sprite ===========================================

		var blendModesSelect = Object.keys(PIXI.BLEND_MODES).map((k)=>{
		  return {name:k, value:PIXI.BLEND_MODES[k]};
		}).sort((a,b)=>{return a.value - b.value});

		PIXI.Sprite.EDITOR_editableProps = [
			{
				type: 'splitter',
				title: 'Sprite:',
				name: 'sprite'
			},
			{
				name:'blendMode',
				type: Number,
				select:blendModesSelect
			}
    	];
        
    }
}