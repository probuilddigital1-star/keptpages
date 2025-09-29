import { useState } from 'react';
import { listTemplates, upsertTemplate, deleteTemplate, genTemplateId } from '../store/emailTemplates';

export default function TemplateManager({ open, onClose, onSelect }) {
  const [templates, setTemplates] = useState(() => listTemplates());
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  if (!open) return null;

  function startEdit(template) {
    setEditingId(template.id);
    setEditName(template.name);
    setEditSubject(template.subject);
    setEditBody(template.body);
  }

  function saveEdit() {
    if (!editName.trim()) return;
    
    upsertTemplate({
      id: editingId,
      name: editName,
      subject: editSubject,
      body: editBody
    });
    
    setTemplates(listTemplates());
    setEditingId(null);
    setEditName('');
    setEditSubject('');
    setEditBody('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditSubject('');
    setEditBody('');
  }

  function addNew() {
    const id = genTemplateId();
    setEditingId(id);
    setEditName('New Template');
    setEditSubject('Invoice #{{NUMBER}}');
    setEditBody('Dear {{CLIENT}},\n\nPlease find attached invoice #{{NUMBER}} for {{TOTAL}}.\n\nBest regards');
  }

  function removeTemplate(id) {
    if (id.startsWith('default_')) {
      alert('Cannot delete default templates');
      return;
    }
    if (!confirm('Delete this template?')) return;
    deleteTemplate(id);
    setTemplates(listTemplates());
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Email Templates</h2>
            <button 
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {editingId ? (
            // Edit mode
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template Name
                </label>
                <input 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Template name"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <input 
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Body
                </label>
                <textarea 
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-2">Available tokens:</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 font-mono">
                  {'{{CLIENT}}'} {'{{NUMBER}}'} {'{{TOTAL}}'} {'{{DATE}}'} {'{{DUE_DATE}}'} {'{{TERMS}}'} {'{{COMPANY}}'}
                </p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={saveEdit}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Save Template
                </button>
                <button 
                  onClick={cancelEdit}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // List mode
            <div className="space-y-3">
              <button 
                onClick={addNew}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-left"
              >
                + Create New Template
              </button>

              {templates.map(template => (
                <div key={template.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {template.name}
                        {template.id.startsWith('default_') && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            Default
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Subject: {template.subject}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          onSelect?.(template);
                          onClose?.();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
                      >
                        Use
                      </button>
                      <button 
                        onClick={() => startEdit(template)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
                      >
                        Edit
                      </button>
                      {!template.id.startsWith('default_') && (
                        <button 
                          onClick={() => removeTemplate(template.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}