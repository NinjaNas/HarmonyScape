import { useEffect, useRef, useState } from "react";
import { RoughCanvas } from "roughjs/bin/canvas";
import rough from "roughjs/bundled/rough.esm";

export const useCanvas = (onAction: Rough.Action) => {
  const [history, setHistory] = useState<Rough.ActionHistory[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roughRef = useRef<null | RoughCanvas>(null);
  const currentActionRef = useRef<null | Rough.ActionHistory>(null);
  const startingPoint = useRef<null | Point>(null);

  const gen = rough.generator();
  //console.log(history);

  const [mouseDown, setMouseDown] = useState<boolean>(false);
  // Compute relative points in canvas
  const computePointInCanvas = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return { x, y };
  };

  const mouseDownHandler = (
    e: React.MouseEvent<HTMLCanvasElement, MouseEvent>
  ) => {
    setMouseDown(true);
    const point = computePointInCanvas(e.nativeEvent);
    if (!point) return;
    startingPoint.current = point;
  };

  const mouseUpHandler = () => {
    setMouseDown(false);
    startingPoint.current = null;

    // add current action to histort
    if (!currentActionRef.current) return;
    setHistory([...history, currentActionRef.current]);
    currentActionRef.current = null;
  };
  // persist canvas state on resize
  const resizeHandler = () => {
    if (!roughRef.current) return;
    streamActions(roughRef.current);
  };

  // render all previous actions
  const streamActions = (rc: RoughCanvas) => {
    if (!canvasRef.current) return;
    for (let elt of history) {
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      /**
       * The handler needs the recent state of mouseDown as it influences it
       * mouseDown needs to go in the dependency array
       * as useEffect is only ran one time on mount since the array is empty
       * meaning mouseDown would always be false otherwise
       */
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

    // Setup Mouse Handler
    canvasRef.current?.addEventListener("mousemove", handler);
    window.addEventListener("mouseup", mouseUpHandler);
    window.addEventListener("resize", resizeHandler);

    // Cleanup Mouse Handler before unmount and rerender if dependencies change
    return () => {
      canvasRef.current?.removeEventListener("mousemove", handler);
      window.removeEventListener("mouseup", mouseUpHandler);
      window.removeEventListener("resize", resizeHandler);
    };
  }, [mouseDown]);

  return { canvasRef, mouseDownHandler };
};
