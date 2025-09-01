import React, { useRef } from "react";
import { useDrag } from "react-dnd";

export default function DraggableBlock({ id, children, positions, updatePosition, containerRef, onDragEnd, testId }) {
  const startRef = useRef({ dx: 0, dy: 0 });

  const [{ isDragging }, drag] = useDrag({
    type: "BLOCK",
    item: { id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    begin: (monitor) => {
      const client = monitor.getClientOffset();
      const pos = positions?.[id] || { x: 0, y: 0 };
      if (client) {
        startRef.current.dx = client.x - pos.x;
        startRef.current.dy = client.y - pos.y;
      }
    },
    end: (item, monitor) => {
      const client = monitor.getClientOffset();
      if (!client) return;
      const cRect = containerRef?.current?.getBoundingClientRect?.() || { left: 0, top: 0 };
      const x = Math.max(0, Math.round(client.x - startRef.current.dx));
      const y = Math.max(0, Math.round(client.y - startRef.current.dy));
      updatePosition?.(id, x, y);
      onDragEnd?.(id, x - cRect.left, y - cRect.top);
    },
  });

  const style = {
    position: "absolute",
    left: positions?.[id]?.x || 0,
    top: positions?.[id]?.y || 0,
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