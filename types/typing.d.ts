// modules
declare module "roughjs/bundled/rough.esm";

type Point = { x: number; y: number; x0?: number; y0?: number };
type Dim = { w: number; h: number };

type funcDebounceProps = {
	funcs: (() => void)[];
	delay: number;
};

type logFnOptions = {
	name?: string;
	tag?: string;
	log?: boolean;
	spreadArgs?: boolean;
};

type logFnProps = {
	func: (...args: any[]) => any;
	options?: logFnOptions;
};

type logOptions = {
	tag?: string;
	log?: boolean;
	spread?: boolean;
};

type logProps = {
	vals: any | any[] | { key: string; val: any }[];
	options?: logOptions;
};

// useWindowResize
type WindowSize = { innerWidth: number; innerHeight: number };

type TestLines = {
	startPoint: Point;
	currentPoint: Point;
};

type DetectLine = {
	lines: TestLines[];
	mousePoint: Point;
};

type DetectPoint = {
	point: Point;
	mousePoint: Point;
};

type DetectInsideBox = {
	tl: Point;
	br: Point;
	mousePoint: Point;
};

type Distance = {
	a: Point;
	b: Point;
};

declare namespace Rough {
	type Action = DrawFunc | SelectFunc;
	type ActionHistory = DrawProps | EditProps;
	type ActionDraw = "line" | "rect" | "ellipse";
	type ActionShortcuts = "undo" | "redo";
	type CanvasActions = ActionDraw | "select";
	type SelectActions = "move" | "resize" | "rotate";

	type DrawFunc = ({}: Draw) => DrawProps[];

	type Draw = {
		action: Rough.ActionDraw;
		rc: import("roughjs/bin/canvas").RoughCanvas;
		ctx?: CanvasRenderingContext2D;
		currentPoint: Point;
		startPoint: Point;
		gen: import("roughjs/bin/generator").RoughGenerator;
		options?: {
			seed?: number;
			stroke?: string;
			strokeWidth?: number;
			preserveVertices?: boolean;
			curveFitting?: number;
		};
	};

	type DrawProps = {
		id: string;
		action: Rough.ActionDraw;
		startPoint: Point;
		currentDim: Dim;
		options?: {
			seed?: number;
			stroke?: string;
			strokeWidth?: number;
		};
	};

	type SelectFunc = ({}: Select) => SelectProps;

	type Select = {
		history: Rough.ActionHistory[][];
		selectedElements: Rough.ActionHistory[];
		multiSelectBox: Rough.Points;
		mousePoint: Point;
		isShift: boolean;
	};

	type SelectProps = { elts: null | Rough.DrawProps[]; action: type };

	type DetectBoundaryTransparentNoSelectedElements = {
		elt: Rough.DrawProps;
		mousePoint: Point;
	};

	type DetectBoundarySingleSelectedElement = {
		history: Rough.ActionHistory[][];
		selectedElements: Rough.ActionHistory[];
		mousePoint: Point;
	};

	type DetectBoundaryMultiSelectedElements = {
		selectedElements: Rough.ActionHistory[];
		multiSelectBox: Rough.Points;
		mousePoint: Point;
	};

	type DetectBoundaryAndSelectionShift = {
		history: Rough.ActionHistory[][];
		selectedElements: Rough.ActionHistory[];
		multiSelectBox: Rough.Points;
		mousePoint: Point;
	};

	type EditProps = {
		id: string;
		action: "move";
		options?: {
			seed?: number;
			stroke?: string;
			strokeWidth?: number;
		};
	} & {
		newStartPoint: Point;
		startPoint: Point;
		newDim?: Dim;
		currentDim?: Dim;
	} & {
		newStartPoint?: Point;
		startPoint?: Point;
		newDim: Dim;
		currentDim: Dim;
	} & { newStartPoint: Point; startPoint: Point; newDim: Dim; currentDim: Dim };

	type Points = {
		startPoint: Point;
		currentPoint: Point;
	};

	type UndoRedoHandler = {
		action: Rough.ActionShortcuts;
		condition: boolean;
		newIndex: number;
		actionIndex: number;
	};

	type BoundingPoints = {
		bl?: Point;
		tr?: Point;
		br: Point;
		tl: Point;
	};
}
