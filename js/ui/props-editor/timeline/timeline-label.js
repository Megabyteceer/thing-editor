import MovieClip from "thing-engine/js/components/movie-clip/movie-clip.js";
import Timeline from "./timeline.js";

export default class TimeLabel extends React.Component {
	
	constructor(props) {
		super(props);
		this.onDoubleClick = this.onDoubleClick.bind(this);
		this.onLabelMouseDown = this.onLabelMouseDown.bind(this);
		Timeline.registerDragableComponent(this);
	}

	
	componentDidMount() {
		Timeline._justModifiedSelectable(this);
	}

	componentWillReceiveProps(props) {
		if(this.props.label.t !== props.label.t) {
			Timeline._justModifiedSelectable(this);
		}
	}


	componentWillUnmount() {
		Timeline.unregisterDragableComponent(this);
	}

	getTime() {
		return this.props.label.t;
	}

	setTime(time) {
		const label = this.props.label;

		if(label.t !== time) {
			label.t = time;
			this.onChanged();
		}
	}

	onChanged() {
		this.props.owner.onLabelChange(this.props.label);
	}

	onLabelMouseDown(ev) {
		let tl = this.props.owner.props.node._timelineData;
		let name = this.props.labelName;
		if(ev.buttons === 2) {
			editor.ui.modal.showQuestion('Label removing', 'Delete Label "' + name + '"?', () => {
				delete tl.l[name];
				this.onChanged();
			}, R.span(null, R.icon('delete'), ' Delete'));
		
			sp(ev);
		} else {
			this.onMouseDown(ev);
		}
	}

	static renormalizeLabel(label, movieclip) { //re find keyframes for modified label
		label.n = movieclip._timelineData.f.map((fieldTimeline) => {
			return MovieClip._findNextKeyframe(fieldTimeline.t, label.t - 1);
		});
		MovieClip.invalidateSerializeCache(movieclip);
	}
	
	static renormalizeAllLabels(movieclip) {
		for(let key in movieclip._timelineData.l) {
			if(!movieclip._timelineData.l.hasOwnProperty(key)) continue;
			TimeLabel.renormalizeLabel(movieclip._timelineData.l[key], movieclip);
		}
	}
	
	static askForLabelName(existingLabelsNames, title, defaultName = '') {
		return editor.ui.modal.showPrompt(title, defaultName, undefined, (nameToCheck) => {
			if(existingLabelsNames.indexOf(nameToCheck) >= 0) {
				return 'Label with that name already exists.';
			}
		});
	}

	onDoubleClick  (ev) { //rename label by double click
		let tl = this.props.owner.props.node._timelineData;
		let label = this.props.label;
		let name = this.props.labelName;

		TimeLabel.askForLabelName(this.props.labelsNamesList, "Rename label", name).then((enteredName) => {
			if(enteredName) {
				tl.l[enteredName] = label;
				delete tl.l[name];
				this.onChanged();
			}
		});
		sp(ev);
	}

	render () {

		let className = 'timeline-label';
		if(this.state && this.state.isSelected) {
			className += ' timeline-label-selected';
		}

		let label = this.props.label;
		let name = this.props.labelName;
		
		return R.div({className, style:{left: label.t * this.props.owner.props.widthZoom},
			onMouseDown: this.onLabelMouseDown,
			onDoubleClick: this.onDoubleClick
		},
		name
		);
	}
}
