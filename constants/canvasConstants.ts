import rough from "roughjs/bundled/rough.esm";
import { RoughGenerator } from "roughjs/bin/generator";

const MIN_SCALE: number = 0.2;
const MAX_SCALE: number = 5;
const ZOOM_OUT_FACTOR: number = 0.9;
const ZOOM_IN_FACTOR: number = 1.1;
const LINE_TOLERANCE: number = 1;
const CIRCLE_TOLERANCE: number = 0.03;
const DELAY: number = 150;
const GEN: RoughGenerator = rough.generator();
const IS_LOG: boolean = false;
const FN_TAG: string = "Handler";
const LOG_TAG: string = "Effect";

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
	LOG_TAG
};
