// -----------------------------------------------------------------------------
// Roborock room mapping normalization.
//
// `get_room_mapping` returns the active map's segment ids paired with the IoT
// room ids used by HomeData. The robot knows the segments, while the cloud home
// data carries their human-readable names; both sources are therefore required.
// -----------------------------------------------------------------------------

/**
 * Convert a get_room_mapping response into rooms usable by Gladys.
 * Roborock has been observed returning either one flat pair or a list of pairs.
 * Some transports additionally wrap the result in a single-element array.
 * @param {*} response raw get_room_mapping RPC result
 * @param {Array<object>} homeRooms HomeData.rooms (`{ id, name }`)
 * @returns {Array<{id: number, name: string}>} active-map rooms
 */
export function normalizeRoomMappings(response, homeRooms = []) {
  let entries = response;

  if (
    Array.isArray(entries) &&
    entries.length === 1 &&
    Array.isArray(entries[0]) &&
    Array.isArray(entries[0][0])
  ) {
    [entries] = entries;
  }

  if (Array.isArray(entries) && entries.length >= 2 && !Array.isArray(entries[0])) {
    entries = [entries];
  }

  if (!Array.isArray(entries)) {
    return [];
  }

  const namesByIotId = new Map(
    homeRooms
      .filter((room) => room && room.id !== undefined && room.id !== null)
      .map((room) => [String(room.id), String(room.name || '').trim()]),
  );

  const seenSegmentIds = new Set();
  const rooms = [];

  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length < 2) {
      continue;
    }

    const segmentId = Number(entry[0]);

    if (!Number.isSafeInteger(segmentId) || segmentId < 0 || seenSegmentIds.has(segmentId)) {
      continue;
    }

    seenSegmentIds.add(segmentId);

    const name = namesByIotId.get(String(entry[1]));

    rooms.push({
      id: segmentId,
      name: name || `Room ${segmentId}`,
    });
  }

  return rooms;
}
