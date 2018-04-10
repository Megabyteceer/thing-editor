export default {


    init() {

        PIXI.DisplayObject.prototype.listEditableProps = () => {

            return [
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
                    type: 'splitter'
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