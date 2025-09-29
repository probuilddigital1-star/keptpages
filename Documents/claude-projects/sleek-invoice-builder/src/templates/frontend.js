// Frontend-compatible template definitions for React components
// This file provides template metadata for UI components without the full HTML generation

export const TEMPLATES = {
  basic: {
    id: 'basic',
    name: 'Basic Invoice',
    description: 'Simple, clean design for general use',
    tier: 'free',
    preview: '/templates/previews/basic.png'
  },
  corporate: {
    id: 'corporate',
    name: 'Corporate Executive',
    description: 'Professional design for corporate businesses',
    tier: 'pro',
    preview: '/templates/previews/corporate.png'
  },
  creative: {
    id: 'creative',
    name: 'Creative Agency',
    description: 'Modern, colorful design for creative professionals',
    tier: 'pro',
    preview: '/templates/previews/creative.png'
  },
  traditional: {
    id: 'traditional',  
    name: 'Traditional Business',
    description: 'Classic, formal design for traditional businesses',
    tier: 'pro',
    preview: '/templates/previews/traditional.png'
  }
};

export const getTemplate = (templateId) => {
  return TEMPLATES[templateId] || TEMPLATES.basic;
};

export const getAvailableTemplates = (userTier = 'free') => {
  return Object.values(TEMPLATES).filter(template => 
    template.tier === 'free' || userTier === 'pro'
  );
};