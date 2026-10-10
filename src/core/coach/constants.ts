/** Call-timing and off-route constants. SPEC §8. */

export const LEAD_SECONDS_TIGHT = 5.0;
export const LEAD_SECONDS_MEDIUM = 3.5;
export const LEAD_SECONDS_FAST = 2.5;
export const LEAD_SECONDS_OTHER = 4.0;

export const MIN_LEAD_M = 60;
export const MAX_LEAD_M = 350;

export const CONFIRM_LEAD_M = 40;
export const CONFIRM_GAP_MS = 3000;

export const REARM_BEHIND_M = 50;

/** Keep retrying a call that the player did not accept, until this far past the exit. */
export const CALL_CATCHUP_M = 50;

/** How far behind the last fix progress matching may look. */
export const PROGRESS_BACK_M = 80;
/** Minimum forward window. Grows with speed × time so a short GPS gap can catch up. */
export const PROGRESS_AHEAD_MIN_M = 180;
export const PROGRESS_AHEAD_MAX_M = 800;

export const OFF_ROUTE_CROSS_TRACK_M = 35;
export const OFF_ROUTE_MIN_SPEED_MPS = 2;
export const OFF_ROUTE_MAX_ACCURACY_M = 30;
export const OFF_ROUTE_STREAK = 3;
export const OFF_ROUTE_HOLD_MS = 5000;

export const LOOKAHEAD_S = 8;
export const FINISH_WINDOW_M = 15;

export const SIM_NOISE_M = 5;
export const SIM_TICK_S = 1;

export const OFF_ROUTE_TEXT = 'off route, recalculating';
