import rough from "roughjs/bundled/rough.esm";
import { RoughGenerator } from "roughjs/bin/generator";

const GLOBAL_ZOOM: number = 1.5;
const MIN_SCALE: number = 0.2;
const MAX_SCALE: number = 5;
const ZOOM_OUT_FACTOR: number = 0.9;
const ZOOM_IN_FACTOR: number = 1.1;
const LINE_TOLERANCE: number = 1;
const CIRCLE_TOLERANCE: number = 0.07;
const DELAY: number = 150;
const RESIZE_RADIUS: number = 5;
const GEN: RoughGenerator = rough.generator();
const IS_LOG: boolean = false;
const FN_TAG: string = "Handler";
const LOG_TAG: string = "Effect";
const RESIZE_COLOR: string = "#6699ff";
const RESIZE_FILL_COLOR: string = "#FFFFFF";
const BOUNDING_OFFSET: number = 20;

export {
	MIN_SCALE,
	MAX_SCALE,
	ZOOM_OUT_FACTOR,
	ZOOM_IN_FACTOR,
	LINE_TOLERANCE,
	CIRCLE_TOLERANCE,
	DELAY,
	GEN,
	IS_LOG,
	FN_TAG,
	LOG_TAG,
	RESIZE_RADIUS,
	RESIZE_COLOR,
	RESIZE_FILL_COLOR,
	GLOBAL_ZOOM,
	BOUNDING_OFFSET
};
