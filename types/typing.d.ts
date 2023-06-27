// modules
declare module "roughjs/bundled/rough.esm";

type Point = { x: number; y: number };

// useWindowResize
type WindowSize = { innerWidth: number; innerHeight: number };

declare namespace Rough {
  type Draw = {
    rc: import("roughjs/bin/canvas").RoughCanvas;
    ctx?: CanvasRenderingContext2D;
    currentPoint: Point;
    startingPoint: Point | null;
    gen: import("roughjs/bin/generator").RoughGenerator;
  };
  type DrawFunc = ({
    rc,
    currentPoint,
    startingPoint,
    gen,
  }: Rough.Draw) => void;
}
