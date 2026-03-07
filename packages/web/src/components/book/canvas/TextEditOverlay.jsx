import { useRef, useEffect, useState } from 'react';

export default function TextEditOverlay({
  element,
  fontFamily,
  scale,
  canvasWidth,
  canvasHeight,
  onDone,
  onCancel,
}) {
  const textareaRef = useRef(null);
  const [text, setText] = useState(element.text || '');

  // Position the textarea over the Konva text element
  const left = element.x * canvasWidth * scale;
  const top = element.y * canvasHeight * scale;
  const width = element.width * canvasWidth * scale;
  const height = Math.max(element.height * canvasHeight * scale, 40);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleBlur = () => {
    onDone(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    // Ctrl/Cmd+Enter to confirm
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onDone(text);
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="absolute border-2 border-terracotta bg-white/95 p-1 outline-none resize-none overflow-hidden"
      style={{
        left,
        top,
        width,
        minHeight: height,
        fontFamily,
        fontSize: (element.fontSize || 14) * scale,
        fontWeight: element.fontWeight || 'normal',
        fontStyle: element.fontStyle || 'normal',
        color: element.color || '#2C1810',
        textAlign: element.alignment || 'left',
        lineHeight: 1.5,
        zIndex: 10,
      }}
    />
  );
}
