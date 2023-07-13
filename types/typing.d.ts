// modules
declare module "roughjs/bundled/rough.esm";

type Point = { x: number; y: number; x0?: number; y0?: number };
type Dim = { w: number; h: number };

// useWindowResize
type WindowSize = { innerWidth: number; innerHeight: number };

declare namespace Rough {
  type Action = DrawFunc | SelectFunc;
  type ActionHistory = DrawProps | EditProps;
  type ActionKeys = "line" | "rect" | "circ";

  type DrawFunc = ({}: Draw) => DrawProps;

  type Draw = {
    history: Rough.ActionHistory[][];
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

  type DrawProps = {
    id: number;
    action: string;
    startPoint: Point;
    currentDim: Dim;
    options?: {
      seed?: number;
      stroke?: string;
      strokeWidth?: number;
    };
  };

  type SelectFunc = ({}: Select) => SelectProps;

  type Select = {
    history: Rough.ActionHistory[][];
    index: number;
    mousePoint: Point;
    CIRCLE_TOLERANCE: number;
    LINE_TOLERANCE: number;
  };

  type SelectProps = null | Rough.DrawProps[];

  type EditProps = {
    id: number;
    action: string;
    newStartPoint?: Point;
    startPoint?: Point;
    newDim?: Dim;
    currentDim?: Dim;
    options?: {
      seed?: number;
      stroke?: string;
      strokeWidth?: number;
    };
  };

  type TestLines = {
    startPoint: Point;
    endPoint: Point;
  };

  type DetectLine = {
    lines: TestLines[];
    mousePoint: Point;
    LINE_TOLERANCE: number;
  };

  type Distance = {
    a: Point;
    b: Point;
  };
}
