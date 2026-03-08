const MAX_DIMENSION = 3000;
const JPEG_QUALITY = 0.85;

export function processImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Resize if needed
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Enhance contrast
      const imageData = ctx.getImageData(0, 0, width, height);
      enhanceContrast(imageData.data);
      ctx.putImageData(imageData, 0, 0);

      // Export as JPEG
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Failed to process image'));
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
          }));
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

function enhanceContrast(data) {
  // Simple auto-contrast: stretch histogram
  let min = 255;
  let max = 0;

  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }

  if (max - min < 10) return; // Already good contrast

  const range = max - min;
  const factor = 255 / range;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, (data[i] - min) * factor));
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - min) * factor));
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - min) * factor));
  }
}

export function createImagePreview(file, maxWidth = 400) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.src = url;
  });
}
