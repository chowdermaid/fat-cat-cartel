import assert from "node:assert/strict";
import { test } from "node:test";
import { getHomeGreeting } from "../src/features/home/utils/greeting.ts";

for (const [month, offset] of [["01", "+11:00"], ["07", "+10:00"]]) {
  test(`Sydney greetings respect time boundaries in month ${month}`, () => {
    for (const [time, greeting] of [
      ["00:59:59", "Good evening, Axo!"],
      ["01:00:00", "Go sleep, you gremlin!"],
      ["04:59:59", "Go sleep, you gremlin!"],
      ["05:00:00", "Good morning, Axo!"],
      ["11:59:59", "Good morning, Axo!"],
      ["12:00:00", "Good afternoon, Axo!"],
      ["17:59:59", "Good afternoon, Axo!"],
      ["18:00:00", "Good evening, Axo!"],
      ["23:59:59", "Good evening, Axo!"],
    ]) {
      assert.equal(getHomeGreeting(new Date(`2026-${month}-15T${time}${offset}`), "Axo"), greeting);
    }
  });
}

test("visitor greetings omit names; personalized greetings preserve full character names", () => {
  const morning = new Date("2026-09-09T09:00:00+10:00");
  for (const name of [undefined, null, "", "  "]) assert.equal(getHomeGreeting(morning, name), "Good morning!");
  assert.equal(getHomeGreeting(morning, "  Axo Lotl  "), "Good morning, Axo Lotl!");
  assert.equal(getHomeGreeting(new Date("2026-09-09T01:00:00+10:00")), "Go sleep, you gremlin!");
});

test("weekend wishes and birthdays use Sydney date, with gremlin taking priority", () => {
  assert.equal(getHomeGreeting(new Date("2026-09-11T23:00:00Z"), "Axo"), "Good morning, Axo! Happy Saturday!");
  assert.equal(getHomeGreeting(new Date("2026-09-13T09:00:00+10:00")), "Good morning! Happy Sunday!");
  assert.equal(getHomeGreeting(new Date("2026-09-12T09:00:00+10:00"), "Axo", "09-12"), "Happy birthday, Axo!");
  assert.equal(getHomeGreeting(new Date("2026-09-12T01:00:00+10:00"), "Axo", "09-12"), "Go sleep, you gremlin!");
  assert.equal(getHomeGreeting(new Date("2026-09-09T09:00:00+10:00"), "Axo", "bad-date"), "Good morning, Axo!");
});
