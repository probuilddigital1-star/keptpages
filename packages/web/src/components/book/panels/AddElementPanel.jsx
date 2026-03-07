import { useBookStore } from '@/stores/bookStore';

const ELEMENT_TYPES = [
  {
    type: 'text',
    label: 'Text Block',
    defaults: { x: 0.2, y: 0.3, width: 0.6, height: 0.1, text: 'New text...', fontSize: 14, alignment: 'left', color: '#2C1810' },
  },
  {
    type: 'image',
    label: 'Image',
    defaults: { x: 0.2, y: 0.2, width: 0.6, height: 0.5, imageKey: null, frameStyle: 'none' },
  },
  {
    type: 'shape',
    label: 'Rectangle',
    defaults: { x: 0.2, y: 0.3, width: 0.6, height: 0.3, shapeType: 'rect', stroke: '#c2891f', strokeWidth: 1, fill: 'transparent' },
  },
  {
    type: 'shape',
    label: 'Circle',
    defaults: { x: 0.35, y: 0.3, width: 0.3, height: 0.3, shapeType: 'circle', stroke: '#c2891f', strokeWidth: 1, fill: 'transparent' },
  },
  {
    type: 'decorative',
    label: 'Line',
    defaults: { x: 0.2, y: 0.5, width: 0.6, height: 0.005, shapeType: 'line', stroke: '#c2891f', strokeWidth: 1 },
  },
  {
    type: 'decorative',
    label: 'Divider',
    defaults: { x: 0.3, y: 0.5, width: 0.4, height: 0.02, shapeType: 'line', stroke: '#c2891f', strokeWidth: 2 },
  },
];

export default function AddElementPanel() {
  const selectedPageIndex = useBookStore((s) => s.selectedPageIndex);
  const addElement = useBookStore((s) => s.addElement);

  return (
    <div className="p-4">
      <h3 className="font-ui text-xs font-semibold text-walnut uppercase tracking-wider mb-2">
        Add Element
      </h3>
      <div className="grid grid-cols-3 gap-1.5">
        {ELEMENT_TYPES.map((item, i) => (
          <button
            key={i}
            onClick={() => addElement(selectedPageIndex, { type: item.type, ...item.defaults })}
            className="px-2 py-1.5 rounded border border-border-light font-ui text-[10px] text-walnut hover:bg-cream-alt hover:border-walnut-muted/30 transition-all"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
