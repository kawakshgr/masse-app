/**
 * What a drag from the library into a day column is carrying.
 *
 * Two MIME types rather than one carrying JSON, because `dragover` may read
 * `dataTransfer.types` but never `getData` — the browser withholds the payload
 * until the drop. So the kind has to be legible from the type alone, or the day
 * column cannot tell a copy from a move and has to guess a `dropEffect`. A
 * `dropEffect` that `effectAllowed` does not permit cancels the drop, and it
 * does so silently.
 */
export const NEW_EXERCISE = "application/x-masse-exercise-new";
export const MOVE_EXERCISE = "application/x-masse-exercise-move";

export type DragPayload =
  | { kind: "new"; name: string }
  | { kind: "move"; exerciseId: string };

/** Always call this on dragstart: with no data set, the drag never begins. */
export function writeDrag(data: DataTransfer, payload: DragPayload) {
  if (payload.kind === "new") {
    data.setData(NEW_EXERCISE, payload.name);
    data.setData("text/plain", payload.name);
    data.effectAllowed = "copy";
    return;
  }
  data.setData(MOVE_EXERCISE, payload.exerciseId);
  data.setData("text/plain", payload.exerciseId);
  data.effectAllowed = "move";
}

/**
 * The effect to advertise while hovering — null when the drag is none of ours,
 * which is how a day column knows to leave a file or a text selection alone.
 */
export function dragEffect(data: DataTransfer): "copy" | "move" | null {
  if (data.types.includes(NEW_EXERCISE)) return "copy";
  if (data.types.includes(MOVE_EXERCISE)) return "move";
  return null;
}

export function readDrag(data: DataTransfer): DragPayload | null {
  const name = data.getData(NEW_EXERCISE);
  if (name) return { kind: "new", name };

  const exerciseId = data.getData(MOVE_EXERCISE);
  if (exerciseId) return { kind: "move", exerciseId };

  return null;
}
