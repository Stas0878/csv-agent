import React from "react";
import { useDrag } from "react-dnd";

export default function DraggableBlock({ id, children, positions }) {
  const [{ isDragging }, drag] = useDrag({
    type: "BLOCK",
    item: { id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const style = {
    position: "absolute",
    left: positions[id]?.x || 0,
    top: positions[id]?.y || 0,
    opacity: isDragging ? 0.7 : 1,
    cursor: "move",
    zIndex: 60,
  };

  return (
    <div ref={drag} style={style}>
      {children}
    </div>
  );
}