import { Rect, Line, Circle, Group } from 'react-konva';

export default function PageBackground({ background, width, height }) {
  const bg = background || { type: 'solid', color: '#ffffff' };
  const color = bg.color || '#ffffff';

  return (
    <Group>
      {/* Base solid color */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={color}
        name="background"
      />

      {/* Texture overlay */}
      {bg.texture && <TextureOverlay texture={bg.texture} width={width} height={height} />}
    </Group>
  );
}

function TextureOverlay({ texture, width, height }) {
  switch (texture) {
    case 'linen':
      return <LinenTexture width={width} height={height} />;
    case 'paper-grain':
      return <PaperGrainTexture width={width} height={height} />;
    case 'watercolor-wash':
      return <WatercolorWashTexture width={width} height={height} />;
    case 'parchment':
      return <Rect x={0} y={0} width={width} height={height} fill="#f7f1e3" opacity={0.3} />;
    default:
      return null;
  }
}

function LinenTexture({ width, height }) {
  // Horizontal lines at low opacity
  const lines = [];
  const spacing = 8;
  for (let y = 0; y < height; y += spacing) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, width, y]}
        stroke="#8b7d6b"
        strokeWidth={0.3}
        opacity={0.15}
      />
    );
  }
  // Vertical lines
  for (let x = 0; x < width; x += spacing) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, height]}
        stroke="#8b7d6b"
        strokeWidth={0.3}
        opacity={0.1}
      />
    );
  }
  return <Group>{lines}</Group>;
}

function PaperGrainTexture({ width, height }) {
  // Scattered small dots — limit to 200 for performance
  const dots = [];
  const seed = 42;
  for (let i = 0; i < 200; i++) {
    const px = ((seed * (i + 1) * 7919) % 10000) / 10000 * width;
    const py = ((seed * (i + 1) * 104729) % 10000) / 10000 * height;
    const r = ((seed * (i + 1) * 6571) % 10) / 10 + 0.5;
    dots.push(
      <Circle
        key={i}
        x={px}
        y={py}
        radius={r}
        fill="#8b7d6b"
        opacity={0.08}
      />
    );
  }
  return <Group>{dots}</Group>;
}

function WatercolorWashTexture({ width, height }) {
  // Soft radial gradient effect using concentric rectangles
  const rects = [];
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const inset = (i / steps) * Math.min(width, height) * 0.3;
    rects.push(
      <Rect
        key={i}
        x={inset}
        y={inset}
        width={width - inset * 2}
        height={height - inset * 2}
        fill="#d4c5a9"
        opacity={0.03}
        cornerRadius={inset}
      />
    );
  }
  return <Group>{rects}</Group>;
}
