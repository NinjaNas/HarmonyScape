import { log } from "@functions/canvasActionFunctions";
import { useKeyCombo } from "@rwh/react-keystrokes";

export const useShortcuts = () => {
  log({ vals: "useShortcuts.tsx", options: { tag: "Render" } });
  const isUndo = useKeyCombo("control + z");
  const isUndoMac = useKeyCombo("meta + z");
  const isRedo = useKeyCombo("control + y");
  const isRedoMac = useKeyCombo("meta + shift + z");

  return { isUndo, isUndoMac, isRedo, isRedoMac };
};
