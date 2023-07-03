import { useEffect, useRef, useState } from "react";
import { RoughCanvas } from "roughjs/bin/canvas";
import rough from "roughjs/bundled/rough.esm";
import { KeyComboEvent, bindKeyCombo, unbindKeyCombo } from "@rwh/keystrokes";

export const useCanvas = (onAction: Rough.Action) => {
  console.log("render canvas ref");
  const [history, setHistory] = useState<Rough.ActionHistory[]>([]);
  const [index, setIndex] = useState<number>(0);
  const [origin, setOrigin] = useState<Point>({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roughRef = useRef<null | RoughCanvas>(null);
  const currentActionRef = useRef<null | Rough.ActionHistory>(null);
  const startingPoint = useRef<null | Point>(null);

  const gen = rough.generator();
  console.log(history);
  console.log(index);

  const [mouseDown, setMouseDown] = useState<boolean>(false);

  const mouseDownHandler = (
    e: React.MouseEvent<HTMLCanvasElement, MouseEvent>
  ) => {
    console.log("mousedown");
    const btn = e.button;
    // left: 0, middle: 1, right: 2
    switch (btn) {
      case 0:
        setMouseDown(true);
        const point = computePointInCanvas(e.nativeEvent);
        if (!point) return;
        startingPoint.current = point;
        break;
      case 1:
        break;
      case 2:
        break;
    }
  };
  const onWheelHandler = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (e.ctrlKey) {
      const cursor = computePointInCanvas(e.nativeEvent);
      if (!cursor) return;
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      let zoom: number;

      if (scale <= 0.2) {
        zoom = e.deltaY > 0 ? 1 : 1.1;
      } else if (scale >= 5) {
        zoom = e.deltaY > 0 ? 0.9 : 1;
      } else {
        zoom = e.deltaY > 0 ? 0.9 : 1.1;
      }

      ctx.clearRect(
        origin.x,
        origin.y,
        window.innerWidth / scale,
        window.innerHeight / scale
      );

      // move to current origin
      ctx.translate(origin.x, origin.y);

      // calculate offset to keep cursor at the same coords in the new canvas
      // delta = -(cursor location in new scale - cursor location in old scale +
      // scrollOffset in new scale - scrollOffset in old scale)
      origin.x -=
        cursor.x0 / (scale * zoom) -
        cursor.x0 / scale +
        scrollOffset.x / (scale * zoom) -
        scrollOffset.x / scale;
      origin.y -=
        cursor.y0 / (scale * zoom) -
        cursor.y0 / scale +
        scrollOffset.y / (scale * zoom) -
        scrollOffset.y / scale;

      // update state
      setOrigin({ x: origin.x, y: origin.y });
      setScale((s) => s * zoom);

      // if zoom = .5 then canvas size is doubled making objects appear half as large
      // if zoom = 2 them canvas size is halved making objects appear double in size
      ctx.scale(zoom, zoom);

      // if canvas corner and origin is (0,0) and translate(100, 100)
      // then after canvas corner is (-100, -100) and (100, 100) becomes the origin (0,0)
      // translates canvas corner so cursor is on the same coord in the new canvas
      ctx.translate(-origin.x, -origin.y);

      if (!roughRef.current) return;
      streamActions(roughRef.current);
    } else {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      setScrollOffset(({ x, y }) => ({ x: x - e.deltaX, y: y - e.deltaY }));
    }
  };

  // render all previous actions
  const streamActions = (rc: RoughCanvas) => {
    console.log("streamActions");
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(
      origin.x,
      origin.y,
      window.innerWidth / scale,
      window.innerHeight / scale
    );

    for (let elt of history.slice(0, index)) {
      let drawable;

      // Move origin point to offset
      ctx.translate(scrollOffset.x, scrollOffset.y);

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
      rc.draw(drawable);

      // Reset origin point to 0,0
      ctx.translate(-scrollOffset.x, -scrollOffset.y);
    }
  };

  // Compute relative points in canvas
  const computePointInCanvas = (e: MouseEvent) => {
    console.log("compute");
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // implies origin is (0, 0) and scale is 1
    // scrollOffset and origin not affected by scale while drawing?
    // however, mouse position on the screen and window is affected by scale
    const x0 = -scrollOffset.x + e.clientX - rect.left;
    const y0 = -scrollOffset.y + e.clientY - rect.top;
    const x = origin.x - scrollOffset.x + (e.clientX - rect.left) / scale;
    const y = origin.y - scrollOffset.y + (e.clientY - rect.top) / scale;
    console.log(`${origin.x}, ${origin.y}`);
    console.log(`${x}, ${y}, ${e.clientX}, ${e.clientY}`);
    return { x0, y0, x, y };
  };

  useEffect(() => {
    /**
     * the handler needs the recent state of mouseDown as it influences it
     * mouseDown needs to go in the dependency array
     * as useEffect is only ran one time on mount since the array is empty
     * meaning mouseDown would always be false otherwise
     */
    console.log("effect up/move");
    if (!mouseDown || !canvasRef.current) return;

    const mouseMoveHandler = (e: MouseEvent) => {
      console.log("mousemove");

      let currentPoint = computePointInCanvas(e);
      const ctx = canvasRef.current!.getContext("2d");
      if (!ctx || !currentPoint) return;
      ctx.clearRect(
        origin.x,
        origin.y,
        window.innerWidth / scale,
        window.innerHeight / scale
      );

      roughRef.current = rough.canvas(canvasRef.current);
      if (!roughRef.current) return;
      streamActions(roughRef.current);

      // startingPoint can be null, if it is set currentPoint as the starting point
      let startPoint = startingPoint.current ?? currentPoint;

      // Move origin point to offset
      ctx.translate(scrollOffset.x, scrollOffset.y);

      currentActionRef.current = onAction({
        rc: roughRef.current,
        ctx,
        currentPoint,
        startPoint,
        gen,
      });

      // Reset origin point to 0,0
      ctx.translate(-scrollOffset.x, -scrollOffset.y);
    };

    const mouseUpHandler = () => {
      console.log("mouseup");
      // prevent rerender if mouseDown is not already true
      if (!mouseDown) return;
      setMouseDown(false);
      startingPoint.current = null;

      // add current action to history
      if (!currentActionRef.current) return;
      setHistory((prevHistory) => {
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
  }, [mouseDown, index, scale, origin]);

  useEffect(() => {
    console.log("effect window");

    // persist canvas state on resize
    const resizeHandler = () => {
      console.log("resize");
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.translate(-origin.x, -origin.y);
      if (!roughRef.current) return;
      streamActions(roughRef.current);
    };
    const wheelHandler = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("resize", resizeHandler);
    window.addEventListener("wheel", wheelHandler, { passive: false });
    return () => {
      window.removeEventListener("resize", resizeHandler);
      window.removeEventListener("wheel", wheelHandler);
    };
  }, [index, scrollOffset, scale, origin]);

  useEffect(() => {
    console.log("effect scroll redraw");
    if (!roughRef.current) return;
    streamActions(roughRef.current);
  }, [scrollOffset, scale, origin, index]);

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

  //   if (!roughRef.current) return;
  //   streamActions(roughRef.current);

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

  useEffect(() => {
    console.log("effect undo/redo");
    const onPressedHandler = (e: KeyboardEvent) => {
      console.log("onpress");
      // undo and redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        index > 0 && setIndex((i) => i - 1);
      } else if (e.ctrlKey && e.key === "y") {
        index < history.length && setIndex((i) => i + 1);
      } else if (e.metaKey && e.shiftKey && e.key === "z") {
        index < history.length && setIndex((i) => i + 1);
      }
    };

    if (!roughRef.current) return;
    streamActions(roughRef.current);

    window.addEventListener("keydown", onPressedHandler);

    return () => {
      window.removeEventListener("keydown", onPressedHandler);
    };
  }, [index, origin, scale, scrollOffset]);

  return { canvasRef, mouseDownHandler, onWheelHandler };
};
