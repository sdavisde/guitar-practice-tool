import { describe, expect, it } from "vitest";
import { detectPhrases, Section } from "./engine";
import { clampPosition, playablePositions, stepPhrase, stepSection } from "./play-navigation";

const toks = (s: string) => s.split(/\s+/).filter(Boolean);
const sec = (name: string, text: string): Section => ({ name, phrases: detectPhrases(toks(text), "G") });
const song: Section[] = [
  sec("Verse", "1 5 6m 4 1 5 6m 4"),   // two phrases
  sec("Bridge", ""),                   // nothing to play
  sec("Chorus", "4 5 6m 1"),           // one phrase
];

describe("play navigation", () => {
  it("lists every phrase with chords in song order", () => {
    expect(playablePositions(song)).toEqual([
      { section: 0, phrase: 0 }, { section: 0, phrase: 1 }, { section: 2, phrase: 0 },
    ]);
  });

  it("moves between phrases across sections and clamps at the ends", () => {
    expect(stepPhrase(song, { section: 0, phrase: 1 }, 1)).toEqual({ section: 2, phrase: 0 });
    expect(stepPhrase(song, { section: 2, phrase: 0 }, 1)).toEqual({ section: 2, phrase: 0 });
    expect(stepPhrase(song, { section: 2, phrase: 0 }, -1)).toEqual({ section: 0, phrase: 1 });
    expect(stepPhrase(song, { section: 0, phrase: 0 }, -1)).toEqual({ section: 0, phrase: 0 });
  });

  it("jumps to the first phrase of the next section that has one", () => {
    expect(stepSection(song, { section: 0, phrase: 1 }, 1)).toEqual({ section: 2, phrase: 0 });
    expect(stepSection(song, { section: 2, phrase: 0 }, -1)).toEqual({ section: 0, phrase: 0 });
    expect(stepSection(song, { section: 2, phrase: 0 }, 1)).toEqual({ section: 2, phrase: 0 });
  });

  it("clamps a stale selection to the nearest phrase before it", () => {
    expect(clampPosition(song, { section: 0, phrase: 1 })).toEqual({ section: 0, phrase: 1 });
    expect(clampPosition(song, { section: 0, phrase: 5 })).toEqual({ section: 0, phrase: 1 });
    expect(clampPosition(song, { section: 1, phrase: 0 })).toEqual({ section: 0, phrase: 1 });
    expect(clampPosition([sec("Empty", "")], { section: 0, phrase: 0 })).toBeNull();
  });
});
