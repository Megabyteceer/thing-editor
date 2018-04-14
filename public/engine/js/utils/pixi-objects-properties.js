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
                    name: 'renderable',
                    type: Boolean,
                    rows:2
                }
            ]
        }
    }
}