
interface TimelineSelectable {
	onDraggableMouseDown: (ev: PointerEvent) => void;
	getTime(): number;
	setTime(time: number): void;
}

export type { TimelineSelectable };

