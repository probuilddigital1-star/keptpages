import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import authService from './authService';
import { getBrandLogoUrl } from '../utils/branding.js';
import { logError, logInfo } from '../utils/errorHandler';

class PDFService {
  // Add watermark to PDF
  static addWatermark(pdf, isPremiumUser = false) {
    if (isPremiumUser) return; // No watermark for premium users
    
    const pageHeight = pdf.internal.pageSize.height;
    const pageWidth = pdf.internal.pageSize.width;
    
    // Save current state
    pdf.saveGraphicsState();
    
    // Set watermark style
    pdf.setFontSize(10);
    pdf.setTextColor(128, 128, 128); // Gray color
    pdf.setFont('helvetica', 'normal');
    
    // Add semi-transparent background box
    pdf.setFillColor(255, 255, 255, 0.9);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    
    // Calculate text dimensions
    const mainText = 'Created with Sleek Invoice';
    const subText = 'Upgrade to Pro to remove watermark';
    const boxWidth = 140;
    const boxHeight = 25;
    const xPos = pageWidth - boxWidth - 15;
    const yPos = pageHeight - boxHeight - 15;
    
    // Draw background box
    pdf.roundedRect(xPos, yPos, boxWidth, boxHeight, 3, 3, 'FD');
    
    // Add watermark text
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(mainText, xPos + 5, yPos + 10);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(subText, xPos + 5, yPos + 18);
    
    // Restore state
    pdf.restoreGraphicsState();
  }
  
