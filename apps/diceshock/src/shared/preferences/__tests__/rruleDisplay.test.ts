import { describe, expect, it } from "vitest";
import { rruleToHumanReadable } from "../rruleDisplay";

describe("rruleToHumanReadable", () => {
  it("converts single weekday", () => {
    expect(
      rruleToHumanReadable("FREQ=WEEKLY;BYDAY=WE;DTSTART=T19:00;DTEND=T22:00"),
    ).toBe("每周三 19:00-22:00");
  });

  it("converts weekdays to 工作日", () => {
    expect(
      rruleToHumanReadable(
        "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;DTSTART=T19:00;DTEND=T22:00",
      ),
    ).toBe("工作日 19:00-22:00");
  });

  it("converts weekends", () => {
    expect(
      rruleToHumanReadable(
        "FREQ=WEEKLY;BYDAY=SA,SU;DTSTART=T14:00;DTEND=T22:00",
      ),
    ).toBe("每周六、日 14:00-22:00");
  });

  it("converts multiple specific days", () => {
    expect(
      rruleToHumanReadable(
        "FREQ=WEEKLY;BYDAY=MO,WE,FR;DTSTART=T19:00;DTEND=T22:00",
      ),
    ).toBe("每周一、三、五 19:00-22:00");
  });

  it("handles no BYDAY (every day)", () => {
    expect(
      rruleToHumanReadable("FREQ=WEEKLY;DTSTART=T19:00;DTEND=T22:00"),
    ).toBe("每天 19:00-22:00");
  });

  it("handles no time window", () => {
    expect(rruleToHumanReadable("FREQ=WEEKLY;BYDAY=SA")).toBe("每周六");
  });

  it("handles start time only", () => {
    expect(rruleToHumanReadable("FREQ=WEEKLY;BYDAY=WE;DTSTART=T19:00")).toBe(
      "每周三 19:00 起",
    );
  });
});
