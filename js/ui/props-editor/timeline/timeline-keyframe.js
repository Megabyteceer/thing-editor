const keyframesClasses = [
	'timeline-keyframe-smooth',
	'timeline-keyframe-linear',
	'timeline-keyframe-discrete',
	'timeline-keyframe-jump-floor',
	'timeline-keyframe-jump-roof'
];



export default class TimelineKeyframe extends React.Component {



	render() {
		const keyFrame = this.props.keyFrame;

		let loopArrow;
		const isSelected = this.state && this.state.isSelected;
		const p = this.props.owner.props.owner.props.owner.props;
		const width = p.widthZoom;
		const height = p.heightZoom - 16;
		if(keyFrame.j !== keyFrame.t) {
			let len = Math.abs(keyFrame.j - keyFrame.t);
			len *= width;

			let className = 'loop-arrow';
			if(keyFrame.j > keyFrame.t) {
				className += ' loop-arrow-front';
			}

			loopArrow = R.svg({className, height:11, width:len},
				R.polyline({points:'0,0 6,6 3,8 0,0 6,9 '+(len/2)+',10 '+(len-3)+',7 '+len+',0'})
			);
		}
		let className = 'timeline-keyframe ' + keyframesClasses[keyFrame.m];
		if(isSelected) {
			className += ' timeline-keyframe-selected';
		}
		
		let mark;
		if(keyFrame.hasOwnProperty('a')) {
			
			mark = (keyFrame.a === 'this.stop') ? '■' : 'A';
		}
		
		return R.div({className:className,
			style:{height, width: (width < 8) ? 8 : width, left:keyFrame.t * width}},
		mark,
		loopArrow
		);
	}
}