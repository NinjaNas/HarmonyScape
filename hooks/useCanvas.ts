import { useEffect, useRef, useState } from "react";
import { RoughCanvas } from "roughjs/bin/canvas";
import { Drawable } from "roughjs/bin/core";
import rough from "roughjs/bundled/rough.esm";

export const useCanvas = (onAction: {
  func: null | Rough.Action;
  type: string;
}) => {
  console.log("render canvas ref");

  const MIN_SCALE: number = 0.2;
  const MAX_SCALE: number = 5;
  const ZOOM_OUT_FACTOR: number = 0.9;
  const ZOOM_IN_FACTOR: number = 1.1;
  const LINE_TOLERANCE: number = 1;
  const CIRCLE_TOLERANCE: number = 0.052;

  const [history, setHistory] = useState<Rough.ActionHistory[]>([]);
  const [index, setIndex] = useState<number>(0);
  const [origin, setOrigin] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [selectedElement, setSelectedElement] =
    useState<null | Rough.ActionHistory>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<null | CanvasRenderingContext2D>(null);
  const roughRef = useRef<null | RoughCanvas>(null);
  const currentDrawActionRef = useRef<null | Rough.ActionHistory>(null);
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
        switch (onAction.type) {
          case "select":
            const { flag, elt } = detectBoundary(history, point);
            if (flag) {
              console.log("clicked on object!");
              console.log(elt);
              setIsMoving(true);
              setSelectedElement(elt);
            }
            break;
          case "line":
          case "rect":
          case "circle":
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
    for (let elt of history.slice(0, index)) {
      let drawable: Drawable;
      const { action, startPoint, currentDim, options } =
        elt as Rough.DrawProps;

      switch (action) {
        case "line":
          drawable = gen.line(
            startPoint.x,
            startPoint.y,
            currentDim.w + startPoint.x,
            currentDim.h + startPoint.y,
            options
          );
          break;
        case "rect":
          drawable = gen.rectangle(
            startPoint.x,
            startPoint.y,
            currentDim.w,
            currentDim.h,
            options
          );
          break;
        case "circle":
          drawable = gen.ellipse(
            startPoint.x,
            startPoint.y,
            currentDim.w,
            currentDim.h,
            options
          );
          break;
      }
      roughRef.current.draw(drawable!);
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

  const detectBoundary = (
    history: Rough.ActionHistory[],
    mousePoint: Point
  ) => {
    let flag: boolean = false;

    for (let elt of history.slice(0, index)) {
      const {
        action,
        startPoint: { x, y },
        currentDim,
      } = elt;

      switch (action) {
        case "line":
          const currentPoint: Point = {
            x: currentDim.w + x,
            y: currentDim.h + y,
          };
          flag = detectLine({ x, y }, currentPoint, mousePoint);
          break;
        case "rect": {
          const { w, h } = currentDim;
          const tr: Point = { x: x + w, y };
          const bl: Point = { x, y: y + h };
          const br: Point = {
            x: x + w,
            y: y + h,
          };

          flag =
            detectLine({ x, y }, tr, mousePoint) ||
            detectLine({ x, y }, bl, mousePoint) ||
            detectLine(tr, br, mousePoint) ||
            detectLine(bl, br, mousePoint);
          break;
        }
        case "circle":
          const { w, h } = currentDim;
          const a = w / 2;
          const b = h / 2;

          const equation =
            (mousePoint.x - x) ** 2 / a ** 2 + (mousePoint.y - y) ** 2 / b ** 2;
          flag = Math.abs(equation - 1) < CIRCLE_TOLERANCE;
          console.log(Math.abs(equation - 1));
          break;
      }
      if (flag) return { flag, elt };
    }
    return { flag, elt: null };
  };

  const detectLine = (
    startPoint: Point,
    endPoint: Point,
    mousePoint: Point
  ) => {
    const offset =
      distance(startPoint, endPoint) -
      (distance(startPoint, mousePoint) + distance(endPoint, mousePoint));
    return Math.abs(offset) < LINE_TOLERANCE;
  };

  const distance = (a: Point, b: Point) =>
    Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

  // on mount
  useEffect(() => {
    // prevent default ctrl+wheel
    const wheelHandler = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", wheelHandler, { passive: false });

    return () => {
      window.removeEventListener("wheel", wheelHandler);
    };
  }, []);

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

      streamActions();

      // startingPoint can be null, if it is set currentPoint as the starting point
      const startPoint = startingPointRef.current ?? currentPoint;

      if (isDrawing && onAction.func) {
        currentDrawActionRef.current = {
          ...onAction.func({
            action: onAction.type,
            rc: roughRef.current!,
            ctx: ctxRef.current!,
            startPoint,
            currentPoint,
            gen,
            options: {
              seed: getRandomInt(1, 2 ** 31),
            },
          }),
          id: index,
        };
      } else if (isPanning) {
        const offsetX = (currentPoint.x0 - startPoint.x0!) / scale;
        const offsetY = (currentPoint.y0 - startPoint.y0!) / scale;

        ctxRef.current!.translate(offsetX, offsetY);
        setOrigin(({ x, y }) => ({
          x: x - offsetX,
          y: y - offsetY,
        }));

        // update startingPoint to be anchored to the cursor's position
        startingPointRef.current = currentPoint;
      } else if (isMoving && selectedElement && startingPointRef.current) {
        const { id, startPoint, currentDim } = selectedElement;
        const offsetX = startingPointRef.current.x - startPoint.x;
        const offsetY = startingPointRef.current.y - startPoint.y;

        setHistory(
          history.map((prevElt) =>
            prevElt.id === id
              ? {
                  ...prevElt,
                  // offset so mouse stays in the same place
                  startPoint: {
                    x: currentPoint.x - offsetX,
                    y: currentPoint.y - offsetY,
                  },
                  currentProp: {
                    x: currentPoint.x + currentDim.w - offsetX,
                    y: currentPoint.y + currentDim.h - offsetY,
                  },
                }
              : prevElt
          )
        );
      }
    };

    const mouseUpHandler = () => {
      // reset state
      setIsDrawing(false);
      setIsPanning(false);
      setIsMoving(false);
      setSelectedElement(null);

      // add current action to history
      if (!currentDrawActionRef.current) return;
      setHistory((prevHistory) => {
        return [...prevHistory.slice(0, index), currentDrawActionRef.current!];
      });

      setIndex((i) => i + 1);
    };

    // setup Mouse Handler
    canvasRef.current.addEventListener("mousemove", mouseMoveHandler);
    window.addEventListener("mouseup", mouseUpHandler);

    // cleanup Mouse Handler before unmount and rerender if dependencies change
    return () => {
      canvasRef.current!.removeEventListener("mousemove", mouseMoveHandler);
      window.removeEventListener("mouseup", mouseUpHandler);
    };
  }, [isDrawing, isPanning, isMoving, history, index, scale, origin]);

  // update mouse cursor on canvas mouseMove while mouse is not down
  useEffect(() => {
    if (!canvasRef.current || !(onAction.type === "select")) return;

    const mouseMoveHandler = (e: MouseEvent) => {
      const currentPoint = computePointInCanvas(e);
      if (!currentPoint || !e.target) return;
      (e.target as HTMLElement).style.cursor = detectBoundary(
        history,
        currentPoint
      ).flag
        ? "move"
        : "default";
    };
    canvasRef.current.addEventListener("mousemove", mouseMoveHandler);
    return () => {
      canvasRef.current!.removeEventListener("mousemove", mouseMoveHandler);
    };
  }, [onAction, history, index]);

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
  }, [history, scale, origin, index]);

  // undo/redo
  useEffect(() => {
    console.log("effect undo/redo");
    const onPressedHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        index > 0 && setIndex((i) => i - 1);
      } else if (
        (e.ctrlKey && e.key === "y") ||
        (e.metaKey && e.shiftKey && e.key === "z")
      ) {
        index < history.length && setIndex((i) => i + 1);
      }
    };

    window.addEventListener("keydown", onPressedHandler);

    return () => {
      window.removeEventListener("keydown", onPressedHandler);
    };
  }, [index]);

  return { canvasRef, mouseDownHandler, onWheelHandler };
};
