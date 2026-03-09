import { useCallback } from 'react';
import clsx from 'clsx';
import { Input } from '@/components/ui/Input';

// ---------------------------------------------------------------------------
// Editable list (for ingredients, instructions)
// ---------------------------------------------------------------------------
function EditableList({ label, items = [], onChange, numbered = false, placeholder = 'Add item...' }) {
  function handleItemChange(index, value) {
    const next = [...items];
    next[index] = value;
    onChange(next);
  }

  function handleAdd() {
    onChange([...items, '']);
  }

  function handleRemove(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  function handleKeyDown(e, index) {
    // Enter on last empty item should not add another
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
    // Backspace on empty item removes it
    if (e.key === 'Backspace' && items[index] === '' && items.length > 1) {
      e.preventDefault();
      handleRemove(index);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="font-ui text-sm font-medium text-walnut">{label}</label>
      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            {numbered && (
              <span className="font-ui text-xs text-walnut-muted w-5 text-right shrink-0">
                {i + 1}.
              </span>
            )}
            <input
              value={item}
              onChange={(e) => handleItemChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              placeholder={placeholder}
              className={clsx(
                'flex-1 bg-cream-surface border border-border rounded-md px-3 py-2 font-body text-sm text-walnut placeholder:text-walnut-muted',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta',
              )}
            />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="p-1 text-walnut-muted hover:text-red-500 transition-colors shrink-0"
              aria-label="Remove item"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="self-start inline-flex items-center gap-1 font-ui text-xs text-terracotta hover:text-terracotta-hover transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add {label.toLowerCase().replace(/s$/, '')}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Textarea helper
// ---------------------------------------------------------------------------
function TextArea({ label, value = '', onChange, placeholder, rows = 4 }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-ui text-sm font-medium text-walnut">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={clsx(
          'w-full bg-cream-surface border border-border rounded-md px-4 py-2.5 font-body text-walnut placeholder:text-walnut-muted resize-y',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta',
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout renderers per document type
// ---------------------------------------------------------------------------
function RecipeFields({ data, onChange }) {
  const update = useCallback(
    (field, value) => onChange({ ...data, [field]: value }),
    [data, onChange],
  );

  return (
    <>
      <Input
        label="Title"
        value={data.title || ''}
        onChange={(e) => update('title', e.target.value)}
        placeholder="Recipe name"
      />
      <EditableList
        label="Ingredients"
        items={data.ingredients || []}
        onChange={(v) => update('ingredients', v)}
        placeholder="e.g. 2 cups flour"
      />
      <EditableList
        label="Instructions"
        items={data.instructions || []}
        onChange={(v) => update('instructions', v)}
        numbered
        placeholder="Step description"
      />
      <TextArea
        label="Notes"
        value={data.notes || ''}
        onChange={(v) => update('notes', v)}
        placeholder="Additional notes, tips, etc."
        rows={3}
      />
    </>
  );
}

function LetterFields({ data, onChange }) {
  const update = useCallback(
    (field, value) => onChange({ ...data, [field]: value }),
    [data, onChange],
  );

  return (
    <>
      <Input
        label="Title"
        value={data.title || ''}
        onChange={(e) => update('title', e.target.value)}
        placeholder="Letter title or subject"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="From"
          value={data.from || ''}
          onChange={(e) => update('from', e.target.value)}
          placeholder="Sender"
        />
        <Input
          label="To"
          value={data.to || ''}
          onChange={(e) => update('to', e.target.value)}
          placeholder="Recipient"
        />
      </div>
      <Input
        label="Date"
        value={data.date || ''}
        onChange={(e) => update('date', e.target.value)}
        placeholder="e.g. March 15, 1952"
      />
      <TextArea
        label="Content"
        value={data.content || ''}
        onChange={(v) => update('content', v)}
        placeholder="Letter text..."
        rows={8}
      />
    </>
  );
}

function JournalFields({ data, onChange }) {
  const update = useCallback(
    (field, value) => onChange({ ...data, [field]: value }),
    [data, onChange],
  );

  return (
    <>
      <Input
        label="Title"
        value={data.title || ''}
        onChange={(e) => update('title', e.target.value)}
        placeholder="Journal entry title"
      />
      <Input
        label="Date"
        value={data.date || ''}
        onChange={(e) => update('date', e.target.value)}
        placeholder="e.g. June 10, 1985"
      />
      <TextArea
        label="Content"
        value={data.content || ''}
        onChange={(v) => update('content', v)}
        placeholder="Journal entry text..."
        rows={10}
      />
    </>
  );
}

function ArtworkFields({ data, onChange }) {
  const update = useCallback(
    (field, value) => onChange({ ...data, [field]: value }),
    [data, onChange],
  );

  return (
    <>
      <Input
        label="Title"
        value={data.title || ''}
        onChange={(e) => update('title', e.target.value)}
        placeholder="Artwork title"
      />
      <TextArea
        label="Description"
        value={data.description || ''}
        onChange={(v) => update('description', v)}
        placeholder="Describe the artwork, technique, colors, etc."
        rows={6}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
const fieldComponents = {
  recipe: RecipeFields,
  letter: LetterFields,
  journal: JournalFields,
  artwork: ArtworkFields,
};

export default function TextPanel({ data = {}, onChange, documentType = 'recipe' }) {
  const FieldSet = fieldComponents[documentType] || RecipeFields;

  return (
    <div className="flex flex-col gap-5 p-1">
      <FieldSet data={data} onChange={onChange} />
    </div>
  );
}
