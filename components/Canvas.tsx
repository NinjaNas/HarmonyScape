import { useState } from "react";
import { useCanvas } from "@hooks/useCanvas";
import { useWindowResize } from "@hooks/useWindowResize";
import { draw, detectBoundary } from "@/functions/canvasActionFunctions";
import { useRemoveCtrlZoom } from "@/hooks/useRemoveCtrlZoom";

export default function Canvas(): React.ReactNode {
  console.log("render canvas component");
  const [action, setAction] = useState<{
    func: null | Rough.Action;
    type: Rough.CanvasActions;
  }>(() => ({
    func: draw,
    type: "line",
  }));

  const { canvasRef, mouseDownHandler, onWheelHandler } = useCanvas(action);
  // Needed because Next.js doesn't load window on startup, presumably because of pre-rendering
  const windowSize = useWindowResize();
  useRemoveCtrlZoom();

  const actionHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("action");

    const drawFunc = () =>
      setAction(() => ({
        func: draw as Rough.DrawFunc,
        type: e.target.value as Rough.CanvasActions,
      }));

    const actionHandlers: { [K in Rough.CanvasActions]: () => void } = {
      line: () => {
        drawFunc();
      },
      rect: () => {
        drawFunc();
      },
      circle: () => {
        drawFunc();
      },
      select: () => {
        setAction(() => ({
          func: detectBoundary as Rough.SelectFunc,
          type: "select",
        }));
      },
    };

    actionHandlers[e.target.value as Rough.CanvasActions]();
  };

  if (windowSize) {
    console.log("window load");
    return (
      <>
        <div className="fixed">
          <input
            type="radio"
            id="select"
            name="action"
            value="select"
            checked={action.type === "select"}
            onChange={actionHandler}
          />
          <label>select</label>
          <input
            type="radio"
            id="line"
            name="action"
            value="line"
            checked={action.type === "line"}
            onChange={actionHandler}
          />
          <label>line</label>
          <input
            type="radio"
            id="rect"
            name="action"
            value="rect"
            checked={action.type === "rect"}
            onChange={actionHandler}
          />
          <label>rectangle</label>
          <input
            type="radio"
            id="circle"
            name="action"
            value="circle"
            checked={action.type === "circle"}
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
