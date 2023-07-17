import { useEffect } from "react";

export const useRemoveCtrlZoom = () => {
  // on mount
  useEffect(() => {
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
  }, []);
};
