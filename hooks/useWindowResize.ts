/* eslint-disable react-hooks/exhaustive-deps */
import { log, logFn } from "@functions/canvasActionFunctions";
import { useLayoutEffect, useState } from "react";

export const useWindowResize = () => {
  log({ vals: "useWindowResize.tsx", options: { tag: "Render" } });
  const [windowSize, setWindowSize] = useState<null | WindowSize>(null);
  /**
   * set window before paint, runs one time on mount,
   * since state is updated on resize the canvas gets re-rendered
   * because of pre-rendering window does not exist on mount
   */
  useLayoutEffect(
    logFn({
      options: { name: "resize" },
      func: () => {
        const handlerResize = () => {
          setWindowSize({
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
          });
        };
        // init windowSize
        handlerResize();

        window.addEventListener("resize", handlerResize);

        return () => {
          window.removeEventListener("resize", handlerResize);
        };
      },
    }),
    []
  );
  return windowSize;
};
