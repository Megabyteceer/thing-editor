export default {

    init() {
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
				step:0.01,
				get:(self)=>{return self.transform.scale.x},
				set:(self, val)=>{self.transform.scale.x = val}
			},
			{
				name: 'scale.y',
				type: Number,
				step:0.01,
				get:(self)=>{return self.transform.scale.y},
				set:(self, val)=>{self.transform.scale.y = val}
			},
			{
				name: 'skew.x',
				type: Number,
				step:0.01,
				get:(self)=>{return self.transform.skew.x},
				set:(self, val)=>{self.transform.skew.x = val}
			},
			{
				name: 'skew.y',
				type: Number,
				step:0.01,
				get:(self)=>{return self.transform.skew.y},
				set:(self, val)=>{self.transform.skew.y = val}
			},
			{
				name: 'pivot.x',
				type: Number,
				get:(self)=>{return self.transform.pivot.x},
				set:(self, val)=>{self.transform.pivot.x = val}
			},
			{
				name: 'pivot.y',
				type: Number,
				get:(self)=>{return self.transform.pivot.y},
				set:(self, val)=>{self.transform.pivot.y = val}
			}
		   
		];
        
    }
}