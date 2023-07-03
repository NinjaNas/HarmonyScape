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
    startPoint: Point;
    gen: import("roughjs/bin/generator").RoughGenerator;
    seed?: number;
    stroke?: string;
    strokeWidth?: number;
  };

  type DrawLineProps = {
    action: string;
    startPoint: Point;
    currentPoint: Point;
    options: {
      seed: number;
      stroke: string;
      strokeWidth: number;
    };
  };

  type DrawLineFunc = ({}: DrawLine) => DrawLineRet;

  type Placeholder = { action: string; startPoint: Point };
  type Action = DrawLineFunc;
  type ActionHistory = DrawLineProps | Placeholder;
}
