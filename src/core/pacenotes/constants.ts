/** Pace-note detector constants. Metres and degrees, matching SPEC §4–§6. */

export const RESAMPLE_M = 5;
export const BEARING_WINDOW_M = 15;
export const CORNER_WINDOW_M = 40;
export const OPEN_DEG = 12;
export const CLOSE_PEAK_RATIO = 0.6;
export const MIN_SPAN_M = 15;
export const MIN_ANGLE_DEG = 1;
export const OPEN_CONSISTENT_SAMPLES = 3;
export const DIRECTION_CONSISTENCY_MIN = 0.75;
export const S_CURVE_WINDOW_M = 20;

export const CHAIN_INTO_M = 25;
export const CHAIN_THEN_M = 60;

export const TIGHTENS_RATIO = 0.75;
export const OPENS_RATIO = 1.33;
export const ENTRY_EXIT_FRACTION = 0.4;

export const LONG_ARC_M = 120;
export const SHORT_ARC_M = 25;

export const STRAIGHT_MIN_M = 400;
export const STRAIGHT_MAX_TURN_DEG = 8;

export const HAIRPIN_RADIUS_M = 20;
export const HAIRPIN_ANGLE_DEG = 120;
export const GRADE6_MIN_ANGLE_DEG = 20;

export const JUNCTION_NEAR_M = 100;
export const NOTE_MIN_SEPARATION_M = 30;

export const SCRIPT_MAX_WORDS = 12;
export const SCRIPT_MAX_NOTES = 3;

export const GENTLE_MIN_ANGLE_DEG = 20;
export const CURVATURE_EPS = 1e-7;
