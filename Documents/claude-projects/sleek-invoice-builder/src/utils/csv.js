export function toCSV(rows, headers) {
  const esc = v => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  };
  const head = headers.map(h => esc(h.label)).join(',');
  const body = rows.map(r => headers.map(h => esc(r[h.key])).join(',')).join('\n');
  return head + '\n' + body;
}

export function fromCSV(text) {
  // simple RFC 4180 parser, no streaming
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i+1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i+1] === '\n') i++;
      row.push(field); 
      if (row.length > 0 && row.some(f => f !== '')) {
        rows.push(row);
      }
      row = []; field = ''; i++; continue;
    }
    field += c; i++;
  }
  if (field || row.length > 0) {
    row.push(field);
    if (row.some(f => f !== '')) {
      rows.push(row);
    }
  }
  return rows.filter(r => r.length > 0);
}

export function downloadCSV(csvText, filename = 'export.csv') {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildCSVDownload(name, headers, rows) {
  const csvText = toCSV(rows, headers);
  downloadCSV(csvText, name);
}