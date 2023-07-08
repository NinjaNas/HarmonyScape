// modules
declare module "roughjs/bundled/rough.esm";

type Point = { x: number; y: number; x0?: number; y0?: number };
type Dim = { w: number; h: number };

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

  type DrawRect = {
    rc: import("roughjs/bin/canvas").RoughCanvas;
    ctx?: CanvasRenderingContext2D;
    currentPoint: Point;
    startPoint: Point;
    gen: import("roughjs/bin/generator").RoughGenerator;
    seed?: number;
    stroke?: string;
    strokeWidth?: number;
  };

  type DrawLineFunc = ({}: DrawLine) => DrawProps;
  type DrawRectFunc = ({}: DrawRect) => DrawProps;

  type DrawProps = {
    action: string;
    startPoint: Point;
    currentProp: Point | Dim;
    options: {
      seed: number;
      stroke: string;
      strokeWidth: number;
    };
  };

  type Action = DrawLineFunc | DrawRectFunc;
  type ActionHistory = DrawProps;
}
