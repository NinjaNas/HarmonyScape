import { useEffect, useRef, useState } from "react";
import { RoughCanvas } from "roughjs/bin/canvas";
import rough from "roughjs/bundled/rough.esm";
import { KeyComboEvent, bindKeyCombo, unbindKeyCombo } from "@rwh/keystrokes";

export const useCanvas = (onAction: Rough.Action) => {
  const [history, setHistory] = useState<Rough.ActionHistory[]>([]);
  const [index, setIndex] = useState<number>(0);

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

  const mouseUpHandler = () => {
    setMouseDown(false);
    startingPoint.current = null;

    // add current action to history
    if (!currentActionRef.current) return;
    setHistory((prevHistory) => {
      return [...prevHistory.slice(0, index), currentActionRef.current!];
    });

    setIndex((i) => i + 1);
  };

  // persist canvas state on resize
  const resizeHandler = () => {
    if (!roughRef.current) return;
    streamActions(roughRef.current);
  };

  // render all previous actions
  const streamActions = (rc: RoughCanvas) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let elt of history.slice(0, index)) {
      let drawable;

      switch (elt.action) {
        case "line":
          let e = elt as Rough.DrawLineProps;
          drawable = gen.line(
            e.startPoint.x,
            e.startPoint.y,
            e.currX,
            e.currY,
            {
              seed: e.seed,
              strokeWidth: e.strokeWidth,
              stroke: e.stroke,
            }
          );
          break;
      }

      rc.draw(drawable);
    }
  };

  // Compute relative points in canvas
  const computePointInCanvas = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return { x, y };
  };

  useEffect(() => {
    /**
     * the handler needs the recent state of mouseDown as it influences it
     * mouseDown needs to go in the dependency array
     * as useEffect is only ran one time on mount since the array is empty
     * meaning mouseDown would always be false otherwise
     */
    const mouseMoveHandler = (e: MouseEvent) => {
      if (!mouseDown || !canvasRef.current) return;

      const currentPoint = computePointInCanvas(e);
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx || !currentPoint) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      roughRef.current = rough.canvas(canvasRef.current);
      if (!roughRef.current) return;
      streamActions(roughRef.current);

      currentActionRef.current = onAction({
        rc: roughRef.current,
        ctx,
        currentPoint,
        startingPoint: startingPoint.current,
        gen,
      });
    };

    // setup Mouse Handler
    canvasRef.current?.addEventListener("mousemove", mouseMoveHandler);
    window.addEventListener("mouseup", mouseUpHandler);
    window.addEventListener("resize", resizeHandler);

    // cleanup Mouse Handler before unmount and rerender if dependencies change
    return () => {
      canvasRef.current?.removeEventListener("mousemove", mouseMoveHandler);
      window.removeEventListener("mouseup", mouseUpHandler);
      window.removeEventListener("resize", resizeHandler);
    };
  }, [mouseDown, index]);

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

  //   const onReleasedHandler = (e: KeyComboEvent<KeyboardEvent>) => {
  //     if (!roughRef.current) return;
  //     streamActions(roughRef.current);
  //   };

  //   bindKeyCombo("control+z", {
  //     onPressed: onPressedHandler,
  //     onReleased: onReleasedHandler,
  //   });
  //   bindKeyCombo("control+y", {
  //     onPressed: onPressedHandler,
  //     onReleased: onReleasedHandler,
  //   });

  //   return () => {
  //     unbindKeyCombo("control+z");
  //     unbindKeyCombo("control+y");
  //   };
  // }, [index]);

  useEffect(() => {
    const onPressedHandler = (e: KeyboardEvent) => {
      // undo and redo
      if (e.ctrlKey && e.key === "z") {
        index > 0 && setIndex((i) => i - 1);
      } else if (e.ctrlKey && e.key === "y") {
        index < history.length && setIndex((i) => i + 1);
      }
    };
    const onReleasedHandler = (e: KeyboardEvent) => {
      if (!roughRef.current) return;
      streamActions(roughRef.current);
    };

    console.log(index);
    window.addEventListener("keydown", onPressedHandler);
    window.addEventListener("keyup", onReleasedHandler);

    return () => {
      window.removeEventListener("keydown", onPressedHandler);
      window.removeEventListener("keyup", onReleasedHandler);
    };
  }, [index]);

  return { canvasRef, mouseDownHandler };
};
