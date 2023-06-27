import { useEffect, useRef, useState } from "react";
import rough from "roughjs/bundled/rough.esm";

export const useCanvas = (onDraw: Rough.DrawFunc) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startingPoint = useRef<null | Point>(null);
  const gen = rough.generator();

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
    startingPoint.current = computePointInCanvas(e.nativeEvent)!;
  };

  const mouseUpHandler = () => {
    setMouseDown(false);
    startingPoint.current = null;
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      /**
       * The handler needs the recent state of mouseDown as it influences it
       * mouseDown needs to go in the dependency array
       * as useEffect is only ran once when the array is empty
       * meaning mouseDown would always be false otherwise
       */
      if (!mouseDown) return;
      const currentPoint = computePointInCanvas(e);
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx || !currentPoint) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const rc = rough.canvas(canvasRef.current!);
      onDraw({
        rc,
        ctx,
        currentPoint,
        startingPoint: startingPoint.current,
        gen,
      });
    };

    // Setup Mouse Handler
    canvasRef.current?.addEventListener("mousemove", handler);
    window.addEventListener("mouseup", mouseUpHandler);

    // Cleanup Mouse Handler before unmount and rerender if dependencies change
    return () => {
      canvasRef.current?.removeEventListener("mousemove", handler);
      window.removeEventListener("mouseup", mouseUpHandler);
    };
  }, [mouseDown]);

  return { canvasRef, mouseDownHandler };
};
