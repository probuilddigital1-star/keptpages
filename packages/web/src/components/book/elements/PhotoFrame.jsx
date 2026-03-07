import { Group, Rect, Image as KonvaImage, Line, Text } from 'react-konva';

export default function PhotoFrame({
  x, y, width, height, rotation,
  frameStyle, image,
  ...restProps
}) {
  const padding = frameStyle === 'polaroid' ? { top: 8, sides: 8, bottom: 40 } : { top: 0, sides: 0, bottom: 0 };

  switch (frameStyle) {
    case 'simple':
      return (
        <Group x={x} y={y} rotation={rotation} {...restProps}>
          <Rect width={width} height={height} stroke="#2C1810" strokeWidth={1} />
          {image && <KonvaImage image={image} x={1} y={1} width={width - 2} height={height - 2} />}
          {!image && <PlaceholderRect width={width} height={height} />}
        </Group>
      );

    case 'double':
      return (
        <Group x={x} y={y} rotation={rotation} {...restProps}>
          <Rect width={width} height={height} stroke="#2C1810" strokeWidth={1} />
          <Rect x={4} y={4} width={width - 8} height={height - 8} stroke="#2C1810" strokeWidth={1} />
          {image && <KonvaImage image={image} x={6} y={6} width={width - 12} height={height - 12} />}
          {!image && <PlaceholderRect width={width} height={height} />}
        </Group>
      );

    case 'ornate':
      return (
        <Group x={x} y={y} rotation={rotation} {...restProps}>
          <Rect width={width} height={height} stroke="#c2891f" strokeWidth={2} />
          {/* Corner ornaments */}
          <CornerOrnament cx={0} cy={0} size={12} />
          <CornerOrnament cx={width} cy={0} size={12} />
          <CornerOrnament cx={0} cy={height} size={12} />
          <CornerOrnament cx={width} cy={height} size={12} />
          {image && <KonvaImage image={image} x={3} y={3} width={width - 6} height={height - 6} />}
          {!image && <PlaceholderRect width={width} height={height} />}
        </Group>
      );

    case 'polaroid':
      return (
        <Group x={x} y={y} rotation={rotation} {...restProps}>
          <Rect
            width={width}
            height={height}
            fill="#ffffff"
            shadowColor="rgba(0,0,0,0.2)"
            shadowBlur={8}
            shadowOffsetY={2}
          />
          {image && (
            <KonvaImage
              image={image}
              x={padding.sides}
              y={padding.top}
              width={width - padding.sides * 2}
              height={height - padding.top - padding.bottom}
            />
          )}
          {!image && (
            <Rect
              x={padding.sides}
              y={padding.top}
              width={width - padding.sides * 2}
              height={height - padding.top - padding.bottom}
              fill="#f0ebe3"
            />
          )}
        </Group>
      );

    case 'shadow':
      return (
        <Group x={x} y={y} rotation={rotation} {...restProps}>
          <Rect
            x={4}
            y={4}
            width={width}
            height={height}
            fill="rgba(0,0,0,0.15)"
            cornerRadius={1}
          />
          <Rect width={width} height={height} fill="#ffffff" />
          {image && <KonvaImage image={image} x={2} y={2} width={width - 4} height={height - 4} />}
          {!image && <PlaceholderRect width={width} height={height} />}
        </Group>
      );

    default:
      return (
        <Group x={x} y={y} rotation={rotation} {...restProps}>
          {image && <KonvaImage image={image} width={width} height={height} />}
          {!image && <PlaceholderRect width={width} height={height} />}
        </Group>
      );
  }
}

function PlaceholderRect({ width, height }) {
  return (
    <>
      <Rect width={width} height={height} fill="#f0ebe3" stroke="#d1c7b7" strokeWidth={1} />
      <Text text="Image" width={width} height={height} align="center" verticalAlign="middle" fontSize={11} fill="#999" />
    </>
  );
}

function CornerOrnament({ cx, cy, size }) {
  return (
    <Line
      points={[cx - size / 2, cy, cx, cy, cx, cy - size / 2]}
      stroke="#c2891f"
      strokeWidth={1.5}
    />
  );
}
