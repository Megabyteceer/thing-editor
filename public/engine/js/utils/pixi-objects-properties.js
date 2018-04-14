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
                    type: Number,
                    step: 1
                },
                {
                    name: 'y',
                    type: Number,
                    step: 1
                }
            ]
        }
    }
}