import { strict as assert } from "node:assert";
import { test } from "node:test";
import { HttpsError } from "firebase-functions/v2/https";
import { nextSpudJarRecord, parseSpudJarBatchCount } from "./spud-jar";

test("add creates missing jar and records actor metadata", () => {
  assert.deepEqual(nextSpudJarRecord(null, "add", "member-1", 123), {
    total: 1,
    cycle: 0,
    updatedAt: 123,
    updatedBy: "member-1",
  });
});

test("sequential adds preserve every increment", () => {
  const first = nextSpudJarRecord({ total: 8 }, "add", "member-1", 100);
  const second = nextSpudJarRecord(first, "add", "member-2", 101);
  assert.equal(second.total, 10);
  assert.equal(second.updatedBy, "member-2");
});

test("batched add increments by the validated complaint count", () => {
  assert.equal(nextSpudJarRecord({ total: 8 }, "add", "member-1", 100, 12).total, 20);
  assert.equal(parseSpudJarBatchCount({ count: 1_000 }), 1_000);
});

test("capacity breaks the jar and starts a new cycle", () => {
  assert.deepEqual(
    nextSpudJarRecord(
      { total: 104, cycle: 4 },
      "add",
      "member-1",
      123,
    ),
    { total: 0, cycle: 5, updatedAt: 123, updatedBy: "member-1" },
  );
});

test("capacity carries batched overflow into the new jar", () => {
  const result = nextSpudJarRecord(
    { total: 103, cycle: 2 },
    "add",
    "member-1",
    123,
    4,
  );
  assert.equal(result.total, 2);
  assert.equal(result.cycle, 3);
});

test("legacy totals above capacity normalize into jar cycles", () => {
  const result = nextSpudJarRecord(
    { total: 212 },
    "add",
    "member-1",
    123,
  );
  assert.equal(result.total, 3);
  assert.equal(result.cycle, 2);
});

test("batched add rejects invalid complaint counts", () => {
  for (const count of [0, 1_001, 1.5, "3", null]) {
    assert.throws(
      () => parseSpudJarBatchCount({ count }),
      (error) => error instanceof HttpsError && error.code === "invalid-argument",
    );
  }
});

test("undo subtracts exactly one", () => {
  assert.equal(nextSpudJarRecord({ total: 3 }, "undo", "member-1", 123).total, 2);
});

test("undo crosses a visual jar boundary without losing lifetime total", () => {
  const result = nextSpudJarRecord(
    { total: 0, cycle: 2 },
    "undo",
    "member-1",
    123,
  );
  assert.equal(result.total, 104);
  assert.equal(result.cycle, 1);
});

test("batched undo crosses visual jar boundaries atomically", () => {
  const result = nextSpudJarRecord(
    { total: 3, cycle: 2 },
    "undo",
    "member-1",
    123,
    8,
  );
  assert.equal(result.total, 100);
  assert.equal(result.cycle, 1);
});

test("batched undo rejects removal beyond lifetime total", () => {
  assert.throws(
    () => nextSpudJarRecord(
      { total: 3, cycle: 0 },
      "undo",
      "member-1",
      123,
      4,
    ),
    (error) => error instanceof HttpsError && error.code === "failed-precondition",
  );
});

test("undo rejects an empty jar", () => {
  assert.throws(
    () => nextSpudJarRecord({ total: 0 }, "undo", "member-1", 123),
    (error) => error instanceof HttpsError && error.code === "failed-precondition",
  );
});

test("reset sets total to zero", () => {
  assert.deepEqual(
    nextSpudJarRecord(
      { total: 42, cycle: 3 },
      "reset",
      "member-1",
      123,
    ),
    { total: 0, cycle: 0, updatedAt: 123, updatedBy: "member-1" },
  );
});

test("malformed and overflowing totals are rejected", () => {
  for (const total of [-1, 1.5, "4", Number.NaN]) {
    assert.throws(() => nextSpudJarRecord({ total }, "add", "member-1", 123));
  }
  assert.throws(
    () => nextSpudJarRecord(
      { total: 104, cycle: Number.MAX_SAFE_INTEGER },
      "add",
      "member-1",
      123,
      2,
    ),
    (error) => error instanceof HttpsError && error.code === "resource-exhausted",
  );
});
