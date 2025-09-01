import { useState } from "react";

export default function useDraggablePanels(defaultPositions) {
  const [positions, setPositions] = useState(() => {
    try {
      const saved = localStorage.getItem("panelPositions");
      return saved ? JSON.parse(saved) : defaultPositions;
    } catch (e) {
      return defaultPositions;
    }
  });

  const updatePosition = (id, x, y) => {
    const newPositions = { ...positions, [id]: { x, y } };
    setPositions(newPositions);
    try { localStorage.setItem("panelPositions", JSON.stringify(newPositions)); } catch (_) {}
  };

  return [positions, updatePosition];
}