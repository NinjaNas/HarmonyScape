import { Drawable } from "roughjs/bin/core";
import {
	LINE_TOLERANCE,
	CIRCLE_TOLERANCE,
	IS_LOG,
	LOG_TAG,
	FN_TAG,
	RESIZE_RADIUS,
	RESIZE_COLOR,
	RESIZE_FILL_COLOR,
	BOUNDING_OFFSET
} from "@constants/canvasConstants";

export function draw({ history, action, rc, gen, startPoint, currentPoint, options }: Rough.Draw) {
	const dim: Dim = {
		w: currentPoint.x - startPoint.x,
		h: currentPoint.y - startPoint.y
	};
	const currentDim: Dim = dim;

	const drawable: Drawable = (() => {
		switch (action as Rough.ActionDraw) {
			case "line":
				return gen.line(startPoint.x, startPoint.y, currentPoint.x, currentPoint.y, options);

			case "rect":
				return gen.rectangle(startPoint.x, startPoint.y, dim.w, dim.h, options);

			case "ellipse":
				const x = (currentPoint.x + startPoint.x) / 2;
				const y = (currentPoint.y + startPoint.y) / 2;

				let center: Point = { x, y };
				startPoint = center;
				return gen.ellipse(center.x, center.y, dim.w, dim.h, options);
		}
	})();

	rc.draw(drawable);
	return [
		{
			id: history.reduce((currentCount, row) => currentCount + row.length, 0),
			action,
			startPoint,
			currentDim,
			options
		}
	];
}

export const detectBoundary = ({
	history,
	selectedElements,
	multiSelectBox,
	index,
	mousePoint
}: Rough.Select) => {
	if (selectedElements.length <= 1) {
		return detectBoundarySingleSelectedElement({
			history,
			index,
			mousePoint,
			selectedElements
		});
	} else {
		return detectBoundaryMultiSelectedElements({
			multiSelectBox,
			mousePoint,
			selectedElements
		});
	}
};

const detectBoundaryTransparentNoSelectedElements = ({
	elt,
	mousePoint
}: Rough.DetectBoundaryTransparentNoSelectedElements) => {
	let eltArr: Rough.ActionHistory[] = [];
	// center is used for calculating the ellipse
	const { action, startPoint: center, currentDim } = elt;
	const { startPoint, currentPoint } = calcPoints(elt);

	const flag = (() => {
		switch (action as Rough.ActionDraw) {
			case "line": {
				return detectLine({
					lines: [{ startPoint, currentPoint }],
					mousePoint
				});
			}
			case "rect": {
				const tr: Point = { x: currentPoint.x, y: startPoint.y };
				const bl: Point = { x: startPoint.x, y: currentPoint.y };

				return detectLine({
					lines: [
						{ startPoint, currentPoint: tr },
						{ startPoint, currentPoint: bl },
						{ startPoint: tr, currentPoint },
						{ startPoint: bl, currentPoint }
					],
					mousePoint
				});
			}
			case "ellipse": {
				//https://www.geeksforgeeks.org/check-if-a-point-is-inside-outside-or-on-the-ellipse/#
				const { x, y }: Point = center;
				const { w, h }: Dim = currentDim;
				let a, b, theta;

				if (w > h) {
					a = w / 2;
					b = h / 2;
					theta = 0; // Major axis is horizontal
				} else {
					a = h / 2;
					b = w / 2;
					theta = Math.PI / 2; // Major axis is vertical
				}

				const distance =
					Math.pow((mousePoint.x - x) * Math.cos(theta) + (mousePoint.y - y) * Math.sin(theta), 2) /
						Math.pow(a, 2) +
					Math.pow((mousePoint.x - x) * Math.sin(theta) - (mousePoint.y - y) * Math.cos(theta), 2) /
						Math.pow(b, 2);
				return Math.abs(distance - 1) < CIRCLE_TOLERANCE;
			}
		}
	})();

	eltArr = flag ? [...eltArr, elt] : eltArr;

	// only return one element
	return { elts: eltArr.length ? eltArr[0] : null, action: "move" };
};

const detectBoundarySingleSelectedElement = ({
	history,
	selectedElements,
	index,
	mousePoint
}: Rough.DetectBoundarySingleSelectedElement) => {
	let eltArr: Rough.ActionHistory[] = [];
	for (const elts of history.slice(0, index)) {
		for (const elt of elts) {
			if (elt.action === "move") continue;
			if (selectedElements.length && selectedElements.some(prevElt => prevElt.id === elt.id)) {
				const { action } = elt;
				const { startPoint, currentPoint } = calcPoints(elt);

				const flag = (() => {
					switch (action as Rough.ActionDraw) {
						case "line": {
							return detectLine({
								lines: [{ startPoint, currentPoint }],
								mousePoint
							});
						}
						case "rect": {
							return detectInsideBox({ tl: startPoint, br: currentPoint, mousePoint });
						}
						case "ellipse": {
							return detectInsideBox({ tl: startPoint, br: currentPoint, mousePoint });
						}
					}
				})();

				eltArr = flag ? [...eltArr, elt] : eltArr;
			} else {
				// use this detection if no elts in selectedElements or the elt isn't in selectElements
				// later add conditional for detect non-transparent elements
				const retVal = detectBoundaryTransparentNoSelectedElements({ elt, mousePoint });
				eltArr = retVal.elts ? [...eltArr, retVal.elts] : eltArr;
			}
		}
	}
	// only return one element
	return { elts: eltArr.length ? eltArr[0] : null, action: "move" };
};

