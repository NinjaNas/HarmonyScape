import { drawSelection } from "@functions/canvasActionFunctions";
import { useEffect, useRef, useState } from "react";
import { RoughCanvas } from "roughjs/bin/canvas";
import { Drawable } from "roughjs/bin/core";
import rough from "roughjs/bundled/rough.esm";
import {
  MIN_SCALE,
  MAX_SCALE,
  ZOOM_IN_FACTOR,
  ZOOM_OUT_FACTOR,
} from "@constants/canvasConstants";

export const useCanvas = (onAction: {
  func: null | Rough.Action;
  type: string;
}) => {
  console.log("render canvas ref");

  const [history, setHistory] = useState<Rough.ActionHistory[][]>([]);
  const [index, setIndex] = useState<number>(0); // index is the length of states in history
  const [origin, setOrigin] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [selectedElements, setSelectedElements] = useState<
    Rough.ActionHistory[]
  >([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<null | CanvasRenderingContext2D>(null);
  const roughRef = useRef<null | RoughCanvas>(null);
  const currentDrawActionRef = useRef<null | Rough.ActionHistory[]>(null);
  const currentSelectActionRef = useRef<null | {
    newStartPoint?: Point;
    newDim?: Dim;
  }>(null);
  const startingPointRef = useRef<null | Point>(null);

  const gen = rough.generator();

  console.log(history);
  console.log(index);

  const mouseDownHandler = (
    e: React.MouseEvent<HTMLCanvasElement, MouseEvent>
  ) => {
    console.log("mousedown");

    const point = computePointInCanvas(e.nativeEvent);
    if (!point) return;
    startingPointRef.current = point;

    // left: 0, middle: 1, right: 2
    switch (e.button) {
      case 0:
        switch (onAction.type as Rough.CanvasActions) {
          case "select":
            // null or multiple element array
            const { elts, action } = (onAction.func as Rough.SelectFunc)({
              history,
              mousePoint: point,
              index,
            });
            console.log(elts);
            if (!elts && !e.shiftKey) {
              setSelectedElements([]);
            } else if (!elts && e.shiftKey) {
              break;
            } else {
              switch (action as Rough.SelectActions) {
                case "move":
                  setIsMoving(true);
                  break;
              }
              e.shiftKey
                ? setSelectedElements((prevElts) => [...prevElts, ...elts!])
                : setSelectedElements(elts!);
            }
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
  };

  // scroll and ctrl+wheel zoom
  const onWheelHandler = (e: React.WheelEvent<HTMLCanvasElement>) => {
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
      setScale((scale) => scale * zoom);

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
  };

  // render all previous actions (origin/scale/history/index)
  const streamActions = () => {
    console.log("streamActions");
    if (!ctxRef.current || !roughRef.current) return;

    // clear canvas
    ctxRef.current.clearRect(
      origin.x,
      origin.y,
      window.innerWidth / scale,
      window.innerHeight / scale
    );

    // for each element up to current index redraw that action
    for (const elts of history.slice(0, index)) {
      for (const { action, startPoint, currentDim, options } of elts) {
        if (!startPoint || !currentDim) continue;

        const drawable: Drawable = (() => {
          switch (action as Rough.ActionDraw) {
            case "line":
              return gen.line(
                startPoint.x,
                startPoint.y,
                currentDim.w + startPoint.x,
                currentDim.h + startPoint.y,
                options
              );
            case "rect":
              return gen.rectangle(
                startPoint.x,
                startPoint.y,
                currentDim.w,
                currentDim.h,
                options
              );
            case "ellipse":
              return gen.ellipse(
                startPoint.x,
                startPoint.y,
                currentDim.w,
                currentDim.h,
                options
              );
          }
        })();

        roughRef.current.draw(drawable);
      }
      // draw selection box on selectElements
      // get the updated element from history
      for (const elt of selectedElements) {
        history.forEach((prevElts) =>
          prevElts.forEach(
            (prevElt) =>
              prevElt.action !== "move" &&
              prevElt.id === elt.id &&
              drawSelection(ctxRef.current!, prevElt)
          )
        );
      }
    }
  };

  // Compute relative points in canvas (origin/scale)
  const computePointInCanvas = (e: MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    // implies origin is (0, 0) and scale is 1
    // mouse position on the screen and window is affected by scale
    const x0 = e.clientX - rect.left;
    const y0 = e.clientY - rect.top;
    const x = origin.x + x0 / scale;
    const y = origin.y + y0 / scale;
    if (!(onAction.type === "select")) {
      console.log(`${x0}, ${y0}, ${x}, ${y}`);
    }
    return { x0, y0, x, y };
  };

  const getRandomInt = (min: number, max: number) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    // The maximum is exclusive and the minimum is inclusive
    return Math.floor(Math.random() * (max - min) + min);
  };

  // update canvasRefs upon mouseDown
  useEffect(() => {
    if (!canvasRef.current) return;

    ctxRef.current = canvasRef.current.getContext("2d");
    if (!ctxRef.current) return;

    roughRef.current = rough.canvas(canvasRef.current);
    if (!roughRef.current) return;
  }, [isDrawing]);

  // reset draw action on history update
  useEffect(() => {
    currentDrawActionRef.current = null;
  }, [history]);

  // reset select action on seletedElements update
  useEffect(() => {
    currentSelectActionRef.current = null;
  }, [selectedElements]);

  useEffect(() => {
    setSelectedElements([]);
  }, [onAction.type]);

  // drawEffect for mouseDown/mouseMove/mouseUp
  useEffect(() => {
    console.log("effect up/move");
    if (
      !(
        (isDrawing || isPanning || isMoving) &&
        canvasRef.current &&
        ctxRef.current &&
        roughRef.current
      )
    )
      return;

    const mouseMoveHandler = (e: MouseEvent) => {
      const currentPoint = computePointInCanvas(e);
      if (!currentPoint) return;

      // startingPoint can be null, if it is set currentPoint as the starting point
      const startPoint = startingPointRef.current ?? currentPoint;

      streamActions();

      if (isDrawing && onAction.func) {
        drawing({ startPoint, currentPoint });
      } else if (isPanning) {
        panning({ startPoint, currentPoint });
      } else if (isMoving && startingPointRef.current) {
        movingObj({ startPoint, currentPoint });
      }
    };

    const drawing = ({ startPoint, currentPoint }: Rough.Points) => {
      currentDrawActionRef.current = [
        {
          ...(onAction.func as Rough.DrawFunc)({
            history,
            action: onAction.type as Rough.ActionDraw,
            rc: roughRef.current!,
            ctx: ctxRef.current!,
            startPoint: { x: startPoint.x, y: startPoint.y },
            currentPoint: { x: currentPoint.x, y: currentPoint.y },
            gen,
            options: {
              seed: getRandomInt(1, 2 ** 31),
              preserveVertices: false, // randomize end points of lines, default: false
              curveFitting: 0.99, // error margin for curve, 1 is a perfect curve, default: .95
            },
          }),
        },
      ];
    };

    const panning = ({ startPoint, currentPoint }: Rough.Points) => {
      if (
        !currentPoint.x0 ||
        !currentPoint.y0 ||
        !startPoint.x0 ||
        !startPoint.y0
      )
        return;

      const offset = {
        x: (currentPoint.x0 - startPoint.x0) / scale,
        y: (currentPoint.y0 - startPoint.y0) / scale,
      };

      ctxRef.current!.translate(offset.x, offset.y);
      setOrigin(({ x, y }) => ({
        x: x - offset.x,
        y: y - offset.y,
      }));

      // update startingPoint to be anchored to the cursor's position
      startingPointRef.current = currentPoint;
    };

    const movingObj = ({ currentPoint }: Rough.Points) => {
      for (const { id, startPoint } of selectedElements) {
        if (!startingPointRef.current) return;
        const offset = {
          x: startingPointRef.current.x - startPoint.x,
          y: startingPointRef.current.y - startPoint.y,
        };
        const newStartPoint = {
          x: currentPoint.x - offset.x,
          y: currentPoint.y - offset.y,
        };
        currentSelectActionRef.current = {
          newStartPoint,
        };

        setHistory(
          history.map((prevElts) =>
            prevElts.map((prevElt) =>
              // note that canvas elts and move actions have the same id to reference each other
              prevElt.action !== "move" && prevElt.id === id
                ? {
                    ...prevElt,
                    // offset so mouse stays in the same place
                    startPoint: newStartPoint,
                  }
                : prevElt
            )
          )
        );
      }
    };

    const mouseUpHandler = () => {
      // reset state
      setIsDrawing(false);
      setIsPanning(false);
      setIsMoving(false);

      // add current action to history
      if (currentDrawActionRef.current) {
        drawingSave();
      } else if (currentSelectActionRef.current && selectedElements.length) {
        movingSave();
      }
    };

    const drawingSave = () => {
      if (!currentDrawActionRef.current) return;
      setHistory((prevHistory) => {
        return [...prevHistory.slice(0, index), currentDrawActionRef.current!];
      });
      setIndex((i) => i + 1);
    };

    const movingSave = () => {
      // move elements, go through all selectedElements, store necessary props in history
      if (!currentSelectActionRef.current) return;
      const necessaryMoveProps = selectedElements.map(
        (prevProp) =>
          ({
            id: prevProp.id,
            action: "move",
            startPoint: prevProp.startPoint,
            newStartPoint: currentSelectActionRef.current!.newStartPoint,
          }) as Rough.EditProps
      );

      setHistory((prevHistory) => {
        return [...prevHistory.slice(0, index), necessaryMoveProps];
      });
      setIndex((i) => i + 1);
    };

    // setup Mouse Handler
    canvasRef.current.addEventListener("mousemove", mouseMoveHandler);
    window.addEventListener("mouseup", mouseUpHandler);

    // cleanup Mouse Handler before unmount and rerender if dependencies change
    return () => {
      if (canvasRef.current) {
        canvasRef.current.removeEventListener("mousemove", mouseMoveHandler);
      }
      window.removeEventListener("mouseup", mouseUpHandler);
    };
  }, [
    isDrawing,
    isPanning,
    isMoving,
    history,
    index,
    scale,
    origin,
    selectedElements,
  ]);

  // update mouse cursor on canvas mouseMove while mouse is not down
  useEffect(() => {
    console.log("effect cursor style");
    if (!canvasRef.current || !(onAction.type === "select")) return;

    const mouseMoveHandler = (e: MouseEvent) => {
      const currentPoint = computePointInCanvas(e);
      if (!currentPoint || !e.target || !ctxRef.current) return;
      (e.target as HTMLElement).style.cursor = (
        onAction.func as Rough.SelectFunc
      )({
        history,
        mousePoint: currentPoint,
        index,
      })
        ? "move"
        : "default";
    };
    canvasRef.current.addEventListener("mousemove", mouseMoveHandler);
    return () => {
      if (canvasRef.current) {
        canvasRef.current.removeEventListener("mousemove", mouseMoveHandler);
      }
    };
  }, [onAction, history, index, origin, scale]);

  useEffect(() => {
    console.log("effect resize");

    // persist canvas state on resize
    const resizeHandler = () => {
      if (!ctxRef.current) return;
      // persist state because on resize removes canvasRef state
      ctxRef.current.scale(scale, scale);
      ctxRef.current.translate(-origin.x, -origin.y);
      streamActions();
    };

    window.addEventListener("resize", resizeHandler);

    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, [history, index, scale, origin]);

  // redraw canvas
  useEffect(() => {
    console.log("effect redraw");
    streamActions();
  }, [history, scale, origin, index, selectedElements]);

  // undo/redo
  useEffect(() => {
    console.log("effect undo/redo");

    const undoRedoHandler = ({
      action,
      condition,
      newIndex,
      actionIndex,
    }: Rough.UndoRedoHandler) => {
      if (condition) {
        // if there is a move action at current index, pass props to canvas elt to undo action
        for (const props of history[actionIndex]!) {
          if (props && props.action === "move") {
            const { nextStartPoint, nextDim } = (() => {
              switch (action as Rough.ActionShortcuts) {
                case "undo":
                  return {
                    nextStartPoint: props.startPoint,
                    nextDim: props.currentDim,
                  };
                case "redo":
                  return {
                    nextStartPoint: (props as Rough.EditProps).newStartPoint,
                    nextDim: (props as Rough.EditProps).newDim,
                  };
              }
            })();

            setHistory(
              history.map((prevHistory) =>
                prevHistory.map((prevElts) =>
                  // note that canvas elts and move actions have the same id to reference each other
                  prevElts.action !== "move" && props.id === prevElts.id
                    ? {
                        ...prevElts,
                        ...(nextStartPoint && {
                          startPoint: nextStartPoint,
                        }),
                        ...(nextDim && {
                          currentDim: nextDim,
                        }),
                      }
                    : prevElts
                )
              )
            );
          }
        }
        setIndex(newIndex);
      }
    };

    const onPressedHandler = (e: KeyboardEvent) => {
      const undo = {
        action: "undo" as Rough.ActionShortcuts,
        condition: index > 0,
        newIndex: index - 1,
        actionIndex: index - 1,
      };

      const redo = {
        action: "redo" as Rough.ActionShortcuts,
        condition: index < history.length,
        newIndex: index + 1,
        actionIndex: index,
      };

      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        undoRedoHandler(undo);
      } else if (
        (e.ctrlKey && e.key === "y") ||
        (e.metaKey && e.shiftKey && e.key === "z")
      ) {
        undoRedoHandler(redo);
      }
    };

    window.addEventListener("keydown", onPressedHandler);

    return () => {
      window.removeEventListener("keydown", onPressedHandler);
    };
  }, [history, index]);

  return { canvasRef, mouseDownHandler, onWheelHandler };
};
