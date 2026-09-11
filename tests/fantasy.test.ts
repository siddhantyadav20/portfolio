import { describe, expect, it } from "vitest";
import { leader, rankMove, weekTally, type ApiPicks } from "@/lib/fantasy";
import { countdownLabel } from "@/components/home/FantasyCard/countdownLabel";

const MIN = 60_000;

describe("countdownLabel", () => {
  it("says days and hours when kickoff is a day or more away", () => {
    expect(countdownLabel((47 * 60 + 5) * MIN)).toBe("1d 23h");
  });

  it("says hours and minutes inside a day", () => {
    expect(countdownLabel((5 * 60 + 12) * MIN)).toBe("5h 12m");
  });

  it("never says 0m while there is still time to go", () => {
    expect(countdownLabel(20_000)).toBe("1m");
  });

  it("hands back null once kickoff has passed", () => {
    expect(countdownLabel(0)).toBeNull();
    expect(countdownLabel(-MIN)).toBeNull();
  });
});

describe("rankMove", () => {
  it("reads a smaller rank as up", () => {
    expect(rankMove(664_382, 2_439_660)).toBe("up");
    expect(rankMove(2_439_660, 1_282_717)).toBe("down");
    expect(rankMove(500, 500)).toBe("same");
  });

  it("draws nothing without a week to compare against", () => {
    expect(rankMove(664_382, null)).toBeNull();
    expect(rankMove(null, 664_382)).toBeNull();
  });
});

describe("weekTally", () => {
  const pick = (element: number, multiplier: number, role: "c" | "v" | "" = "") => ({
    element,
    multiplier,
    is_captain: role === "c",
    is_vice_captain: role === "v",
  });
  const scores = (rows: [number, number, number][]) =>
    new Map(rows.map(([id, points, minutes]) => [id, { points, minutes }]));

  it("counts starters, doubles the captain, and ignores the bench", () => {
    const picks: ApiPicks = { picks: [pick(1, 2, "c"), pick(2, 1, "v"), pick(3, 0)] };
    const live = scores([
      [1, 9, 90],
      [2, 5, 90],
      [3, 12, 90],
    ]);
    expect(weekTally(picks, live, true)).toEqual(
      new Map([
        [1, 18],
        [2, 5],
      ]),
    );
  });

  it("applies the automatic substitutions the API lists beside the picks", () => {
    const picks: ApiPicks = {
      picks: [pick(1, 1), pick(2, 0)],
      automatic_subs: [{ element_in: 2, element_out: 1 }],
    };
    const live = scores([
      [1, 0, 0],
      [2, 6, 90],
    ]);
    expect(weekTally(picks, live, true)).toEqual(new Map([[2, 6]]));
  });

  it("passes the armband to the vice-captain when the captain does not play", () => {
    const picks: ApiPicks = { picks: [pick(1, 3, "c"), pick(2, 1, "v")] };
    const live = scores([
      [1, 0, 0],
      [2, 7, 90],
    ]);
    // A Triple Captain passes on 3, not 2.
    expect(weekTally(picks, live, true).get(2)).toBe(21);
  });

  it("leaves the armband alone while the week is still being played", () => {
    const picks: ApiPicks = { picks: [pick(1, 2, "c"), pick(2, 1, "v")] };
    const live = scores([
      [1, 0, 0],
      [2, 7, 90],
    ]);
    expect(weekTally(picks, live, false).get(2)).toBe(7);
  });
});

describe("leader", () => {
  it("picks the highest season total", () => {
    expect(
      leader(
        new Map([
          [10, 23],
          [11, 48],
          [12, 22],
        ]),
      ),
    ).toEqual({ element: 11, points: 48 });
  });

  it("gives a tie to whoever got there first, and nothing to an empty season", () => {
    expect(
      leader(
        new Map([
          [10, 30],
          [11, 30],
        ]),
      ),
    ).toEqual({ element: 10, points: 30 });
    expect(leader(new Map())).toBeNull();
  });
});
