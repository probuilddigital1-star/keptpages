import { useState, useEffect } from 'react';
import { Text, Rect, Circle, Line, Image as KonvaImage, Group } from 'react-konva';
import { config } from '@/config/env';
import api from '@/services/api';
import PhotoFrame from '../elements/PhotoFrame';

// Custom hook that fetches images with auth headers
function useAuthImage(imageKey) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!imageKey) {
      setImage(null);
      return;
    }

    let cancelled = false;
    let objectUrl = null;

    (async () => {
      try {
        const blob = await api.getBlob(`/images/${imageKey}`);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        const img = new window.Image();
        img.onload = () => {
          if (!cancelled) setImage(img);
        };
        img.onerror = () => {
          if (!cancelled) setImage(null);
        };
        img.src = objectUrl;
      } catch {
        if (!cancelled) setImage(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageKey]);

  return image;
}

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
  const image = useAuthImage(element.imageKey);

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
            text="Double-click to add image"
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
