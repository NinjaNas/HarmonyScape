import { Drawable } from "roughjs/bin/core";

export function draw({
  action,
  rc,
  gen,
  startPoint,
  currentPoint,
  options,
}: Rough.Draw) {
  let drawable: Drawable;

  const dim: Dim = {
    w: currentPoint.x - startPoint.x,
    h: currentPoint.y - startPoint.y,
  };

  let currentDim: Dim = dim;

  switch (action) {
    case "line":
      drawable = gen.line(
        startPoint.x,
        startPoint.y,
        currentPoint.x,
        currentPoint.y,
        options
      );
      break;

    case "rect":
      drawable = gen.rectangle(
        startPoint.x,
        startPoint.y,
        dim.w,
        dim.h,
        options
      );
      break;

    case "circle":
      const x = (currentPoint.x + startPoint.x) / 2;
      const y = (currentPoint.y + startPoint.y) / 2;

      let center: Point = { x, y };

      drawable = gen.ellipse(center.x, center.y, dim.w, dim.h, options);
      startPoint = center;
      break;
  }

  rc.draw(drawable!);
  return {
    action,
    startPoint,
    currentDim,
    options,
  };
}
