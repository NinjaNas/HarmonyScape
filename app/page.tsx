"use client";
import { useState } from "react";
import { useCanvas } from "@hooks/useCanvas";
import { useWindowResize } from "@hooks/useWindowResize";
import { drawLine, drawLine2 } from "@/functions/canvas";

interface PageProps {}

export default function Page({}: PageProps): React.ReactNode {
  const [action, setAction] = useState<Rough.DrawFunc>(() => drawLine);
  const { canvasRef, mouseDownHandler } = useCanvas(action);
  const windowSize = useWindowResize();

  const handleAction = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
    if (e.target.value === "draw") {
      setAction(() => drawLine);
    } else if (e.target.value === "draw2") {
      setAction(() => drawLine2);
    }
  };

  if (windowSize) {
    return (
      <>
        <div className="fixed">
          <input
            type="radio"
            id="draw"
            name="action"
            value="draw"
            checked={action === drawLine}
            onChange={handleAction}
          />
          <label>draw</label>
          <input
            type="radio"
            id="draw2"
            name="action"
            value="draw2"
            checked={action === drawLine2}
            onChange={handleAction}
          />
          <label>draw2</label>
        </div>
        <div className="flex h-screen w-screen items-center justify-center bg-white">
          <canvas
            onMouseDown={mouseDownHandler}
            ref={canvasRef}
            width={windowSize?.innerWidth}
            height={windowSize?.innerHeight}
            className="rounded-md border border-black"
          />
        </div>
      </>
    );
  }
}
