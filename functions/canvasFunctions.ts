export function drawLine({
  rc,
  gen,
  startingPoint,
  currentPoint,
  seed = getRandomInt(1, 2 ** 31),
  stroke = "#000",
  strokeWidth = 5,
}: Rough.DrawLine) {
  const { x: currX, y: currY } = currentPoint;
  // startingPoint can be null, if it is set currentPoint as the starting point
  let startPoint = startingPoint ?? currentPoint;

  const line = gen.line(startPoint.x, startPoint.y, currX, currY, {
    seed,
    strokeWidth,
    stroke,
  });
  // console.log(line);
  rc.draw(line);

  return {
    action: "line",
    startPoint,
    currX,
    currY,
    seed,
    stroke,
    strokeWidth,
  };
}

export function drawLine2({
  startingPoint,
  currentPoint,
  rc,
  gen,
  seed = 1,
  stroke = "#ff0",
  strokeWidth = 10,
}: Rough.DrawLine) {
  const { x: currX, y: currY } = currentPoint;
  // startingPoint can be null, if it is set currentPoint as the starting point
  let startPoint = startingPoint ?? currentPoint;

  const line = gen.line(startPoint.x, startPoint.y, currX, currY, {
    seed,
    strokeWidth,
    stroke,
  });

  rc.draw(line);

  return {
    action: "line",
    startPoint,
    currX,
    currY,
    seed,
    stroke,
    strokeWidth,
  };
}

// helper
function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min) + min);
}