const detectBoundaryMultiSelectedElements = ({
	multiSelectBox,
	selectedElements,
	mousePoint
}: Rough.DetectBoundaryMultiSelectedElements) => {
	const flag = detectInsideBox({
		tl: multiSelectBox.startPoint,
		br: multiSelectBox.currentPoint,
		mousePoint
	});
	// return selectElements if inside multi bounding box
	return { elts: flag ? selectedElements : null, action: "move" };
};

const detectInsideBox = ({ tl, br, mousePoint }: DetectInsideBox) => {
	if (
		mousePoint.x >= tl.x - BOUNDING_OFFSET &&
		mousePoint.x <= br.x + BOUNDING_OFFSET &&
		mousePoint.y <= br.y + BOUNDING_OFFSET &&
		mousePoint.y >= tl.y - BOUNDING_OFFSET
	) {
		return true;
	}

	return false;
};

const detectLine = ({ lines, mousePoint }: DetectLine) => {
	let flag = false;

	for (const { startPoint, currentPoint } of lines) {
		const offset =
			distance({ a: startPoint, b: currentPoint }) -
			(distance({ a: startPoint, b: mousePoint }) + distance({ a: currentPoint, b: mousePoint }));

		flag = flag || Math.abs(offset) < LINE_TOLERANCE;
	}
	return flag;
};

const distance = ({ a, b }: Distance) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

// calculate consistent start and currentPoints for shapes
export const calcPoints = ({ action, startPoint, currentDim }: Rough.ActionHistory) => {
	return (() => {
		switch (action as Rough.ActionDraw) {
			case "line": {
				const currentPoint: Point = {
					x: currentDim.w + startPoint.x,
					y: currentDim.h + startPoint.y
				};

				// deep copy
				const start: Point = { x: startPoint.x, y: startPoint.y };

				return { startPoint: start, currentPoint };
			}
			case "rect": {
				const currentPoint: Point = {
					x: currentDim.w + startPoint.x,
					y: currentDim.h + startPoint.y
				};

				// deep copy
				const start: Point = { x: startPoint.x, y: startPoint.y };

				return { startPoint: start, currentPoint };
			}
			case "ellipse": {
				const start: Point = {
					x: startPoint.x - currentDim.w / 2,
					y: startPoint.y - currentDim.h / 2
				};
				const currentPoint: Point = {
					x: startPoint.x + currentDim.w / 2,
					y: startPoint.y + currentDim.h / 2
				};
				return { startPoint: start, currentPoint };
			}
		}
	})();
};

export const drawSelection = (ctx: CanvasRenderingContext2D, elt: Rough.ActionHistory) => {
	const { startPoint, currentPoint }: Rough.Points = calcPoints(elt);
	switch (elt.action) {
		case "line": {
			drawSelectionHelper(ctx, { tl: startPoint, br: currentPoint }, false);
			break;
		}
		case "rect": {
			drawBoxHelper(ctx, startPoint, {
				w: currentPoint.x - startPoint.x,
				h: currentPoint.y - startPoint.y
			});
			drawSelectionHelper(ctx, {
				tl: startPoint,
				br: currentPoint,
				bl: { x: startPoint.x, y: currentPoint.y },
				tr: { x: currentPoint.x, y: startPoint.y }
			});
			break;
		}
		case "ellipse": {
			drawBoxHelper(ctx, startPoint, {
				w: currentPoint.x - startPoint.x,
				h: currentPoint.y - startPoint.y
			});
			drawSelectionHelper(ctx, {
				tl: startPoint,
				br: currentPoint,
				bl: { x: startPoint.x, y: currentPoint.y },
				tr: { x: currentPoint.x, y: startPoint.y }
			});
			break;
		}
	}
};

export const drawMultiSelection = (
	ctx: CanvasRenderingContext2D,
	{ startPoint, currentPoint }: Rough.Points
) => {
	drawBoxHelper(ctx, startPoint, {
		w: currentPoint.x - startPoint.x,
		h: currentPoint.y - startPoint.y
	});
	drawSelectionHelper(ctx, {
		tl: startPoint,
		br: currentPoint,
		bl: { x: startPoint.x, y: currentPoint.y },
		tr: { x: currentPoint.x, y: startPoint.y }
	});
};

