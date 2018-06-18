import Window from "./window.js";
import Group from "./group.js";

const fakeOwner = {};

const errorIcon = R.icon('error-icon');
const warnIcon = R.icon('warn-icon');

export default class Status extends React.Component {
	
	constructor(props) {
		super();
		this.errorsMap = new WeakMap();
		this.warnsMap = new WeakMap();
		
		this.state = {};
		this.errors = [];
		this.warns = [];
		
		
		this.warnsListRef = this.warnsListRef.bind(this);
		this.errorsListRef = this.errorsListRef.bind(this);
		this.clear = this.clear.bind(this);
	}
	
	errorsListRef(ref) {
		this.errorsList = ref;
	}
	
	warnsListRef(ref) {
		this.warnsList = ref;
	}
	
	error (message, owner = fakeOwner, fieldName) {
		console.error(message);
		if(!this.errorsMap.has(owner)) {
			this.errorsMap.set(owner, true);
			this.errors.push({owner, message, fieldName});
			if(this.errorsList) {
				this.errorsList.forceUpdate();
			} else {
				this.show();
			}
		}
	}
	
	warn (message, owner = fakeOwner, fieldName) {
		console.warn(message);
		if(!this.warnsMap.has(owner)) {
			this.warnsMap.set(owner, true);
			this.warns.push({owner, message, fieldName});
			if(this.errorsList) {
				this.warnsList.forceUpdate();
			} else {
				this.show();
			}
		}
	}
	
	clear () {
		this.errors.length = 0;
		this.warns.length = 0;
		
		this.errorsMap = new WeakMap();
		this.warnsMap = new WeakMap();
		
		this.hide();
	}
	
	show() {
		this.setState({toggled:true});
	}
	
	hide() {
		this.setState({toggled:false});
	}
	
	render() {
	
		if(this.state.toggled) {
			return editor.ui.renderWindow('info', 'Info Window', R.div(null,
				R.btn('×', this.clear, 'Hide Info Window (Ctrl+I)', 'close-window-btn'),
				React.createElement(InfoList, {ref: this.errorsListRef, id:'errors-list', title:'Errors:', icon: errorIcon, className:'info-errors-list info-list', list:this.errors}),
				React.createElement(InfoList, {ref: this.warnsListRef, id:'warns-list', title:'Warnings:', icon: warnIcon, className:'info-warns-list info-list', list:this.warns})
				
			), 586, 650, 400, 150, 1137, 407);
			
			setTimeout(() => {
				Window.bringWindowForward($('#window-info'));
			}, 1);
		}
		return R.span();
	}
}

class InfoList extends React.Component {
	
	constructor(props) {
		super(props);
		this.renderItem = this.renderItem.bind(this);
	}
	
	renderItem(item, i) {
		return R.div({key:i, className:'info-item clickable', onClick:() => {
			if(item.owner && (item.owner instanceof PIXI.DisplayObject)) {
				editor.ui.sceneTree.selectInTree(item.owner);
				
				if(item.fieldName) {
					editor.ui.propsEditor.selecField(item.fieldName);
				}
			}
		}}, this.props.icon, item.message);
	}

	render() {
		if(this.props.list.length <= 0) {
			return R.div();
		}
		return R.div(null,
			R.div({className:'info-badge'}, this.props.list.length),
			Group.renderGroup({key: this.props.id, content: this.props.list.map(this.renderItem), title: this.props.title})
		);
	}
}