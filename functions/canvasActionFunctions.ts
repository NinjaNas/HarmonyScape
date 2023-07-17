import { Drawable } from "roughjs/bin/core";

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

      case "circle":
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
  CIRCLE_TOLERANCE,
  LINE_TOLERANCE,
}: Rough.Select) => {
  let eltArr: Rough.ActionHistory[] = [];

  for (const elts of history.slice(0, index)) {
    for (const elt of elts) {
      if (!elt.startPoint || !elt.currentDim) continue;
      const { action, startPoint, currentDim } = elt;

      const flag = (() => {
        switch (action as Rough.ActionDraw) {
          case "line": {
            const { x, y } = startPoint;
            const currentPoint: Point = {
              x: currentDim.w + x,
              y: currentDim.h + y,
            };
            return detectLine({
              lines: [{ startPoint, endPoint: currentPoint }],
              mousePoint,
              LINE_TOLERANCE,
            });
          }
          case "rect": {
            const { x, y } = startPoint;
            const { w, h } = currentDim;
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
              LINE_TOLERANCE,
            });
          }
          case "circle": {
            const { x, y } = startPoint;
            const { w, h } = currentDim;
            const a = w / 2;
            const b = h / 2;

            const equation =
              (mousePoint.x - x) ** 2 / a ** 2 +
              (mousePoint.y - y) ** 2 / b ** 2;
            return Math.abs(equation - 1) < CIRCLE_TOLERANCE;
          }
        }
      })();

      if (flag) eltArr = [...eltArr, elt];
    }
  }
  return eltArr.length ? eltArr : null;
};

const detectLine = ({ lines, mousePoint, LINE_TOLERANCE }: DetectLine) => {
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