const drawSelectionHelper = (
	ctx: CanvasRenderingContext2D,
	{ bl, tr, br, tl }: Rough.BoundingPoints,
	offsetBool = true
) => {
	const offset = offsetBool ? BOUNDING_OFFSET : 0;
	ctx.lineWidth = 3;
	ctx.fillStyle = RESIZE_FILL_COLOR;
	ctx.strokeStyle = RESIZE_COLOR;

	drawCircleHelper(ctx, { x: tl.x - offset, y: tl.y - offset });

	drawCircleHelper(ctx, { x: br.x + offset, y: br.y + offset });

	if (tr) {
		drawCircleHelper(ctx, { x: tr.x + offset, y: tr.y - offset });
	}

	if (bl) {
		drawCircleHelper(ctx, { x: bl.x - offset, y: bl.y + offset });
	}
};

const drawCircleHelper = (ctx: CanvasRenderingContext2D, startPoint: Point) => {
	ctx.beginPath();
	ctx.arc(startPoint.x, startPoint.y, RESIZE_RADIUS, 0, 2 * Math.PI);
	ctx.closePath();
	ctx.stroke();
	ctx.fill();
};

const drawBoxHelper = (ctx: CanvasRenderingContext2D, startPoint: Point, currentDim: Dim) => {
	ctx.lineWidth = 0.7;
	ctx.strokeRect(
		startPoint.x - BOUNDING_OFFSET,
		startPoint.y - BOUNDING_OFFSET,
		currentDim.w + BOUNDING_OFFSET * 2,
		currentDim.h + BOUNDING_OFFSET * 2
	);
};

export const getRandomInt = (min: number, max: number) => {
	min = Math.ceil(min);
	max = Math.floor(max);
	// The maximum is exclusive and the minimum is inclusive
	return Math.floor(Math.random() * (max - min) + min);
};

// logs the func name and args along with a tag, Ex: [Tag] fn: name, args: []
// when spreadArgs is true, args will be spread out using the spread operator
export function logFn({
	func,
	options: { name = func.name, tag = FN_TAG, log = IS_LOG, spreadArgs = true } = {
		name: func.name,
		tag: FN_TAG,
		log: IS_LOG,
		spreadArgs: true
	}
}: logFnProps) {
	return function (...args: any[]) {
		if (log) {
			if (args.length) {
				console.info(
					`%c%s%c fn%c: %s, %cargs%c:%o`,
					"color: deepskyblue; font-weight: bold;",
					`${tag ? `[${tag}]` : ""}`,
					"color: coral;",
					"color: lightgray;",
					name,
					"color: coral;",
					"color: lightgray;",
					...(spreadArgs ? [...args] : [args])
				);
			} else {
				console.info(
					`%c%s%c fn%c: %s`,
					"color: deepskyblue; font-weight: bold;",
					`${tag ? `[${tag}]` : ""}`,
					"color: coral;",
					"color: lightgray;",
					name
				);
			}
		}
		try {
			return func(...args);
		} catch (error) {
			console.error(name, error);
			throw error;
		}
	};
}

// logs any object(s) along with a tag and an optional key/value pair, Ex: [Tag] key: value, value
// when spread is true, if values are an array of object that array will be spread out
export function log({
	vals,
	options: { tag = LOG_TAG, log = IS_LOG, spread = true } = {
		tag: LOG_TAG,
		log: IS_LOG,
		spread: true
	}
}: logProps) {
	if (!log) return;
	let tokens = "";
	let formattedVals: any[] = [];
	if (
		Array.isArray(vals) &&
		(vals.some(val => typeof val === "object" && "key" in val && "val" in val) || spread) &&
		vals.length
	) {
		vals.forEach((val: any) => {
			if (typeof val === "object" && "key" in val && "val" in val) {
				// remove extra space from object but not from anything else
				typeof val.val === "object" ? (tokens += "%c%s%c:%o, ") : (tokens += "%c%s%c: %s, ");
				formattedVals.push("color: coral;", val.key, "color: lightgray;", val.val);
			} else if (typeof val === "object" && spread && val.length) {
				val.forEach((val: any) => {
					tokens += "%c%o, ";
					formattedVals.push("color: lightgray;", val);
				});
			} else {
				tokens += "%c%o, ";
				formattedVals.push("color: lightgray;", val);
			}
		});
		// remove trailing whitespace and comma
		tokens = tokens.trim().replace(/,$/, "");
	} else {
		tokens += "%c%o";
		formattedVals = ["color: lightgray;", vals];
	}
	console.info(`%c[%s] ${tokens}`, "color: deepskyblue; font-weight: bold;", tag, ...formattedVals);
}
