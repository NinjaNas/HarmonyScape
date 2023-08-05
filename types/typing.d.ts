// modules
declare module "roughjs/bundled/rough.esm";

type Point = { x: number; y: number; x0?: number; y0?: number };
type Dim = { w: number; h: number };

type funcDebounceProps = {
  funcs: (() => void)[];
  delay: number;
};

type logFnOptions = {
  name?: string;
  tag?: string;
  log?: boolean;
  spreadArgs?: boolean;
};

type logFnProps = {
  func: (...args: any[]) => any;
  options?: logFnOptions;
};

type logOptions = {
  tag?: string;
  log?: boolean;
  spread?: boolean;
};

type logProps = {
  vals: any | any[] | { key: string; val: any }[];
  options?: logOptions;
};

// useWindowResize
type WindowSize = { innerWidth: number; innerHeight: number };

type TestLines = {
  startPoint: Point;
  endPoint: Point;
};

type DetectLine = {
  lines: TestLines[];
  mousePoint: Point;
};

type Distance = {
  a: Point;
  b: Point;
};

declare namespace Rough {
  type Action = DrawFunc | SelectFunc;
  type ActionHistory = DrawProps | EditProps;
  type ActionDraw = "line" | "rect" | "ellipse";
  type ActionShortcuts = "undo" | "redo";
  type CanvasActions = ActionDraw | "select";
  type SelectActions = "move" | "resize" | "rotate";

  type DrawFunc = ({}: Draw) => DrawProps;

  type Draw = {
    history: Rough.ActionHistory[][];
    action: Rough.ActionDraw;
    rc: import("roughjs/bin/canvas").RoughCanvas;
    ctx?: CanvasRenderingContext2D;
    currentPoint: Point;
    startPoint: Point;
    gen: import("roughjs/bin/generator").RoughGenerator;
    options?: {
      seed?: number;
      stroke?: string;
      strokeWidth?: number;
      preserveVertices?: boolean;
      curveFitting?: number;
    };
  };

  type DrawProps = {
    id: number;
    action: Rough.ActionDraw;
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
  };

  type SelectProps = { elts: null | Rough.DrawProps[]; action: type };

  type EditProps = {
    id: number;
    action: "move";
    options?: {
      seed?: number;
      stroke?: string;
      strokeWidth?: number;
    };
  } & {
    newStartPoint: Point;
    startPoint: Point;
    newDim?: Dim;
    currentDim?: Dim;
  } & {
    newStartPoint?: Point;
    startPoint?: Point;
    newDim: Dim;
    currentDim: Dim;
  } & { newStartPoint: Point; startPoint: Point; newDim: Dim; currentDim: Dim };

  type Points = {
    startPoint: Point;
    currentPoint: Point;
  };

  type UndoRedoHandler = {
    action: Rough.ActionShortcuts;
    condition: boolean;
    newIndex: number;
    actionIndex: number;
  };
}