  // Generate PDF from HTML element (for web)
  static async generateFromElement(elementId, filename = 'invoice.pdf', paperSize = 'A4', isPremiumOverride = null) {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Element not found');
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      // Paper size configurations
      const paperSizes = {
        'A4': { format: 'a4', width: 210, height: 295 },
        'Letter': { format: 'letter', width: 216, height: 279 },
        'Legal': { format: 'legal', width: 216, height: 356 }
      };
      
      const selectedSize = paperSizes[paperSize] || paperSizes['A4'];

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', selectedSize.format);
      
      const imgWidth = selectedSize.width; // Paper width in mm
      const pageHeight = selectedSize.height; // Paper height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      
      // Add watermark to first page - use override if provided, otherwise check auth
      const isPremiumUser = isPremiumOverride !== null ? isPremiumOverride : authService.isPremium();
      this.addWatermark(pdf, isPremiumUser);
      
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        this.addWatermark(pdf, isPremiumUser);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
      return { success: true };
    } catch (error) {
      logError('PDFService.generateFromElement', error, { elementId, filename });
      return { success: false, error: error.message };
    }
  }

  // Generate PDF from invoice data (programmatic)
  static generateFromData(invoice, paperSize = 'A4', filename = `invoice-${invoice.number || invoice.id}.pdf`, isPremiumOverride = null) {
    try {
      // Paper size configurations
      const paperSizes = {
        'A4': 'a4',
        'Letter': 'letter',
        'Legal': 'legal'
      };
      
      const selectedFormat = paperSizes[paperSize] || 'a4';
      const pdf = new jsPDF('p', 'mm', selectedFormat);
      const isPremiumUser = isPremiumOverride !== null ? isPremiumOverride : authService.isPremium();
      
      // Set up margins and positions
      const margin = 20;
      let yPosition = margin;
      const pageWidth = pdf.internal.pageSize.width;
      
      // Professional header with gradient effect
      pdf.setFillColor(37, 99, 235); // Blue
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      // Company header
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INVOICE', margin, 25);
      
      // Add company logo if available
      const logoUrl = getBrandLogoUrl({ 
        plan: isPremiumUser ? 'pro' : 'free', 
        orgLogoUrl: invoice.logo_url 
      });
      
      if (logoUrl) {
        try {
          // Note: For base64 images
          if (logoUrl.startsWith('data:image')) {
            // Extract image format from base64 string
            const format = logoUrl.match(/data:image\/(\w+);/)?.[1]?.toUpperCase() || 'PNG';
            pdf.addImage(logoUrl, format, pageWidth - 70, 8, 50, 24);
          }
        } catch (err) {
          // console.log('Could not add logo:', err);
        }
      }
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
      yPosition = 50;
      
      // Invoice details box
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin - 5, yPosition - 5, pageWidth - (margin * 2) + 10, 25, 'F');
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Invoice #${String(invoice.number || invoice.id).padStart(6, '0')}`, margin, yPosition + 5);
      pdf.text(`Date: ${new Date(invoice.date || invoice.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, margin + 60, yPosition + 5);
      pdf.text(`Due: ${invoice.due_date || 'Upon Receipt'}`, margin + 130, yPosition + 5);
      
      yPosition += 10;
      pdf.setFont('helvetica', 'normal');
      if (invoice.business_name) {
        pdf.text(invoice.business_name, margin, yPosition + 5);
      }
      if (invoice.business_email) {
        pdf.setFontSize(10);
        pdf.text(invoice.business_email, margin + 60, yPosition + 5);
      }
      
      yPosition += 25;
      
      // Client information with background
      pdf.setFillColor(245, 247, 250);
      pdf.rect(margin - 5, yPosition - 5, (pageWidth - (margin * 2) + 10) / 2, 35, 'F');
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(107, 114, 128);
      pdf.text('BILL TO:', margin, yPosition);
      yPosition += 6;
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(invoice.client_name || 'Client Name', margin, yPosition);
      yPosition += 6;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(invoice.client_email || '', margin, yPosition);
      yPosition += 20;
      
      // Items table with grid lines
      const tableTop = yPosition;
      const colWidths = [90, 30, 30, 40]; // Description, Qty, Price, Total
      const colX = [margin, margin + 90, margin + 120, margin + 150];
      
      // Table header with background
      pdf.setFillColor(31, 41, 55);
      pdf.rect(margin, tableTop, pageWidth - (margin * 2), 10, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('DESCRIPTION', colX[0] + 2, tableTop + 7);
      pdf.text('QTY', colX[1] + 2, tableTop + 7);
      pdf.text('PRICE', colX[2] + 2, tableTop + 7);
      pdf.text('TOTAL', colX[3] + 2, tableTop + 7);
      
      yPosition = tableTop + 10;
      
      // Reset text color for items
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      
      // Draw table grid lines and items
      let subtotal = 0;
      const rowHeight = 10;
      
      // Draw table border
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      
      if (invoice.items && invoice.items.length > 0) {
        const tableHeight = invoice.items.length * rowHeight;
        
        // Draw outer border
        pdf.rect(margin, tableTop, pageWidth - (margin * 2), 10 + tableHeight, 'S');
        
        // Draw header bottom border
        pdf.setLineWidth(1);
        pdf.line(margin, tableTop + 10, pageWidth - margin, tableTop + 10);
        
        invoice.items.forEach((item, index) => {
          const itemPrice = parseFloat(item.price) || 0;
          const itemQty = parseFloat(item.quantity) || 0;
          const itemTotal = itemQty * itemPrice;
          subtotal += itemTotal;
          
          // Alternating row background
          if (index % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'F');
          }
          
          // Draw horizontal grid line
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.2);
          if (index < invoice.items.length - 1) {
            pdf.line(margin, yPosition + rowHeight, pageWidth - margin, yPosition + rowHeight);
          }
          
          // Draw vertical grid lines
          pdf.setLineWidth(0.2);
          pdf.line(colX[1] - 2, tableTop, colX[1] - 2, tableTop + 10 + tableHeight);
          pdf.line(colX[2] - 2, tableTop, colX[2] - 2, tableTop + 10 + tableHeight);
          pdf.line(colX[3] - 2, tableTop, colX[3] - 2, tableTop + 10 + tableHeight);
          
          // Item content with better spacing
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.text(item.description || '', colX[0] + 2, yPosition + 6);
          pdf.text(itemQty.toString(), colX[1] + 2, yPosition + 6);
          pdf.text(`$${itemPrice.toFixed(2)}`, colX[2] + 2, yPosition + 6);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`$${itemTotal.toFixed(2)}`, colX[3] + 2, yPosition + 6);
          pdf.setFont('helvetica', 'normal');
          
          yPosition += rowHeight;
        });
      }
      
      // Already has border from table
      yPosition += 15;
      
      // Total section with styled box
      const totalBoxX = pageWidth - 80;
      pdf.setFillColor(37, 99, 235);
      pdf.rect(totalBoxX, yPosition - 5, 60, 20, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('TOTAL:', totalBoxX + 5, yPosition + 5);
      pdf.setFontSize(14);
      pdf.text(`$${(invoice.total || subtotal).toFixed(2)}`, totalBoxX + 25, yPosition + 5);
      
      // Status badge
      yPosition += 30;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const status = (invoice.status || 'pending').toUpperCase();
      const statusColor = status === 'PAID' ? [16, 185, 129] : status === 'SENT' ? [251, 146, 60] : [156, 163, 175];
      pdf.setFillColor(...statusColor);
      pdf.roundedRect(margin, yPosition - 5, 40, 10, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text(status, margin + 8, yPosition + 1);
      
      // Add professional footer
      yPosition = pdf.internal.pageSize.height - 30;
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });
      
      // Add watermark for non-premium users
      this.addWatermark(pdf, isPremiumUser);
      
      pdf.save(filename);
      return { success: true };
    } catch (error) {
      logError('PDFService.generateFromElement', error, { elementId, filename });
      return { success: false, error: error.message };
    }
  }

  // Print current page
  static printPage() {
    window.print();
  }

  // Export to CSV
  static exportToCSV(invoices, filename = 'invoices.csv') {
    try {
      const headers = ['Invoice Number', 'Client Name', 'Client Email', 'Total', 'Status', 'Date Created'];
      const csvContent = [
        headers.join(','),
        ...invoices.map(invoice => [
          invoice.number || invoice.id,
          invoice.client_name || '',
          invoice.client_email || '',
          invoice.total || 0,
          invoice.status || 'draft',
          new Date(invoice.created_at || Date.now()).toLocaleDateString()
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      logError('PDFService.exportToCSV', error, { invoicesCount: invoices?.length });
      return { success: false, error: error.message };
    }
  }
}

export default PDFService;