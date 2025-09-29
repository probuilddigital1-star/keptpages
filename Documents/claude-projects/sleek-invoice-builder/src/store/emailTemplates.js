const KEY = 'sleek_email_templates_v1';

export function listTemplates() { 
  try { 
    return JSON.parse(localStorage.getItem(KEY)) || getDefaultTemplates(); 
  } catch { 
    return getDefaultTemplates(); 
  } 
}

export function saveTemplates(arr) { 
  localStorage.setItem(KEY, JSON.stringify(arr)); 
  return arr; 
}

export function upsertTemplate(t) { 
  const all = listTemplates(); 
  const i = all.findIndex(x => x.id === t.id); 
  if (i >= 0) all[i] = t; 
  else all.push(t); 
  return saveTemplates(all); 
}

export function deleteTemplate(id) { 
  return saveTemplates(listTemplates().filter(x => x.id !== id)); 
}

export const genTemplateId = () => 't_' + Math.random().toString(36).slice(2, 10);

export function getDefaultTemplates() {
  return [
    {
      id: 'default_1',
      name: 'Professional',
      subject: 'Invoice #{{NUMBER}} from {{COMPANY}}',
      body: `Dear {{CLIENT}},

Please find attached invoice #{{NUMBER}} for {{TOTAL}}.

Payment is due by {{DUE_DATE}}. Please let me know if you have any questions.

Best regards,
{{COMPANY}}`
    },
    {
      id: 'default_2',
      name: 'Friendly',
      subject: 'Invoice #{{NUMBER}} - {{CLIENT}}',
      body: `Hi {{CLIENT}},

I hope this email finds you well!

Attached is invoice #{{NUMBER}} for the amount of {{TOTAL}} for our recent work together.

Payment terms: {{TERMS}}

Thanks so much for your business! Let me know if you need anything.

Cheers,
{{COMPANY}}`
    },
    {
      id: 'default_3',
      name: 'Reminder',
      subject: 'Payment Reminder - Invoice #{{NUMBER}}',
      body: `Dear {{CLIENT}},

This is a friendly reminder that invoice #{{NUMBER}} for {{TOTAL}} is now due.

Original invoice date: {{DATE}}
Payment terms: {{TERMS}}

Please process payment at your earliest convenience. If you've already sent payment, please disregard this message.

Thank you,
{{COMPANY}}`
    }
  ];
}