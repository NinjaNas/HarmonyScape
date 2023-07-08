import { useState } from "react";
import { useCanvas } from "@hooks/useCanvas";
import { useWindowResize } from "@hooks/useWindowResize";
import { drawLine, drawRect } from "@functions/canvasFunctions";

export default function Canvas(): React.ReactNode {
  console.log("render canvas component");
  const [action, setAction] = useState<Rough.Action>(() => drawLine);
  const { canvasRef, mouseDownHandler, onWheelHandler } = useCanvas(action);
  // Needed because Next.js doesn't load window on startup, presumably because of pre-rendering
  const windowSize = useWindowResize();

  const actionHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("action");
    switch (e.target.value) {
      case "line":
        setAction(() => drawLine);
        break;
      case "rect":
        setAction(() => drawRect);
        break;
    }
  };

  if (windowSize) {
    console.log("window load");
    return (
      <>
        <div className="fixed">
          <input
            type="radio"
            id="line"
            name="action"
            value="line"
            checked={action === drawLine}
            onChange={actionHandler}
          />
          <label>line</label>
          <input
            type="radio"
            id="rect"
            name="action"
            value="rect"
            checked={action === drawRect}
            onChange={actionHandler}
          />
          <label>rectangle</label>
        </div>
        <div className="flex h-screen w-screen items-center justify-center bg-white">
          <canvas
            onMouseDown={mouseDownHandler}
            ref={canvasRef}
            width={windowSize.innerWidth}
            height={windowSize.innerHeight}
            onWheel={onWheelHandler}
            className="rounded-md border border-black"
          />
        </div>
      </>
    );
  }
}
