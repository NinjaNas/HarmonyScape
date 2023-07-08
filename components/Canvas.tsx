import { useState } from "react";
import { useCanvas } from "@hooks/useCanvas";
import { useWindowResize } from "@hooks/useWindowResize";
import { draw } from "@functions/canvasFunctions";

export default function Canvas(): React.ReactNode {
  console.log("render canvas component");
  // An action is defined as [function, "type of action"]
  const [action, setAction] = useState<[Rough.Action, string]>(() => [
    draw,
    "line",
  ]);
  const { canvasRef, mouseDownHandler, onWheelHandler } = useCanvas(action);
  // Needed because Next.js doesn't load window on startup, presumably because of pre-rendering
  const windowSize = useWindowResize();

  const actionHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("action");

    switch (e.target.value) {
      case "line":
      case "rect":
      case "circle":
        setAction(() => [draw, e.target.value]);
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
            checked={action[1] === "line"}
            onChange={actionHandler}
          />
          <label>line</label>
          <input
            type="radio"
            id="rect"
            name="action"
            value="rect"
            checked={action[1] === "rect"}
            onChange={actionHandler}
          />
          <label>rectangle</label>
          <input
            type="radio"
            id="circle"
            name="action"
            value="circle"
            checked={action[1] === "circle"}
            onChange={actionHandler}
          />
          <label>circle</label>
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
