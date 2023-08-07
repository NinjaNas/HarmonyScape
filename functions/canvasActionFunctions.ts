import { Drawable } from "roughjs/bin/core";
import {
  LINE_TOLERANCE,
  CIRCLE_TOLERANCE,
  IS_LOG,
  LOG_TAG,
  FN_TAG,
} from "@constants/canvasConstants";

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
  return { elts: eltArr.length ? eltArr[0] : null, action: "move" };
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

// calculate consistent start and currentPoints for shapes
export const calcPoints = ({
  action,
  startPoint,
  currentDim,
}: Rough.ActionHistory) => {
  return (() => {
    switch (action as Rough.ActionDraw) {
      case "line": {
        const currentPoint: Point = {
          x: currentDim.w + startPoint.x,
          y: currentDim.h + startPoint.y,
        };

        // deep copy
        const start: Point = { x: startPoint.x, y: startPoint.y };

        return { startPoint: start, currentPoint };
      }
      case "rect": {
        const currentPoint: Point = {
          x: currentDim.w + startPoint.x,
          y: currentDim.h + startPoint.y,
        };

        // deep copy
        const start: Point = { x: startPoint.x, y: startPoint.y };

        return { startPoint: start, currentPoint };
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
        return { startPoint: start, currentPoint };
      }
    }
  })();
};

export const drawSelection = (
  ctx: CanvasRenderingContext2D,
  elt: Rough.ActionHistory
) => {
  const { startPoint, currentPoint }: Rough.Points = calcPoints(elt);
  switch (elt.action) {
    case "line": {
      drawSelectionHelper(ctx, [startPoint, currentPoint]);
      break;
    }
    case "rect": {
      drawSelectionHelper(ctx, [
        startPoint,
        currentPoint,
        { x: startPoint.x, y: currentPoint.y },
        { x: currentPoint.x, y: startPoint.y },
      ]);
      break;
    }
    case "ellipse": {
      drawSelectionHelper(ctx, [
        startPoint,
        currentPoint,
        { x: startPoint.x, y: currentPoint.y },
        { x: currentPoint.x, y: startPoint.y },
      ]);
      break;
    }
  }
};

export const drawMultiSelection = (
  ctx: CanvasRenderingContext2D,
  { startPoint, currentPoint }: Rough.Points
) => {
  drawSelectionHelper(ctx, [
    startPoint,
    currentPoint,
    { x: startPoint.x, y: currentPoint.y },
    { x: currentPoint.x, y: startPoint.y },
  ]);
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

export const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min) + min);
};

// logs the func name and args along with a tag, Ex: [Tag] fn: name, args: []
// when spreadArgs is true, args will be spread out using the spread operator
export function logFn({
  func,
  options: {
    name = func.name,
    tag = FN_TAG,
    log = IS_LOG,
    spreadArgs = true,
  } = {
    name: func.name,
    tag: FN_TAG,
    log: IS_LOG,
    spreadArgs: true,
  },
}: logFnProps) {
  return function (...args: any[]) {
    if (log) {
      if (args.length) {
        console.info(
          `%c%s%c fn%c: %s, %cargs%c:%o`,
          "color: deepskyblue; font-weight: bold;",
          `${tag ? `[${tag}]` : ""}`,
          "color: coral;",
          "color: lightgray;",
          name,
          "color: coral;",
          "color: lightgray;",
          ...(spreadArgs ? [...args] : [args])
        );
      } else {
        console.info(
          `%c%s%c fn%c: %s`,
          "color: deepskyblue; font-weight: bold;",
          `${tag ? `[${tag}]` : ""}`,
          "color: coral;",
          "color: lightgray;",
          name
        );
      }
    }
    try {
      return func(...args);
    } catch (error) {
      console.error(name, error);
      throw error;
    }
  };
}

// logs any object(s) along with a tag and an optional key/value pair, Ex: [Tag] key: value, value
// when spread is true, if values are an array of object that array will be spread out
export function log({
  vals,
  options: { tag = LOG_TAG, log = IS_LOG, spread = true } = {
    tag: LOG_TAG,
    log: IS_LOG,
    spread: true,
  },
}: logProps) {
  if (!log) return;
  let tokens = "";
  let formattedVals: any[] = [];
  if (
    Array.isArray(vals) &&
    (vals.some(
      (val) => typeof val === "object" && "key" in val && "val" in val
    ) ||
      spread) &&
    vals.length
  ) {
    vals.forEach((val: any) => {
      if (typeof val === "object" && "key" in val && "val" in val) {
        // remove extra space from object but not from anything else
        typeof val.val === "object"
          ? (tokens += "%c%s%c:%o, ")
          : (tokens += "%c%s%c: %s, ");
        formattedVals.push(
          "color: coral;",
          val.key,
          "color: lightgray;",
          val.val
        );
      } else if (typeof val === "object" && spread && val.length) {
        val.forEach((val: any) => {
          tokens += "%c%o, ";
          formattedVals.push("color: lightgray;", val);
        });
      } else {
        tokens += "%c%o, ";
        formattedVals.push("color: lightgray;", val);
      }
    });
    // remove trailing whitespace and comma
    tokens = tokens.trim().replace(/,$/, "");
  } else {
    tokens += "%c%o";
    formattedVals = ["color: lightgray;", vals];
  }
  console.info(
    `%c[%s] ${tokens}`,
    "color: deepskyblue; font-weight: bold;",
    tag,
    ...formattedVals
  );
}
