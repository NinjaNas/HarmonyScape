import { Drawable } from "roughjs/bin/core";

export function draw({
  action,
  rc,
  gen,
  startPoint,
  currentPoint,
  seed = getRandomInt(1, 2 ** 31),
  stroke = "#000",
  strokeWidth = 5,
}: Rough.Draw) {
  let drawable: Drawable;
  let currentProp: Point | Dim = currentPoint;

  const dim: Dim = {
    w: currentPoint.x - startPoint.x,
    h: currentPoint.y - startPoint.y,
  };

  switch (action) {
    case "line":
      drawable = gen.line(
        startPoint.x,
        startPoint.y,
        currentPoint.x,
        currentPoint.y,
        {
          seed,
          strokeWidth,
          stroke,
        }
      );
      currentProp = currentPoint;
      break;

    case "rect":
      drawable = gen.rectangle(startPoint.x, startPoint.y, dim.w, dim.h, {
        seed,
        strokeWidth,
        stroke,
      });
      currentProp = dim;
      break;

    case "circle":
      const x = (currentPoint.x + startPoint.x) / 2;
      const y = (currentPoint.y + startPoint.y) / 2;

      let center: Point = { x, y };

      drawable = gen.ellipse(center.x, center.y, dim.w, dim.h, {
        seed,
        strokeWidth,
        stroke,
      });
      startPoint = center;
      currentProp = dim;
      break;
  }

  rc.draw(drawable!);
  return {
    action,
    startPoint,
    currentProp,
    options: {
      seed,
      stroke,
      strokeWidth,
    },
  };
}

// helper
function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min) + min);
}
