import { useLayoutEffect, useState } from "react";

export const useWindowResize = () => {
  const [windowSize, setWindowSize] = useState<null | WindowSize>(null);
  // set window before paint, runs once on mount
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
