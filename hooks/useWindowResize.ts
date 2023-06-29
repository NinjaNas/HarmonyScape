import { useLayoutEffect, useState } from "react";

export const useWindowResize = () => {
  const [windowSize, setWindowSize] = useState<null | WindowSize>(null);
  /**
   * set window before paint, runs one time on mount,
   * since state is updated on resize the canvas gets re-rendered
   * because of pre-rendering window does not exist on mount
   */
  useLayoutEffect(() => {
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
  }, []);
  return windowSize;
};
