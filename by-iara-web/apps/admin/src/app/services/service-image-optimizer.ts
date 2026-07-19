const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1200;
const JPEG_QUALITY = 0.82;

export interface OptimizedImage {
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
}

export async function optimizeServiceImage(
  file: File,
): Promise<OptimizedImage> {
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Choose a JPEG or PNG image.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('The original image must be 15 MB or smaller.');
  }

  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  });
  try {
    const scale = Math.min(
      1,
      MAX_WIDTH / bitmap.width,
      MAX_HEIGHT / bitmap.height,
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not process this image.');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error('The image could not be compressed.')),
        'image/jpeg',
        JPEG_QUALITY,
      );
    });
    return { blob, previewUrl: URL.createObjectURL(blob), width, height };
  } finally {
    bitmap.close();
  }
}
