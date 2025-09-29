import { logError, logInfo } from '../utils/errorHandler';

import '../vendor/qrcode.min.js';

export function qrDataUrl(text, size = 128) {
  if (!text) return '';
  
  try {
    const QR = window.QRCode;
    if (!QR) {
      // console.warn('QRCode library not loaded');
      return '';
    }
    
    const qr = new QR(0, 'M');
    qr.addData(text);
    qr.make();
    
    const moduleCount = qr.getModuleCount();
    const cellSize = size / moduleCount;
    
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Black modules
    ctx.fillStyle = '#000000';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(
            Math.round(col * cellSize), 
            Math.round(row * cellSize), 
            Math.ceil(cellSize), 
            Math.ceil(cellSize)
          );
        }
      }
    }
    
    return canvas.toDataURL('image/png');
  } catch (err) {
    logError('QRGenerator.qr', err);
    return '';
  }
}