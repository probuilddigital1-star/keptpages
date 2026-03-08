import { Line, Group, Circle } from 'react-konva';

export default function DecorativeRule({ x, y, width, style = 'simple', color = '#c2891f', strokeWidth = 1 }) {
  switch (style) {
    case 'diamond':
      return (
        <Group x={x} y={y}>
          <Line points={[0, 0, width, 0]} stroke={color} strokeWidth={strokeWidth} />
          <Circle x={width / 2} y={0} radius={3} fill={color} />
        </Group>
      );

    case 'dots':
      return (
        <Group x={x} y={y}>
          {[0.25, 0.4, 0.5, 0.6, 0.75].map((p, i) => (
            <Circle key={i} x={width * p} y={0} radius={2} fill={color} />
          ))}
        </Group>
      );

    default:
      return (
        <Line x={x} y={y} points={[0, 0, width, 0]} stroke={color} strokeWidth={strokeWidth} />
      );
  }
}
