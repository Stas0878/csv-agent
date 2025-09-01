import React, { useRef } from "react";
import { useDrag } from "react-dnd";
import { validateAction } from "../core/validation/ValidationEngine";

function buildPanelsPayload(movedId, proposed, elRect) {
  const nodes = Array.from(document.querySelectorAll('[data-testid^="drag-" ]'));
  const rects = nodes.map((n) => {
    const id = (n.getAttribute('data-testid') || '').replace('drag-','');
    const r = n.getBoundingClientRect();
    if (id === movedId) {
      return { id, x: proposed.x, y: proposed.y, w: Math.round(elRect.width), h: Math.round(elRect.height) };
    }
    return { id, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  });
  const topbar = document.querySelector('[data-testid="topbar"]');
  const critical = [];
  if (topbar) {
    const r = topbar.getBoundingClientRect();
    critical.push({ id: 'topbar', x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
  }
  const container = { w: window.innerWidth, h: window.innerHeight };
  return { container, rects, critical };
}

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
      const x = Math.max(0, Math.round(client.x - startRef.current.dx));
      const y = Math.max(0, Math.round(client.y - startRef.current.dy));
      // Validate panels move before committing
      try {
        const el = document.querySelector(`[data-testid="${testId || id}"]`);
        const elRect = el ? el.getBoundingClientRect() : { width: 200, height: 100 };
        const payload = buildPanelsPayload((testId || id).replace('drag-',''), { x, y }, elRect);
        const res = validateAction({ type: 'panels/move', payload });
        if (!res.valid) {
          console.warn('Move blocked by validation:', res.errors);
          return;
        }
      } catch (e) {}
      updatePosition?.(id, x, y);
      onDragEnd?.(id, x, y);
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
    <div ref={drag} style={style} data-testid={testId || id}>
      {children}
    </div>
  );
}