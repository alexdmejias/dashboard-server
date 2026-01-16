import CallbackYearProgress from "./index";

describe("CallbackYearProgress", () => {
  let callback: CallbackYearProgress;

  beforeEach(() => {
    callback = new CallbackYearProgress();
  });

  it("should return data with date and days array", async () => {
    const result = await callback.getData();

    expect(result).toHaveProperty("date");
    expect(result).toHaveProperty("days");
    expect(typeof result.date).toBe("string");
    expect(Array.isArray(result.days)).toBe(true);
    expect(result.days).toHaveLength(12);
  });

  it("should use America/New_York timezone for date calculation", async () => {
    // Mock Date to simulate a time when UTC and EST dates differ
    // Jan 13, 2026 at 4:00 AM UTC = Jan 12, 2026 at 11:00 PM EST
    const mockDate = new Date("2026-01-13T04:00:00.000Z");
    jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);

    const result = await callback.getData();

    // In New York timezone, it should be Jan 12, 2026
    // The date string should contain "Jan" and "12"
    expect(result.date).toContain("Jan");
    expect(result.date).toContain("12");
    expect(result.date).toContain("2026");

    // January is month 0, so days[0] should have 12 days completed
    expect(result.days[0][0]).toBe(12); // 12 days completed
    expect(result.days[0][1]).toBe(19); // 19 days remaining (31 - 12)

    jest.restoreAllMocks();
  });

  it("should format date with weekday, month, day, and year", async () => {
    const result = await callback.getData();

    // Check that the date string follows expected format: "Day, Mon DD, YYYY"
    // Example: "Sun, Jan 12, 2026"
    const datePattern = /^[A-Za-z]{3}, [A-Za-z]{3} \d{1,2}, \d{4}$/;
    expect(result.date).toMatch(datePattern);
  });

  it("should correctly calculate days for all 12 months", async () => {
    const result = await callback.getData();

    // Each month should have [completed, remaining] days
    result.days.forEach((month, index) => {
      expect(month).toHaveLength(2);
      expect(typeof month[0]).toBe("number");
      expect(typeof month[1]).toBe("number");
      
      // Sum of completed and remaining should equal days in that month
      const totalDays = month[0] + month[1];
      expect(totalDays).toBeGreaterThan(27); // All months have at least 28 days
      expect(totalDays).toBeLessThan(32); // No month has more than 31 days
    });
  });

  it("should work regardless of server timezone", async () => {
    // This test verifies that the callback produces consistent results
    // even when the server is in a different timezone
    
    // Save original timezone
    const originalTZ = process.env.TZ;

    try {
      // Test with UTC timezone
      process.env.TZ = "UTC";
      const resultUTC = await callback.getData();

      // Test with Asia/Tokyo timezone (UTC+9)
      process.env.TZ = "Asia/Tokyo";
      const resultTokyo = await callback.getData();

      // Both should produce the same date for the current moment
      // because they both use America/New_York timezone internally
      expect(resultUTC.date).toBe(resultTokyo.date);
      expect(resultUTC.days).toEqual(resultTokyo.days);
    } finally {
      // Restore original timezone
      if (originalTZ !== undefined) {
        process.env.TZ = originalTZ;
      } else {
        delete process.env.TZ;
      }
    }
  });
});
