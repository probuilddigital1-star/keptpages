import { useEffect, useRef } from 'react';

export default function AnalyticsSimple({ series = [], width = 640, height = 200, label = '', type = 'bar', isDark = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // Colors based on theme
    const textColor = isDark ? '#9ca3af' : '#6b7280';
    const barColor = isDark ? '#3b82f6' : '#2563eb';
    const lineColor = isDark ? '#10b981' : '#059669';
    const gridColor = isDark ? '#374151' : '#e5e7eb';

    if (!series || series.length === 0) {
      ctx.fillStyle = textColor;
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No revenue data yet', width / 2, height / 2 - 10);
      ctx.font = '12px system-ui';
      ctx.fillText('Mark invoices as "Paid" to see revenue', width / 2, height / 2 + 10);
      return;
    }
    
    const max = Math.max(1, ...series.map(s => s.value || 0));
    const padding = 40;
    const bottomPadding = 30; // More space for labels
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding - bottomPadding;
    
    // Draw grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    
    if (type === 'bar') {
      // Bar chart
      const barWidth = chartWidth / Math.max(1, series.length);
      const barPadding = barWidth * 0.2;
      
      ctx.fillStyle = barColor;
      series.forEach((s, i) => {
        const value = s.value || 0;
        const barHeight = (value / max) * chartHeight;
        const x = padding + i * barWidth + barPadding;
        const y = padding + chartHeight - barHeight;
        
        // Draw bar
        ctx.fillRect(x, y, barWidth - barPadding * 2, barHeight);
        
        // Draw label
        ctx.fillStyle = textColor;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x + (barWidth - barPadding * 2) / 2, height - 15);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(s.label || '', 0, 0);
        ctx.restore();
        
        // Draw value on top
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText(
          `$${value.toLocaleString()}`,
          x + (barWidth - barPadding * 2) / 2,
          y - 5
        );
        
        ctx.fillStyle = barColor;
      });
    } else if (type === 'line') {
      // Line chart
      const stepX = chartWidth / Math.max(1, series.length - 1);
      
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      series.forEach((s, i) => {
        const value = s.value || 0;
        const x = padding + i * stepX;
        const y = padding + chartHeight - (value / max) * chartHeight;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw point
        ctx.fillStyle = lineColor;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw label
        ctx.fillStyle = textColor;
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(s.label || '', x, height - 5);
      });
      
      ctx.stroke();
    }
    
    // Draw title
    if (label) {
      ctx.fillStyle = textColor;
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(label, padding, 20);
    }
    
    // Draw Y-axis labels
    ctx.fillStyle = textColor;
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const value = max - (max * i) / 4;
      const y = padding + (chartHeight * i) / 4;
      ctx.fillText(`$${Math.round(value).toLocaleString()}`, padding - 5, y + 3);
    }
  }, [series, width, height, label, type, isDark]);
  
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}