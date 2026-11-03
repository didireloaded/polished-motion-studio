import { describe, expect, it } from "vitest";
import {
  getRandomFridayState,
  RANDOM_FRIDAY_DURATION_SECONDS,
  randomFridayElevatorLines,
} from "./random-friday";

describe("random-friday", () => {
  it("detects the live Friday 10:00–11:00 AM window", () => {
    // Friday, Nov 6, 2026 at 10:15:00 local time
    const fridayTenFifteen = new Date(2026, 10, 6, 10, 15, 0);
    const state = getRandomFridayState(fridayTenFifteen);
    expect(state.status).toBe("live");
    expect(state.isLiveWindow).toBe(true);
    expect(state.headline).toContain("ENTER RANDOM FRIDAY");
    expect(RANDOM_FRIDAY_DURATION_SECONDS).toBe(30);
    expect(randomFridayElevatorLines).toHaveLength(3);
  });

  it("detects the 09:45–09:59 AM starting_soon window on Friday", () => {
    // Friday, Nov 6, 2026 at 09:50:00 local time
    const fridayNineFifty = new Date(2026, 10, 6, 9, 50, 0);
    const state = getRandomFridayState(fridayNineFifty);
    expect(state.status).toBe("starting_soon");
    expect(state.isLiveWindow).toBe(false);
    expect(state.minutesUntil).toBe(10);
    expect(state.headline).toContain("starts in 10m");
  });

  it("computes days and hours until next Friday 10:00 AM when outside the window", () => {
    // Tuesday, Nov 3, 2026 at 22:00:00 local time
    const tuesdayNight = new Date(2026, 10, 3, 22, 0, 0);
    const state = getRandomFridayState(tuesdayNight);
    expect(state.status).toBe("countdown");
    expect(state.isLiveWindow).toBe(false);
    expect(state.daysUntil).toBe(2);
    expect(state.hoursUntil).toBe(12);
    expect(state.headline).toContain("Next Random Friday in 2 days, 12 hours");
  });
});
