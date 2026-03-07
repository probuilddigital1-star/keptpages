import { Text, Rect, Circle, Line, Image as KonvaImage, Group } from 'react-konva';
import useImage from 'use-image';
import { config } from '@/config/env';
import PhotoFrame from '../elements/PhotoFrame';

export default function CanvasElement({
  element,
  isSelected,
  isEditing,
  fontFamily,
  canvasWidth,
  canvasHeight,
  onClick,
  onDblClick,
  onDragEnd,
  onTransformEnd,
}) {
  // Convert normalized coords to canvas pixels
  const x = element.x * canvasWidth;
  const y = element.y * canvasHeight;
  const width = element.width * canvasWidth;
  const height = element.height * canvasHeight;
  const rotation = element.rotation || 0;

  const commonProps = {
    id: element.id,
    x,
    y,
    width,
    height,
    rotation,
    draggable: true,
    onClick,
    onTap: onClick,
    onDblClick,
    onDblTap: onDblClick,
    onDragEnd,
    onTransformEnd,
  };

  switch (element.type) {
    case 'text':
      return (
        <Text
          {...commonProps}
          text={isEditing ? '' : (element.text || '')}
          fontSize={element.fontSize || 14}
          fontFamily={fontFamily}
          fontStyle={`${element.fontWeight === 'bold' ? 'bold ' : ''}${element.fontStyle === 'italic' ? 'italic' : 'normal'}`}
          fill={element.color || '#2C1810'}
          align={element.alignment || 'left'}
          wrap="word"
          lineHeight={1.5}
        />
      );

    case 'image':
      return (
        <ImageElement
          {...commonProps}
          element={element}
        />
      );

    case 'shape':
      return <ShapeElement {...commonProps} element={element} />;

    case 'decorative':
      return <DecorativeElement {...commonProps} element={element} />;

    default:
      return null;
  }
}

function ImageElement({ element, ...props }) {
  const imageUrl = element.imageKey
    ? `${config.apiUrl}/images/${element.imageKey}`
    : null;
  const [image] = useImage(imageUrl, 'anonymous');

  const { x, y, width, height, rotation, ...restProps } = props;
  const frameStyle = element.frameStyle || 'none';

  if (frameStyle !== 'none') {
    return (
      <PhotoFrame
        x={x}
        y={y}
        width={width}
        height={height}
        rotation={rotation}
        frameStyle={frameStyle}
        image={image}
        {...restProps}
      />
    );
  }

  return (
    <Group x={x} y={y} rotation={rotation} {...restProps}>
      {image ? (
        <KonvaImage
          image={image}
          width={width}
          height={height}
        />
      ) : (
        <>
          <Rect
            width={width}
            height={height}
            fill="#f0ebe3"
            stroke="#d1c7b7"
            strokeWidth={1}
          />
          <Text
            text="Drop image"
            width={width}
            height={height}
            align="center"
            verticalAlign="middle"
            fontSize={12}
            fill="#999"
          />
        </>
      )}
    </Group>
  );
}

function ShapeElement({ element, ...props }) {
  const { x, y, width, height, ...restProps } = props;

  if (element.shapeType === 'circle') {
    const radius = Math.min(width, height) / 2;
    return (
      <Circle
        {...restProps}
        x={x + width / 2}
        y={y + height / 2}
        radius={radius}
        stroke={element.stroke || '#c2891f'}
        strokeWidth={element.strokeWidth || 1}
        fill={element.fill === 'transparent' ? undefined : element.fill}
        width={width}
        height={height}
      />
    );
  }

  // Default: rectangle
  return (
    <Rect
      {...props}
      stroke={element.stroke || '#c2891f'}
      strokeWidth={element.strokeWidth || 1}
      fill={element.fill === 'transparent' ? undefined : element.fill}
    />
  );
}

function DecorativeElement({ element, ...props }) {
  const { x, y, width, height, ...restProps } = props;

  // Line
  return (
    <Line
      {...restProps}
      x={x}
      y={y}
      points={[0, 0, width, 0]}
      stroke={element.stroke || '#c2891f'}
      strokeWidth={element.strokeWidth || 1}
      width={width}
      height={height}
    />
  );
}
