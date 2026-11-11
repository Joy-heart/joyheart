import test from "node:test";
import assert from "node:assert/strict";
import { getRemovablePhotoObjects } from "../app/lib/photos/cleanup.mjs";

test("cleanup retains approved, pending and rejected objects", () => {
  const candidates = ["approved.webp", "pending.webp", "rejected.webp", "removed.webp", "orphan.webp"];
  const rows = [
    { storage_path: "approved.webp", moderation_status: "approved" },
    { storage_path: "pending.webp", moderation_status: "pending" },
    { storage_path: "rejected.webp", moderation_status: "rejected" },
    { storage_path: "removed.webp", moderation_status: "removed" },
  ];
  assert.deepEqual(getRemovablePhotoObjects(candidates, rows), ["removed.webp", "orphan.webp"]);
});

test("cleanup keeps all referenced photos when no row is removed", () => {
  const candidates = ["a.webp", "b.webp"];
  const rows = [
    { storage_path: "a.webp", moderation_status: "approved" },
    { storage_path: "b.webp", moderation_status: "pending" },
  ];
  assert.deepEqual(getRemovablePhotoObjects(candidates, rows), []);
});

test("cleanup treats missing metadata as an orphan", () => {
  assert.deepEqual(getRemovablePhotoObjects(["orphan.webp"], []), ["orphan.webp"]);
});
