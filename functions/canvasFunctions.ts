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

  let currentDim: Dim = dim;

  const actionHandlers: { [K in Rough.ActionKeys]: () => Drawable } = {
    line: () =>
      gen.line(
        startPoint.x,
        startPoint.y,
        currentPoint.x,
        currentPoint.y,
        options
      ),
    rect: () =>
      gen.rectangle(startPoint.x, startPoint.y, dim.w, dim.h, options),
    circle: () => {
      const x = (currentPoint.x + startPoint.x) / 2;
      const y = (currentPoint.y + startPoint.y) / 2;

      let center: Point = { x, y };
      startPoint = center;
      return gen.ellipse(center.x, center.y, dim.w, dim.h, options);
    },
  };

  const drawable = actionHandlers[action as Rough.ActionKeys]();

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

  for (let elts of history.slice(0, index)) {
    for (let elt of elts) {
      if (!elt.startPoint || !elt.currentDim) continue;
      const { action, startPoint, currentDim } = elt;
      const actionHandlers: { [K in Rough.ActionKeys]: () => boolean } = {
        line: () => {
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
        },
        rect: () => {
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
        },
        circle: () => {
          const { x, y } = startPoint;
          const { w, h } = currentDim;
          const a = w / 2;
          const b = h / 2;

          const equation =
            (mousePoint.x - x) ** 2 / a ** 2 + (mousePoint.y - y) ** 2 / b ** 2;
          return Math.abs(equation - 1) < CIRCLE_TOLERANCE;
        },
      };

      const flag = actionHandlers[action as Rough.ActionKeys]();
      if (flag) eltArr = [...eltArr, elt];
    }
  }
  return eltArr.length ? eltArr : null;
};

const detectLine = ({
  lines,
  mousePoint,
  LINE_TOLERANCE,
}: Rough.DetectLine) => {
  let flag = false;

  for (let { startPoint, endPoint } of lines) {
    const offset =
      distance({ a: startPoint, b: endPoint }) -
      (distance({ a: startPoint, b: mousePoint }) +
        distance({ a: endPoint, b: mousePoint }));

    flag = flag || Math.abs(offset) < LINE_TOLERANCE;
  }
  return flag;
};

const distance = ({ a, b }: Rough.Distance) =>
  Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
