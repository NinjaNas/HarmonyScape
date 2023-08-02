import { Drawable } from "roughjs/bin/core";
import { LINE_TOLERANCE, CIRCLE_TOLERANCE } from "@constants/canvasConstants";

export function draw({
  history,
  action,
  rc,
  gen,
  startPoint,
  currentPoint,
  options,
}: Rough.Draw) {
  const dim: Dim = {
    w: currentPoint.x - startPoint.x,
    h: currentPoint.y - startPoint.y,
  };
  const currentDim: Dim = dim;

  const drawable: Drawable = (() => {
    switch (action as Rough.ActionDraw) {
      case "line":
        return gen.line(
          startPoint.x,
          startPoint.y,
          currentPoint.x,
          currentPoint.y,
          options
        );

      case "rect":
        return gen.rectangle(startPoint.x, startPoint.y, dim.w, dim.h, options);

      case "ellipse":
        const x = (currentPoint.x + startPoint.x) / 2;
        const y = (currentPoint.y + startPoint.y) / 2;

        let center: Point = { x, y };
        startPoint = center;
        return gen.ellipse(center.x, center.y, dim.w, dim.h, options);
    }
  })();

  rc.draw(drawable);
  return {
    id: history.reduce((currentCount, row) => currentCount + row.length, 0),
    action,
    startPoint,
    currentDim,
    options,
  };
}

export const detectBoundary = ({
  history,
  index,
  mousePoint,
}: Rough.Select) => {
  let eltArr: Rough.ActionHistory[] = [];

  for (const elts of history.slice(0, index)) {
    for (const elt of elts) {
      if (!elt.startPoint || !elt.currentDim) continue;
      const { action, startPoint, currentDim } = elt;

      const flag = (() => {
        switch (action as Rough.ActionDraw) {
          case "line": {
            const { x, y }: Point = startPoint;
            const currentPoint: Point = {
              x: currentDim.w + x,
              y: currentDim.h + y,
            };
            return detectLine({
              lines: [{ startPoint, endPoint: currentPoint }],
              mousePoint,
            });
          }
          case "rect": {
            const { x, y }: Point = startPoint;
            const { w, h }: Dim = currentDim;
            const tr: Point = { x: x + w, y };
            const bl: Point = { x, y: y + h };
            const br: Point = {
              x: x + w,
              y: y + h,
            };

            return detectLine({
              lines: [
                { startPoint, endPoint: tr },
                { startPoint, endPoint: bl },
                { startPoint: tr, endPoint: br },
                { startPoint: bl, endPoint: br },
              ],
              mousePoint,
            });
          }
          case "ellipse": {
            //https://www.geeksforgeeks.org/check-if-a-point-is-inside-outside-or-on-the-ellipse/#
            const { x, y }: Point = startPoint;
            const { w, h }: Dim = currentDim;
            let a, b, theta;

            if (w > h) {
              a = w / 2;
              b = h / 2;
              theta = 0; // Major axis is horizontal
            } else {
              a = h / 2;
              b = w / 2;
              theta = Math.PI / 2; // Major axis is vertical
            }

            const distance =
              Math.pow(
                (mousePoint.x - x) * Math.cos(theta) +
                  (mousePoint.y - y) * Math.sin(theta),
                2
              ) /
                Math.pow(a, 2) +
              Math.pow(
                (mousePoint.x - x) * Math.sin(theta) -
                  (mousePoint.y - y) * Math.cos(theta),
                2
              ) /
                Math.pow(b, 2);
            return Math.abs(distance - 1) < CIRCLE_TOLERANCE;
          }
        }
      })();

      if (flag) eltArr = [...eltArr, elt];
    }
  }
  // only return one element
  return { elts: eltArr.length ? [eltArr[0]] : null, action: "move" };
};

const detectLine = ({ lines, mousePoint }: DetectLine) => {
  let flag = false;

  for (const { startPoint, endPoint } of lines) {
    const offset =
      distance({ a: startPoint, b: endPoint }) -
      (distance({ a: startPoint, b: mousePoint }) +
        distance({ a: endPoint, b: mousePoint }));

    flag = flag || Math.abs(offset) < LINE_TOLERANCE;
  }
  return flag;
};

const distance = ({ a, b }: Distance) =>
  Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

export const drawSelection = (
  ctx: CanvasRenderingContext2D,
  { action, startPoint, currentDim }: Rough.ActionHistory
) => {
  switch (action) {
    case "line": {
      const currentPoint: Point = {
        x: currentDim.w + startPoint.x,
        y: currentDim.h + startPoint.y,
      };
      drawSelectionHelper(ctx, [startPoint, currentPoint]);
      break;
    }
    case "rect": {
      const currentPoint: Point = {
        x: currentDim.w + startPoint.x,
        y: currentDim.h + startPoint.y,
      };

      drawSelectionHelper(ctx, [
        startPoint,
        currentPoint,
        { x: startPoint.x, y: currentPoint.y },
        { x: currentPoint.x, y: startPoint.y },
      ]);
      break;
    }
    case "ellipse": {
      const start: Point = {
        x: startPoint.x - currentDim.w / 2,
        y: startPoint.y - currentDim.h / 2,
      };
      const currentPoint: Point = {
        x: startPoint.x + currentDim.w / 2,
        y: startPoint.y + currentDim.h / 2,
      };

      drawSelectionHelper(ctx, [
        start,
        currentPoint,
        { x: start.x, y: currentPoint.y },
        { x: currentPoint.x, y: start.y },
      ]);
      break;
    }
  }
};

const drawSelectionHelper = (
  ctx: CanvasRenderingContext2D,
  points: Point[]
) => {
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 40, 0, 2 * Math.PI);
    ctx.stroke();
  }
};
