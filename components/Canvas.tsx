import { useState } from "react";
import { useCanvas } from "@hooks/useCanvas";
import { useWindowResize } from "@hooks/useWindowResize";
import { drawLine, drawLine2 } from "@functions/canvasFunctions";

export default function Canvas(): React.ReactNode {
  console.log("render canvas component");
  const [action, setAction] = useState<Rough.Action>(() => drawLine);
  const { canvasRef, mouseDownHandler } = useCanvas(action);
  // Needed because Next.js doesn't load window on startup, presumably because of pre-rendering
  const windowSize = useWindowResize();

  const actionHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("action");
    if (e.target.value === "draw") {
      setAction(() => drawLine);
    } else if (e.target.value === "draw2") {
      setAction(() => drawLine2);
    }
  };

  if (windowSize) {
    console.log("window load");
    return (
      <>
        <div className="fixed">
          <input
            type="radio"
            id="draw"
            name="action"
            value="draw"
            checked={action === drawLine}
            onChange={actionHandler}
          />
          <label>draw</label>
          <input
            type="radio"
            id="draw2"
            name="action"
            value="draw2"
            checked={action === drawLine2}
            onChange={actionHandler}
          />
          <label>draw2</label>
        </div>
        <div className="flex h-screen w-screen items-center justify-center bg-white">
          <canvas
            onMouseDown={mouseDownHandler}
            ref={canvasRef}
            width={windowSize.innerWidth}
            height={windowSize.innerHeight}
            className="rounded-md border border-black"
          />
        </div>
      </>
    );
  }
}
