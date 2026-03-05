import { processImage, createImagePreview } from './imageProcessing';

// Mock HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(100),
  })),
  putImageData: vi.fn(),
}));
HTMLCanvasElement.prototype.toBlob = vi.fn((cb) =>
  cb(new Blob(['test'], { type: 'image/jpeg' }))
);
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,test');

describe('imageProcessing exports', () => {
  it('exports processImage as a function', () => {
    expect(typeof processImage).toBe('function');
  });

  it('exports createImagePreview as a function', () => {
    expect(typeof createImagePreview).toBe('function');
  });
});

describe('processImage', () => {
  let mockFile;

  beforeEach(() => {
    mockFile = new File(['fake-image-data'], 'photo.png', {
      type: 'image/png',
    });

    // Mock Image constructor to trigger onload synchronously
    vi.spyOn(globalThis, 'Image').mockImplementation(() => {
      const img = {
        width: 800,
        height: 600,
        onload: null,
        onerror: null,
        set src(_value) {
          // Trigger onload asynchronously
          setTimeout(() => {
            if (img.onload) img.onload();
          }, 0);
        },
      };
      return img;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves with a File object', async () => {
    const result = await processImage(mockFile);
    expect(result).toBeInstanceOf(File);
  });

  it('output file has .jpg extension', async () => {
    const result = await processImage(mockFile);
    expect(result.name).toBe('photo.jpg');
  });

  it('output file has image/jpeg type', async () => {
    const result = await processImage(mockFile);
    expect(result.type).toBe('image/jpeg');
  });

  it('replaces various extensions with .jpg', async () => {
    const pngFile = new File(['data'], 'scan.heic', { type: 'image/heic' });
    const result = await processImage(pngFile);
    expect(result.name).toBe('scan.jpg');
  });

  it('revokes the object URL after loading', async () => {
    await processImage(mockFile);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});

describe('createImagePreview', () => {
  let mockFile;

  beforeEach(() => {
    mockFile = new File(['fake-image-data'], 'photo.png', {
      type: 'image/png',
    });

    vi.spyOn(globalThis, 'Image').mockImplementation(() => {
      const img = {
        width: 800,
        height: 600,
        onload: null,
        onerror: null,
        set src(_value) {
          setTimeout(() => {
            if (img.onload) img.onload();
          }, 0);
        },
      };
      return img;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves with a data URL string', async () => {
    const result = await createImagePreview(mockFile);
    expect(result).toBe('data:image/jpeg;base64,test');
  });

  it('calls toDataURL on the canvas', async () => {
    await createImagePreview(mockFile);
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith(
      'image/jpeg',
      0.7
    );
  });
});
