"use client";

import { log } from "@functions/canvasActionFunctions";
import Canvas from "@components/Canvas";

// Pre-rendering prevents window from existing on first paint

export default function Page(): React.ReactNode {
  log({ vals: "page.tsx", options: { tag: "Render" } });
  return (
    <>
      <Canvas></Canvas>
    </>
  );
}
