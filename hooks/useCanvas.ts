/* eslint-disable react-hooks/exhaustive-deps */
import rough from "roughjs/bundled/rough.esm";
import { RoughCanvas } from "roughjs/bin/canvas";
import { Drawable } from "roughjs/bin/core";
import {
	calcPoints,
	drawMultiSelection,
	drawSelection,
	getRandomInt,
	log,
	logFn
} from "@functions/canvasActionFunctions";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShortcuts } from "@hooks/useShortcuts";
import {
	MIN_SCALE,
	MAX_SCALE,
	ZOOM_IN_FACTOR,
	ZOOM_OUT_FACTOR,
	DELAY,
	GEN,
	GLOBAL_ZOOM,
	RESIZE_COLOR
} from "@constants/canvasConstants";

export const useCanvas = (onAction: { func: null | Rough.Action; type: string }) => {
	const { isUndo, isUndoMac, isRedo, isRedoMac, isShift } = useShortcuts();
	const [history, setHistory] = useState<Rough.ActionHistory[][]>([]);
	const [index, setIndex] = useState<number>(0); // index is the length of states in history
	const [origin, setOrigin] = useState<Point>({ x: 0, y: 0 });
	const [scale, setScale] = useState<number>(1);
	const [isDrawing, setIsDrawing] = useState<boolean>(false);
	const [isPanning, setIsPanning] = useState<boolean>(false);
	const [isMoving, setIsMoving] = useState<boolean>(false);
	const [isMultiSelect, setIsMultiSelect] = useState<boolean>(false);
	const [selectedElements, setSelectedElements] = useState<Rough.ActionHistory[]>([]);
	const [multiSelectBox, setMultiSelectBox] = useState<Rough.Points>({
		startPoint: { x: 0, y: 0 },
		currentPoint: { x: 0, y: 0 }
	});

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const ctxRef = useRef<null | CanvasRenderingContext2D>(null);
	const roughRef = useRef<null | RoughCanvas>(null);
	const currentDrawActionRef = useRef<null | Rough.ActionHistory[]>(null);
	const currentMultiSelectBoxRef = useRef<Rough.Points>({
		startPoint: { x: 0, y: 0 },
		currentPoint: { x: 0, y: 0 }
	});
	const currentMouseMultiSelectRef = useRef<null | Point>(null);
	const currentMoveActionRef = useRef<{ [id: string]: Point }>({});
	const startingPointRef = useRef<null | Point>(null);
	const historyRef = useRef(history);
	const indexRef = useRef(index);

	log({ vals: "useCanvas.tsx", options: { tag: "Render" } });
	log({
		vals: [{ key: "size", val: index }, history],
		options: { tag: "History", log: true, spread: false }
	});
	log({
		vals: [
			{ key: "index", val: selectedElements.length },
			selectedElements,
			{ key: "isMulti", val: isMultiSelect },
			{ key: "isMove", val: isMoving },
			{ key: "moveRef", val: currentMoveActionRef.current },
			{
				key: "multiStart",
				val: multiSelectBox.startPoint
			},
			{
				key: "multiCurrent",
				val: multiSelectBox.currentPoint
			}
		],
		options: { tag: "Selected", spread: false, log: true }
	});

	const calcBoundingBox = useCallback(
		logFn({
			options: { name: "calcBoundingBox", tag: "Helper" },
			func: () => {
				if (!selectedElements.length) return;

				let minX;
				let minY;
				let maxX;
				let maxY;

				for (const prevElt of selectedElements) {
					const e = calcPoints(prevElt);
					if (!minX || !minY || !maxX || !maxY) {
						minX = e.startPoint.x;
						minY = e.startPoint.y;
						maxX = e.currentPoint.x;
						maxY = e.currentPoint.y;
					} else {
						minX = Math.min(minX, e.startPoint.x);
						minY = Math.min(minY, e.startPoint.y);
						maxX = Math.max(maxX, e.currentPoint.x);
						maxY = Math.max(maxY, e.currentPoint.y);
					}
				}

				if (!minX || !minY || !maxX || !maxY) return;

				setMultiSelectBox({
					startPoint: {
						x: minX,
						y: minY
					},
					currentPoint: {
						x: maxX,
						y: maxY
					}
				});
				currentMultiSelectBoxRef.current = {
					startPoint: {
						x: minX,
						y: minY
					},
					currentPoint: {
						x: maxX,
						y: maxY
					}
				};
			}
		}),
		[selectedElements]
	);

	const selectHelper = logFn({
		options: { name: "selectHelper", tag: "Helper" },
		func: ({ point }: { point: Point }) => {
			// null or multiple element array
			const { elts, action } = (onAction.func as Rough.SelectFunc)({
				history: history.slice(0, index),
				selectedElements,
				multiSelectBox,
				mousePoint: point
			});
			if (elts) {
				switch (action as Rough.SelectActions) {
					case "move":
						setIsMultiSelect(false);
						// if shiftKey unique selectElements are added, else add one elt
						if (isShift) {
							setSelectedElements(prevElts => {
								const ids = new Set(prevElts.map(i => i.id));
								return [...prevElts, ...[elts!].filter(i => !ids.has(i.id))];
							});
						} else if (elts && selectedElements.length > 1) {
						} else {
							setSelectedElements([elts!]);
						}
						setIsMoving(true);
						break;
				}
			} else if (!elts && !isShift) {
				setSelectedElements([]);
				setIsMultiSelect(true);
			}
		}
	});

	const mouseDownHandler = logFn({
		options: { name: "mouseDown" },
		func: (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
			const point = computePointInCanvas(e.nativeEvent);
			if (!point) return;
			startingPointRef.current = point;

			// left: 0, middle: 1, right: 2
			switch (e.button) {
				case 0:
					switch (onAction.type as Rough.CanvasActions) {
						case "select":
							selectHelper({ e, point });
							break;
						case "line":
						case "rect":
						case "ellipse":
							setIsDrawing(true);
							break;
					}
					break;
				case 1:
					e.preventDefault();
					setIsPanning(true);
					break;
				case 2:
					break;
			}
		}
	});

	// scroll and ctrl+wheel zoom
	const onWheelHandler = logFn({
		options: { name: "onWheel" },
		func: (e: React.WheelEvent<HTMLCanvasElement>) => {
			if (!canvasRef.current || !ctxRef.current) return;
			// if ctrl+wheel, else wheel
			if (e.ctrlKey) {
				const cursor = computePointInCanvas(e.nativeEvent);
				if (!cursor) return;

				let zoom: number;
				const isScrollingDown = e.deltaY > 0;

				if (isScrollingDown) {
					// if past min scale, stop zoom else zoom out
					zoom = scale <= MIN_SCALE ? 1 : ZOOM_OUT_FACTOR;
				} else {
					// if past max scale, stop zoom else zoom in
					zoom = scale >= MAX_SCALE ? 1 : ZOOM_IN_FACTOR;
				}

				// move to current origin
				ctxRef.current.translate(origin.x, origin.y);

				// calculate offset to keep cursor at the same coords in the new canvas
				// delta = -(cursor location in new scale - cursor location in old scale +
				// scrollOffset in new scale - scrollOffset in old scale)
				origin.x -= cursor.x0 / (scale * zoom) - cursor.x0 / scale;
				origin.y -= cursor.y0 / (scale * zoom) - cursor.y0 / scale;

				// update state
				setOrigin({ x: origin.x, y: origin.y });
				setScale(scale => scale * zoom);

				// if zoom = .5 then canvas size is doubled making objects appear half as large
				// if zoom = 2 them canvas size is halved making objects appear double in size
				ctxRef.current.scale(zoom, zoom);

				// if canvas corner and origin is (0,0) and translate(100, 100)
				// then after canvas corner is (-100, -100) and (100, 100) becomes the origin (0,0)
				// translates canvas corner so cursor is on the same coord in the new canvas
				ctxRef.current.translate(-origin.x, -origin.y);
			} else {
				ctxRef.current.translate(-e.deltaX, -e.deltaY);
				setOrigin(({ x, y }) => ({ x: x + e.deltaX, y: y + e.deltaY }));
			}
		}
	});

	const streamSelectActions = useCallback(
		logFn({
			options: { name: "streamSelectActions", log: false, tag: "Helper" },
			func: () => {
				if (!ctxRef.current) return;
				// draw selection box on selectElements
				// get the updated element from history
				// we have to parse history to get the current position as selectedElements only saves onMouseup
				if (selectedElements.length === 1) {
					for (const elt of selectedElements) {
						history.forEach(prevElts =>
							prevElts.forEach(
								prevElt =>
									prevElt.action !== "move" &&
									prevElt.id === elt.id &&
									drawSelection(ctxRef.current!, prevElt) // prevElt is shallow
							)
						);
					}
				} else if (selectedElements.length > 1) {
					drawMultiSelection(ctxRef.current, multiSelectBox);
				}
			}
		}),
		[history, selectedElements, multiSelectBox.currentPoint, multiSelectBox.startPoint]
	);

	// render all previous actions (origin/scale/history/index)
	const streamActions = useCallback(
		logFn({
			options: { name: "streamActions", log: false, tag: "Helper" },
			func: () => {
				if (!ctxRef.current || !roughRef.current) return;

				// clear canvas
				ctxRef.current.clearRect(
					origin.x,
					origin.y,
					(window.innerWidth * GLOBAL_ZOOM) / scale,
					(window.innerHeight * GLOBAL_ZOOM) / scale
				);

				// for each element up to current index redraw that action
				for (const elts of history.slice(0, index)) {
					for (const { action, startPoint, currentDim, options } of elts) {
						if (!startPoint || !currentDim) continue;

						const drawable: Drawable = (() => {
							switch (action as Rough.ActionDraw) {
								case "line":
									return GEN.line(
										startPoint.x, // startPoint
										startPoint.y,
										currentDim.w + startPoint.x, // currentPoint
										currentDim.h + startPoint.y,
										options
									);
								case "rect":
									return GEN.rectangle(
										startPoint.x, // startPoint
										startPoint.y,
										currentDim.w, // width & height
										currentDim.h,
										options
									);
								case "ellipse":
									return GEN.ellipse(
										startPoint.x, // center
										startPoint.y,
										currentDim.w, // width & height
										currentDim.h,
										options
									);
							}
						})();

						roughRef.current.draw(drawable);
					}
				}
				// draw bounding box on element
				streamSelectActions();

				// draw temporary mouse selection box
				if (isMultiSelect && startingPointRef.current && currentMouseMultiSelectRef.current) {
					ctxRef.current.globalAlpha = 0.1;
					ctxRef.current.fillStyle = RESIZE_COLOR;
					ctxRef.current.fillRect(
						startingPointRef.current.x,
						startingPointRef.current.y,
						currentMouseMultiSelectRef.current.x - startingPointRef.current.x,
						currentMouseMultiSelectRef.current.y - startingPointRef.current.y
					);
					ctxRef.current.globalAlpha = 1;
					ctxRef.current.lineWidth = 1.5;
					ctxRef.current.strokeRect(
						startingPointRef.current.x,
						startingPointRef.current.y,
						currentMouseMultiSelectRef.current.x - startingPointRef.current.x,
						currentMouseMultiSelectRef.current.y - startingPointRef.current.y
					);
					ctxRef.current.lineWidth = 1;
				}
			}
		}),
		[history, index, origin.x, origin.y, scale, streamSelectActions, isMultiSelect]
	);

	// Compute relative points in canvas (origin/scale)
	const computePointInCanvas = useCallback(
		logFn({
			options: { name: "computePoint", log: false, tag: "Helper" },
			func: (e: MouseEvent) => {
				if (!canvasRef.current) return;

				const rect = canvasRef.current.getBoundingClientRect();
				// implies origin is (0, 0) and scale is 1
				// mouse position on the screen and window is affected by scale
				const x0 = e.clientX - rect.left;
				const y0 = e.clientY - rect.top;
				const x = origin.x + x0 / scale;
				const y = origin.y + y0 / scale;
				if (!(onAction.type === "select")) {
					log({
						vals: `${x0}, ${y0}, ${x}, ${y}`,
						options: { tag: "Coordinates" }
					});
				}
				return { x0, y0, x, y };
			}
		}),
		[onAction.type, origin.x, origin.y, scale]
	);

	// update canvasRefs upon mouseDown
	useEffect(() => {
		log({ vals: "update canvasRefs" });
		if (!canvasRef.current) return;

		ctxRef.current = canvasRef.current.getContext("2d");
		if (!ctxRef.current) return;

		roughRef.current = rough.canvas(canvasRef.current);
		if (!roughRef.current) return;
	}, [isDrawing]);

	// reset draw action on history update
	useEffect(() => {
		log({
			vals: "reset drawActionRef",
			options: { log: false }
		});
		currentDrawActionRef.current = null;
	}, [history]);

	// reset select action on seletedElements update
	useEffect(() => {
		log({
			vals: "reset moveActionRef",
			options: { log: false }
		});
		currentMoveActionRef.current = {};
	}, [selectedElements]);

	useEffect(() => {
		log({
			vals: "reset selectedElements",
			options: { log: false }
		});
		setSelectedElements([]);
	}, [onAction.type]);

	const drawing = useCallback(
		logFn({
			options: { name: "drawing", log: false, tag: "Helper" },
			func: ({ startPoint, currentPoint }: Rough.Points) => {
				currentDrawActionRef.current = [
					...(onAction.func as Rough.DrawFunc)({
						history: history.slice(0, index),
						action: onAction.type as Rough.ActionDraw,
						rc: roughRef.current!,
						ctx: ctxRef.current!,
						startPoint: { x: startPoint.x, y: startPoint.y },
						currentPoint: { x: currentPoint.x, y: currentPoint.y },
						gen: GEN,
						options: {
							seed: getRandomInt(1, 2 ** 31),
							preserveVertices: false, // randomize end points of lines, default: false
							curveFitting: 0.99 // error margin for curve, 1 is a perfect curve, default: .95
						}
					})
				];
			}
		}),
		[history, onAction.func, onAction.type]
	);

	const panning = useCallback(
		logFn({
			options: { name: "panning", tag: "Helper" },
			func: ({ startPoint, currentPoint }: Rough.Points) => {
				if (!currentPoint.x0 || !currentPoint.y0 || !startPoint.x0 || !startPoint.y0) return;

				const offset = {
					x: (currentPoint.x0 - startPoint.x0) / scale,
					y: (currentPoint.y0 - startPoint.y0) / scale
				};

				ctxRef.current!.translate(offset.x, offset.y);
				setOrigin(({ x, y }) => ({
					x: x - offset.x,
					y: y - offset.y
				}));

				// update startingPoint to be anchored to the cursor's position
				startingPointRef.current = currentPoint;
			}
		}),
		[scale]
	);

	const movingObj = useCallback(
		logFn({
			options: { name: "movingObj", tag: "Helper", log: true },
			func: ({ currentPoint }: Rough.Points) => {
				if (!startingPointRef.current) return;
				let newHistory = [...history];

				for (const { id, startPoint } of selectedElements) {
					const offset = {
						x: startingPointRef.current.x - startPoint.x,
						y: startingPointRef.current.y - startPoint.y
					};

					const newStartPoint = {
						x: currentPoint.x - offset.x,
						y: currentPoint.y - offset.y
					};

					currentMoveActionRef.current[id] = newStartPoint;

					newHistory = newHistory.map(prevHistory =>
						prevHistory.map(prevElt =>
							// note that canvas elts and move actions have the same id to reference each other
							prevElt.action !== "move" && prevElt.id === id
								? {
										...prevElt,
										// offset so mouse stays in the same place
										startPoint: newStartPoint
								  }
								: prevElt
						)
					);
				}
				setHistory(newHistory);
				// update multiselect bounding box
				if (currentMultiSelectBoxRef.current) {
					const offsetX = startingPointRef.current.x - currentPoint.x;
					const offsetY = startingPointRef.current.y - currentPoint.y;

					setMultiSelectBox({
						startPoint: {
							x: currentMultiSelectBoxRef.current.startPoint.x - offsetX,
							y: currentMultiSelectBoxRef.current.startPoint.y - offsetY
						},
						currentPoint: {
							x: currentMultiSelectBoxRef.current.currentPoint.x - offsetX,
							y: currentMultiSelectBoxRef.current.currentPoint.y - offsetY
						}
					});
				}
			}
		}),
		[history, selectedElements]
	);

	const multiSelect = useCallback(
		({ startPoint, currentPoint }: Rough.Points) => {
			// calculate the minimum and maximum x and y values
			const minX = Math.min(startPoint.x, currentPoint.x);
			const maxX = Math.max(startPoint.x, currentPoint.x);
			const minY = Math.min(startPoint.y, currentPoint.y);
			const maxY = Math.max(startPoint.y, currentPoint.y);
			let newSelectedElements: Rough.ActionHistory[] = [];
			history.slice(0, index).forEach(prevHistory =>
				prevHistory.forEach(prevElt => {
					if (prevElt.action !== "move") {
						// warning!!! prevElt is shallow, make sure calcPoints sends back unreferenced values
						const e = calcPoints(prevElt);
						if (
							minX <= e.startPoint.x &&
							minY <= e.startPoint.y &&
							maxX >= e.currentPoint.x &&
							maxY >= e.currentPoint.y
						) {
							// warning!!! prevElt is shallow, changing values in newSelectedElements will change history
							newSelectedElements.push(prevElt);
						}
					}
				})
			);

			// pass currentPoint to ref to be used in streamActions
			currentMouseMultiSelectRef.current = currentPoint;

			// set elements in selection
			setSelectedElements(newSelectedElements);
		},
		[history]
	);

	const mouseMoveHandler = useCallback(
		logFn({
			options: { name: "mouseMove", log: false },
			func: (e: MouseEvent) => {
				const currentPoint = computePointInCanvas(e);
				if (!currentPoint) return;

				// startingPoint can be null, if it is set currentPoint as the starting point
				const startPoint = startingPointRef.current ?? currentPoint;

				streamActions();

				if (isDrawing && onAction.func) {
					drawing({ startPoint, currentPoint });
				} else if (isPanning) {
					panning({ startPoint, currentPoint });
				} else if (isMoving) {
					movingObj({ startPoint, currentPoint });
				} else if (isMultiSelect) {
					multiSelect({ startPoint, currentPoint });
				}
			}
		}),
		[
			computePointInCanvas,
			drawing,
			isDrawing,
			isMoving,
			isPanning,
			isMultiSelect,
			movingObj,
			onAction.func,
			panning,
			streamActions,
			multiSelect
		]
	);

	// adjust coordinates so default startPoint is bottom left
	const adjustCoords = useCallback(
		logFn({
			options: { name: "adjustCoords", tag: "Helper" },
			func: (elts: Rough.ActionHistory[]) => {
				for (const elt of elts) {
					// force default startPoint to bottom left respectively
					switch (elt.action as Rough.ActionDraw) {
						case "line":
							// need to allow y to be negative or positive
							if (elt.currentDim.w < 0 || (elt.currentDim.w === 0 && elt.currentDim.h < 0)) {
								elt.startPoint.x += elt.currentDim.w;
								elt.startPoint.y += elt.currentDim.h;
								elt.currentDim.w = -elt.currentDim.w;
								elt.currentDim.h = -elt.currentDim.h;
							}
							break;
						case "rect":
							if (elt.currentDim.w < 0) {
								elt.startPoint.x += elt.currentDim.w;
								elt.currentDim.w = -elt.currentDim.w;
							}
							if (elt.currentDim.h < 0) {
								elt.startPoint.y += elt.currentDim.h;
								elt.currentDim.h = -elt.currentDim.h;
							}
							break;
						case "ellipse":
							if (elt.currentDim.w < 0) {
								elt.currentDim.w = Math.abs(elt.currentDim.w);
							}
							if (elt.currentDim.h < 0) {
								elt.currentDim.h = Math.abs(elt.currentDim.h);
							}
							break;
					}
				}
				return elts;
			}
		}),
		[]
	);

	const drawingSave = useCallback(
		logFn({
			options: { name: "drawingSave", tag: "Helper" },
			func: () => {
				if (!currentDrawActionRef.current) return;
				setHistory(prevHistory => {
					return [...prevHistory.slice(0, index), adjustCoords(currentDrawActionRef.current!)];
				});
				setIndex(i => i + 1);
			}
		}),
		[index]
	);

	const movingSave = useCallback(
		logFn({
			options: { name: "movingSave", tag: "Helper", log: true },
			func: () => {
				// move elements, go through all selectedElements, store necessary props in history
				if (!currentMoveActionRef.current) return;
				const necessaryMoveProps = selectedElements
					.filter(prevProp => {
						// only include elements that have been moved
						const newStartPoint = currentMoveActionRef.current[prevProp.id];
						return (
							newStartPoint &&
							(newStartPoint.x !== prevProp.startPoint.x ||
								newStartPoint.y !== prevProp.startPoint.y)
						);
					})
					.map(
						prevProp =>
							// enough data to undo and redo an element by giving it either the old or new startPoint
							({
								id: prevProp.id,
								action: "move",
								startPoint: prevProp.startPoint,
								newStartPoint: currentMoveActionRef.current[prevProp.id]
							}) as Rough.EditProps
					);
				// if necessaryMoveProps is empty then nothing has changed
				if (necessaryMoveProps.length) {
					setHistory(prevHistory => {
						return [...prevHistory.slice(0, index), necessaryMoveProps];
					});

					// update selectedElement if currentMoveActionRef exists with the latest startPoint
					setSelectedElements(prevSelected =>
						prevSelected.map(
							prevElt =>
								({
									...prevElt,
									...(currentMoveActionRef.current[prevElt.id] && {
										startPoint: currentMoveActionRef.current[prevElt.id]
									})
								}) as Rough.EditProps
						)
					);
					setIndex(i => i + 1);
				}
			}
		}),
		[index, selectedElements]
	);

	const mouseUpHandler = useCallback(
		logFn({
			options: { name: "mouseUp" },
			func: () => {
				// reset state
				setIsDrawing(false);
				setIsPanning(false);
				setIsMoving(false);
				setIsMultiSelect(false);

				// update so multiselect bounding box stays accurate
				currentMultiSelectBoxRef.current = multiSelectBox;

				// set null so temporary bounding box is reset
				currentMouseMultiSelectRef.current = null;

				// add current action to history
				if (currentDrawActionRef.current) {
					drawingSave();
				} else if (Object.keys(currentMoveActionRef.current).length && selectedElements.length) {
					// save move actions for undo/redo
					movingSave();
				}
			}
		}),
		[
			drawingSave,
			movingSave,
			selectedElements.length,
			multiSelectBox.currentPoint,
			multiSelectBox.startPoint
		]
	);

	// drawEffect for mouseDown/mouseMove/mouseUp
	useEffect(() => {
		log({ vals: "mouseUp | mouseMove" });
		if (
			!(
				(isDrawing || isPanning || isMoving || isMultiSelect) &&
				canvasRef.current &&
				ctxRef.current &&
				roughRef.current
			)
		)
			return;

		const canvas = canvasRef.current;

		// setup Mouse Handler
		canvas.addEventListener("mousemove", mouseMoveHandler);
		window.addEventListener("mouseup", mouseUpHandler);

		// cleanup Mouse Handler before unmount and rerender if dependencies change
		return () => {
			canvas.removeEventListener("mousemove", mouseMoveHandler);
			window.removeEventListener("mouseup", mouseUpHandler);
		};
	}, [isDrawing, isMoving, isPanning, isMultiSelect, mouseMoveHandler, mouseUpHandler]);

	const mouseStyleHandler = useCallback(
		logFn({
			options: { name: "mouseStyle", log: false },
			func: (e: MouseEvent) => {
				if (!e.target || !ctxRef.current) return;

				if (onAction.type === "select") {
					const currentPoint = computePointInCanvas(e);
					if (!currentPoint) return;
					(e.target as HTMLElement).style.cursor = (onAction.func as Rough.SelectFunc)({
						history: history.slice(0, index),
						selectedElements,
						multiSelectBox,
						mousePoint: currentPoint
					}).elts
						? "move"
						: "default";
				} else {
					(e.target as HTMLElement).style.cursor = "default";
				}
			}
		}),
		[
			computePointInCanvas,
			history,
			index,
			onAction.func,
			onAction.type,
			selectedElements,
			multiSelectBox
		]
	);

	// update mouse cursor on canvas mouseMove while mouse is not down
	useEffect(() => {
		log({ vals: "mouseStyle" });
		if (!canvasRef.current) return;
		const canvas = canvasRef.current;

		canvas.addEventListener("mousemove", mouseStyleHandler);
		return () => {
			canvas.removeEventListener("mousemove", mouseStyleHandler);
		};
	}, [mouseStyleHandler]);

	// persist canvas state on resize
	const resizeHandler = useCallback(
		logFn({
			options: { name: "resize" },
			func: () => {
				if (!ctxRef.current) return;
				// // persist state because on resize removes canvasRef state
				ctxRef.current.scale(scale, scale);
				ctxRef.current.translate(-origin.x, -origin.y);
				streamActions();
			}
		}),
		[origin, scale, streamActions]
	);

	useEffect(() => {
		log({ vals: "resize" });
		window.addEventListener("resize", resizeHandler);

		return () => {
			window.removeEventListener("resize", resizeHandler);
		};
	}, [resizeHandler]);

	// redraw canvas
	useEffect(() => {
		log({ vals: "streamActions" });
		streamActions();
	}, [streamActions]);

	useEffect(() => {
		calcBoundingBox();
		currentMoveActionRef.current = {};
	}, [calcBoundingBox]);

	useEffect(() => {
		log({ vals: "history/index latest ref" });
		indexRef.current = index;
		historyRef.current = history;
	}, [index, history]);

	const undoRedoHandler = useCallback(
		logFn({
			options: { name: "undo | redo" },
			func: (actionString: Rough.ActionShortcuts) => {
				const { action, condition, actionIndex, newIndex } = (() => {
					switch (actionString) {
						case "undo": {
							return {
								action: "undo" as Rough.ActionShortcuts,
								condition: indexRef.current > 0,
								newIndex: indexRef.current - 1,
								actionIndex: indexRef.current - 1
							};
						}
						case "redo": {
							return {
								action: "redo" as Rough.ActionShortcuts,
								condition: indexRef.current < historyRef.current.length,
								newIndex: indexRef.current + 1,
								actionIndex: indexRef.current
							};
						}
					}
				})();

				if (condition) {
					let newHistory = [...historyRef.current];
					// if there is a move action at current index, pass props to canvas elt to undo action
					for (const props of historyRef.current[actionIndex]!) {
						if (props && props.action === "move") {
							const { nextStartPoint, nextDim } = (() => {
								switch (action as Rough.ActionShortcuts) {
									case "undo":
										return {
											nextStartPoint: props.startPoint,
											nextDim: props.currentDim
										};
									case "redo":
										return {
											nextStartPoint: (props as Rough.EditProps).newStartPoint,
											nextDim: (props as Rough.EditProps).newDim
										};
								}
							})();

							newHistory = newHistory.map(prevHistory =>
								prevHistory.map(prevElts =>
									// note that canvas elts and move actions have the same id to reference each other
									prevElts.action !== "move" && props.id === prevElts.id
										? {
												...prevElts,
												...(nextStartPoint && {
													startPoint: nextStartPoint
												}),
												...(nextDim && {
													currentDim: nextDim
												})
										  }
										: prevElts
								)
							);
						}
					}
					setHistory(newHistory);
					setIndex(newIndex);
				}
			}
		}),
		[]
	);

	const funcDebounce = useCallback(
		logFn({
			options: { tag: "Helper", name: "debounce" },
			func: ({ funcs, delay }: funcDebounceProps) => {
				// perform the action immediately
				funcs.forEach(fn => fn());
				// then perform the action at an interval
				const intervalId = setInterval(() => {
					funcs.forEach(fn => fn());
				}, delay); // Adjust this value to control the delay

				// clear the interval when the component unmounts or when isUndo changes
				return () => clearInterval(intervalId);
			}
		}),
		[]
	);

	// undo/redo
	useEffect(() => {
		log({ vals: "undo" });

		if (isUndo || isUndoMac) {
			const cleanup = funcDebounce({
				funcs: [() => undoRedoHandler("undo"), () => setSelectedElements([])],
				delay: DELAY
			});
			// called later by useEffect
			return cleanup;
		}
	}, [funcDebounce, isUndo, isUndoMac, undoRedoHandler]);

	useEffect(() => {
		log({ vals: "redo" });

		if (isRedo || isRedoMac) {
			const cleanup = funcDebounce({
				funcs: [() => undoRedoHandler("redo"), () => setSelectedElements([])],
				delay: DELAY
			});
			// called later by useEffect
			return cleanup;
		}
	}, [funcDebounce, isRedo, isRedoMac, undoRedoHandler]);

	return { canvasRef, mouseDownHandler, onWheelHandler };
};
