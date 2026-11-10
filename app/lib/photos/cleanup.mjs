export function getRemovablePhotoObjects(candidates, referencedRows) {
  const retainedPaths = new Set(
    (referencedRows ?? [])
      .filter((row) => row.moderation_status !== "removed")
      .map((row) => row.storage_path),
  );
  return candidates.filter((path) => !retainedPaths.has(path));
}
