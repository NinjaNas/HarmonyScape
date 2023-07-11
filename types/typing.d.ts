// modules
declare module "roughjs/bundled/rough.esm";

type Point = { x: number; y: number; x0?: number; y0?: number };
type Dim = { w: number; h: number };

// useWindowResize
type WindowSize = { innerWidth: number; innerHeight: number };

declare namespace Rough {
  type Draw = {
    action: string;
    rc: import("roughjs/bin/canvas").RoughCanvas;
    ctx?: CanvasRenderingContext2D;
    currentPoint: Point;
    startPoint: Point;
    gen: import("roughjs/bin/generator").RoughGenerator;
    options?: {
      seed?: number;
      stroke?: string;
      strokeWidth?: number;
    };
  };

  type DrawFunc = ({}: Draw) => DrawProps;

  type DrawProps = {
    id: null | number;
    action: string;
    startPoint: Point;
    currentDim: Dim;
    options?: {
      seed?: number;
      stroke?: string;
      strokeWidth?: number;
    };
  };

  type Action = DrawFunc;
  type ActionHistory = DrawProps;
}
