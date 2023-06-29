// modules
declare module "roughjs/bundled/rough.esm";

type Point = { x: number; y: number };

// useWindowResize
type WindowSize = { innerWidth: number; innerHeight: number };

declare namespace Rough {
  type DrawLine = {
    rc: import("roughjs/bin/canvas").RoughCanvas;
    ctx?: CanvasRenderingContext2D;
    currentPoint: Point;
    startingPoint: Point | null;
    gen: import("roughjs/bin/generator").RoughGenerator;
    seed?: number;
    stroke?: string;
    strokeWidth?: number;
  };

  type DrawLineProps = {
    action;
    startPoint;
    currX;
    currY;
    seed;
    stroke;
    strokeWidth;
  };

  type DrawLineFunc = ({}: DrawLine) => DrawLineRet;

  type Placeholder = { action: test };
  type Action = DrawLineFunc;
  type ActionHistory = DrawLineProps | Placeholder;
}
