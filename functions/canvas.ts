export function drawLine({ startingPoint, currentPoint, rc, gen }: Rough.Draw) {
  const { x: currX, y: currY } = currentPoint;
  // startingPoint can be null, if it is set currentPoint as the starting point
  let startPoint = startingPoint ?? currentPoint;
  const line = gen.line(startPoint.x, startPoint.y, currX, currY, {
    seed: 0,
    strokeWidth: 4,
    stroke: "#000",
  });
  // console.log({ startingPoint, currentPoint });
  rc.draw(line);
}

export function drawLine2({
  startingPoint,
  currentPoint,
  rc,
  gen,
}: Rough.Draw) {
  const { x: currX, y: currY } = currentPoint;
  // startingPoint can be null, if it is set currentPoint as the starting point
  let startPoint = startingPoint ?? currentPoint;
  const line = gen.line(startPoint.x, startPoint.y, currX, currY, {
    seed: 1,
    strokeWidth: 5,
    stroke: "#ff0",
  });
  // console.log({ startingPoint, currentPoint });
  rc.draw(line);
}
