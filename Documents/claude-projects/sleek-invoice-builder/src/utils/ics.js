function pad(n) {
  return String(n).padStart(2, '0');
}

export function toICSEvent({
  title = 'Create recurring invoice', 
  start, 
  freq = 'MONTHLY', 
  interval = 1, 
  count = 12, 
  description = '', 
  url = ''
}) {
  const dt = new Date(start);
  const stamp = `${dt.getUTCFullYear()}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`;
  const uid = 'sleek-' + Math.random().toString(36).slice(2) + '@app';
  const rrule = `FREQ=${freq};INTERVAL=${interval};COUNT=${count}`;
  
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sleek Invoice//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${stamp}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g,'\\n')}`,
    url ? `URL:${url}` : '',
    `RRULE:${rrule}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
}

export function downloadICS(icsText, filename = 'reminder.ics') {
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a); 
  a.click(); 
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}