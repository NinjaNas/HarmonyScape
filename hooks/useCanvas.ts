import { useEffect, useRef, useState } from "react";
import { RoughCanvas } from "roughjs/bin/canvas";
import rough from "roughjs/bundled/rough.esm";
import { KeyComboEvent, bindKeyCombo, unbindKeyCombo } from "@rwh/keystrokes";

export const useCanvas = (onAction: Rough.Action) => {
  console.log("render canvas ref");

  const MIN_SCALE: number = 0.2;
  const MAX_SCALE: number = 5;
  const ZOOM_OUT_FACTOR: number = 0.9;
  const ZOOM_IN_FACTOR: number = 1.1;

  const [history, setHistory] = useState<Rough.ActionHistory[]>([]);
  const [index, setIndex] = useState<number>(0);
  const [origin, setOrigin] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(1);
  const [mouseDown, setMouseDown] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<null | CanvasRenderingContext2D>(null);
  const roughRef = useRef<null | RoughCanvas>(null);
  const currentActionRef = useRef<null | Rough.ActionHistory>(null);
  const startingPointRef = useRef<null | Point>(null);

  const gen = rough.generator();

  console.log(history);
  console.log(index);

  const mouseDownHandler = (
    e: React.MouseEvent<HTMLCanvasElement, MouseEvent>
  ) => {
    console.log("mousedown");
    // left: 0, middle: 1, right: 2
    switch (e.button) {
      case 0:
        setMouseDown(true);
        const point = computePointInCanvas(e.nativeEvent);
        if (!point) return;
        startingPointRef.current = point;
        break;
      case 1:
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

      ctxRef.current.clearRect(
        origin.x,
        origin.y,
        window.innerWidth / scale,
        window.innerHeight / scale
      );

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
      let drawable;

      switch (elt.action) {
        case "line":
          let { startPoint, currentPoint, options } =
            elt as Rough.DrawLineProps;

          drawable = gen.line(
            startPoint.x,
            startPoint.y,
            currentPoint.x,
            currentPoint.y,
            options
          );

          break;
      }
      roughRef.current.draw(drawable);
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
    console.log(`${x0}, ${y0}, ${x}, ${y}`);
    return { x0, y0, x, y };
  };

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
  }, [mouseDown]);

  // drawEffect for mouseDown/mouseMove/mouseUp
  useEffect(() => {
    console.log("effect up/move");
    if (
      !mouseDown ||
      !canvasRef.current ||
      !ctxRef.current ||
      !roughRef.current
    )
      return;

    const mouseMoveHandler = (e: MouseEvent) => {
      let currentPoint = computePointInCanvas(e);
      if (!currentPoint) return;

      streamActions();

      // startingPoint can be null, if it is set currentPoint as the starting point
      let startPoint = startingPointRef.current ?? currentPoint;

      currentActionRef.current = onAction({
        rc: roughRef.current!,
        ctx: ctxRef.current!,
        startPoint,
        currentPoint,
        gen,
      });
    };

    const mouseUpHandler = () => {
      // reset state
      setMouseDown(false);
      startingPointRef.current = null;

      // add current action to history
      setHistory((prevHistory) => {
        if (!currentActionRef.current) return [...prevHistory.slice(0, index)];
        return [...prevHistory.slice(0, index), currentActionRef.current!];
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
  }, [mouseDown, history, index, scale, origin]);

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

  // useEffect(() => {
  //   const onPressedHandler = (e: KeyComboEvent<KeyboardEvent>) => {
  //     // undo and redo
  //     if (!roughRef.current) return;
  //     console.log(e.keyCombo);
  //     switch (e.keyCombo) {
  //       case "control+z":
  //         index > 0 && setIndex((i) => i - 1);
  //         break;
  //       case "control+y":
  //         index < history.length && setIndex((i) => i + 1);
  //         break;
  //     }
  //     console.log(index);
  //   };

  //   streamActions();

  //   bindKeyCombo("control+z", {
  //     onPressed: onPressedHandler,
  //   });
  //   bindKeyCombo("control+y", {
  //     onPressed: onPressedHandler,
  //   });

  //   return () => {
  //     unbindKeyCombo("control+z");
  //     unbindKeyCombo("control+y");
  //   };
  // }, [index]);

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
