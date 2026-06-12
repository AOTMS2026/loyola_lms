import { useEffect, useState } from "react";

const CustomCursor = () => {
  const [pos, setPos] = useState({ x: -999, y: -999 });
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      setHovering(
        t.tagName === "BUTTON" ||
        t.tagName === "A" ||
        !!t.closest("button") ||
        !!t.closest("a") ||
        !!t.closest("[role='button']") ||
        window.getComputedStyle(t).cursor === "pointer"
      );
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  // Don't render on touch devices
  if (typeof window !== "undefined" && !window.matchMedia("(pointer: fine)").matches) {
    return null;
  }

  // Nothing rendered until mouse moves — prevents white dot on load
  if (!visible) return null;

  return (
    <>
      <style>{`body { cursor: default; }`}</style>
      {/* Ring */}
      <div
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          width: hovering ? 44 : 28,
          height: hovering ? 44 : 28,
          transform: "translate(-50%, -50%)",
          border: hovering ? "2px solid rgba(253,90,26,0.6)" : "1.5px solid rgba(0,117,207,0.7)",
          background: hovering ? "rgba(253,90,26,0.08)" : "transparent",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 10000,
          transition: "width 0.15s, height 0.15s, border 0.15s",
        }}
      />
      {/* Dot */}
      {!hovering && (
        <div
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            width: 6,
            height: 6,
            transform: "translate(-50%, -50%)",
            background: "#0075CF",
            borderRadius: "50%",
            pointerEvents: "none",
            zIndex: 10001,
          }}
        />
      )}
    </>
  );
};

export default CustomCursor;