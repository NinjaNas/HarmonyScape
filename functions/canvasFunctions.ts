export function drawLine({
  rc,
  gen,
  startPoint,
  currentPoint,
  seed = getRandomInt(1, 2 ** 31),
  stroke = "#000",
  strokeWidth = 5,
}: Rough.DrawLine) {
  const line = gen.line(
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

  rc.draw(line);

  return {
    action: "line",
    startPoint,
    currentProp: currentPoint,
    options: {
      seed,
      stroke,
      strokeWidth,
    },
  };
}

export function drawRect({
  startPoint,
  currentPoint,
  rc,
  gen,
  seed = 1,
  stroke = "#000",
  strokeWidth = 5,
}: Rough.DrawRect) {
  const dim: Dim = {
    w: currentPoint.x - startPoint.x,
    h: currentPoint.y - startPoint.y,
  };

  const rect = gen.rectangle(startPoint.x, startPoint.y, dim.w, dim.h, {
    seed,
    strokeWidth,
    stroke,
  });

  rc.draw(rect);

  return {
    action: "rect",
    startPoint,
    currentProp: dim,
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
