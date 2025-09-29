const FONT_MAP = {
  Inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
  Lato: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
  Merriweather: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
  Roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'Open Sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
  Poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap',
  Montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap',
  Raleway: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600&display=swap',
  'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap',
  'Source Sans Pro': 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600&display=swap',
  Ubuntu: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap'
};

export async function ensureFontLoaded(name) {
  if (!name || name === 'System') return;
  const href = FONT_MAP[name]; 
  if (!href) return;
  
  const present = [...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.href && l.href.includes(href));
  if (!present) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
  
  try {
    if (document.fonts && document.fonts.load) { 
      await document.fonts.load(`400 14px "${name}"`); 
    } else { 
      await new Promise(r => setTimeout(r, 200)); 
    }
  } catch {}
}

export { FONT_MAP };