export default {

    init() {
        PIXI.DisplayObject.prototype.listEditableProps = () => {
            return [
//EDITOR
                {
                    type: 'splitter',
                    title: 'Basic props:',
                    name: 'basic'
                },
//ENDEDITOR
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
                    rows:2
                }
            ]
        }
    }
}