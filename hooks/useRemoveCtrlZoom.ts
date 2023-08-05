/* eslint-disable react-hooks/exhaustive-deps */
import { log, logFn } from "@functions/canvasActionFunctions";
import { useEffect } from "react";

export const useRemoveCtrlZoom = () => {
  log({ vals: "useRemoveCtrlZoom.tsx", options: { tag: "Render" } });
  // on mount
  useEffect(
    logFn({
      options: { name: "removeCtrlZoom" },
      func: () => {
        // prevent default ctrl+wheel
        const wheelHandler = (e: WheelEvent) => {
          if (e.ctrlKey) {
            e.preventDefault();
          }
        };

        window.addEventListener("wheel", wheelHandler, { passive: false });

        return () => {
          window.removeEventListener("wheel", wheelHandler);
        };
      },
    }),
    []
  );
};
