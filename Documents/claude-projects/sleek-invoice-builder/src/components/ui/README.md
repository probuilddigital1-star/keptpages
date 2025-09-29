# UI Component Library

A collection of reusable, accessible, and production-ready React components for the Sleek Invoice Builder application.

## Components

### Button

A flexible button component with multiple variants, sizes, and states.

#### Usage

```jsx
import Button from './components/ui/Button';

// Primary button
<Button variant="primary" onClick={handleClick}>
  Save Invoice
</Button>

// Secondary button with loading state
<Button variant="secondary" loading={isLoading}>
  Export PDF
</Button>

// Destructive button with icon
<Button variant="destructive" leadingIcon={<TrashIcon />}>
  Delete
</Button>

// Large tertiary button
<Button variant="tertiary" size="lg">
  Learn More
</Button>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'tertiary' \| 'destructive'` | `'primary'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size (min 44px touch target) |
| `loading` | `boolean` | `false` | Shows spinner and disables button |
| `disabled` | `boolean` | `false` | Disables the button |
| `leadingIcon` | `ReactNode` | - | Icon before text |
| `trailingIcon` | `ReactNode` | - | Icon after text |
| `onClick` | `function` | - | Click handler |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `className` | `string` | - | Additional CSS classes |

#### Variants

- **Primary**: Main CTA actions (Save, Send, Create)
- **Secondary**: Secondary actions (Export, Download)
- **Tertiary**: Low-emphasis actions (Cancel, Back)
- **Destructive**: Dangerous actions (Delete, Remove)

#### Accessibility

- Minimum 44x44px touch target on all sizes
- Full keyboard navigation support
- ARIA attributes (`aria-busy`, `aria-disabled`)
- Focus indicators that meet WCAG standards
- Screen reader announcements for loading states

---

### Spinner

An accessible loading spinner with size variants.

#### Usage

```jsx
import Spinner from './components/ui/Spinner';

// Default spinner
<Spinner />

// Small spinner
<Spinner size="sm" />

// Large spinner with custom class
<Spinner size="lg" className="text-blue-600" />
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Spinner size |
| `className` | `string` | - | Additional CSS classes |

---

### StickyBar

A sticky bottom action bar for primary actions on forms and pages.

#### Usage

```jsx
import StickyBar from './components/StickyBar';

// Show sticky bar when form is valid
<StickyBar visible={isFormValid}>
  <Button variant="tertiary" onClick={handleCancel}>
    Cancel
  </Button>
  <Button variant="primary" onClick={handleSave}>
    Save Changes
  </Button>
</StickyBar>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | `false` | Controls visibility |
| `children` | `ReactNode` | - | Content (typically buttons) |
| `className` | `string` | - | Additional CSS classes |

#### Features

- Smooth slide-up animation
- Fixed positioning at viewport bottom
- Responsive padding
- Dark mode support
- Shadow for elevation

---

### ConfirmDialog

A modal confirmation dialog for destructive or important actions.

#### Usage

```jsx
import ConfirmDialog from './components/ConfirmDialog';

const [showConfirm, setShowConfirm] = useState(false);

<ConfirmDialog
  open={showConfirm}
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
  title="Delete Invoice?"
  description="This action cannot be undone. The invoice will be permanently deleted."
  confirmText="Delete"
  confirmVariant="destructive"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Controls dialog visibility |
| `onConfirm` | `function` | - | Confirm button handler |
| `onCancel` | `function` | - | Cancel/close handler |
| `title` | `string` | `'Are you sure?'` | Dialog title |
| `description` | `string` | - | Optional description text |
| `confirmText` | `string` | `'Confirm'` | Confirm button text |
| `cancelText` | `string` | `'Cancel'` | Cancel button text |
| `confirmVariant` | `string` | `'destructive'` | Confirm button variant |
| `loading` | `boolean` | `false` | Loading state |

#### Features

- Focus trap and management
- Returns focus to trigger element on close
- Escape key to close
- Click outside to close
- Loading state support
- Smooth scale animation
- Full accessibility (ARIA attributes)

---

## Utilities

### cn (Class Name Merger)

A utility function for merging Tailwind CSS classes with proper precedence.

#### Usage

```jsx
import { cn } from './components/ui/cn';

// Merge classes conditionally
<div className={cn(
  'base-class',
  isActive && 'active-class',
  isDanger && 'danger-class',
  customClassName
)} />

// Override default styles
<Button className={cn('default-styles', 'custom-override')} />
```

### useToast

A custom hook for managing toast notifications.

#### Usage

```jsx
import useToast from './components/ui/useToast';

const { toasts, addToast, removeToast } = useToast();

// Show a toast
addToast({
  id: Date.now().toString(),
  message: 'Invoice saved successfully',
  type: 'success'
});

// Auto-dismiss after 3 seconds
setTimeout(() => removeToast(toastId), 3000);
```

---

## Design Principles

### 1. Accessibility First
- All components meet WCAG 2.1 AA standards
- Keyboard navigation fully supported
- Screen reader optimized
- Focus management implemented
- Minimum 44x44px touch targets

### 2. Consistent Design Language
- Unified color system
- Consistent spacing (4px grid)
- Standardized border radius
- Cohesive typography scale

### 3. Performance
- Lightweight components
- No unnecessary re-renders
- Optimized animations
- Tree-shakeable exports

### 4. Dark Mode Support
- All components support dark mode
- Automatic theme detection
- Smooth transitions

### 5. Mobile First
- Touch-optimized interactions
- Responsive by default
- Performance on low-end devices

---

## Testing

All components include comprehensive test suites:

```bash
# Run all UI component tests
npm test -- --testPathPattern="ui|StickyBar|ConfirmDialog"

# Run specific component test
npm test Button.test.jsx

# Run with coverage
npm test -- --coverage --testPathPattern="ui"
```

### Test Coverage

- ✅ Rendering and props
- ✅ User interactions
- ✅ Accessibility features
- ✅ Keyboard navigation
- ✅ Loading and error states
- ✅ Edge cases
- ✅ Integration scenarios

---

## Best Practices

### 1. Import What You Need
```jsx
// Good - specific imports
import Button from './components/ui/Button';
import Spinner from './components/ui/Spinner';

// Avoid - barrel imports (if implemented)
import { Button, Spinner } from './components/ui';
```

### 2. Compose for Complex UIs
```jsx
// Combine components for rich interfaces
<StickyBar visible={hasChanges}>
  <Button variant="tertiary" onClick={handleCancel}>
    Cancel
  </Button>
  <Button
    variant="primary"
    loading={isSaving}
    onClick={handleSave}
  >
    Save Changes
  </Button>
</StickyBar>
```

### 3. Handle Loading States
```jsx
// Show loading feedback
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  try {
    await saveData();
    showToast('Saved successfully');
  } finally {
    setLoading(false);
  }
};

<Button loading={loading} onClick={handleSubmit}>
  Submit
</Button>
```

### 4. Confirm Destructive Actions
```jsx
// Always confirm before destructive actions
const [showConfirm, setShowConfirm] = useState(false);

<Button
  variant="destructive"
  onClick={() => setShowConfirm(true)}
>
  Delete
</Button>

<ConfirmDialog
  open={showConfirm}
  onConfirm={performDelete}
  onCancel={() => setShowConfirm(false)}
  title="Delete this invoice?"
  description="This cannot be undone."
/>
```

---

## Migration Guide

### Updating from Native HTML Buttons

```jsx
// Before
<button
  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
  onClick={handleClick}
  disabled={loading}
>
  {loading ? 'Loading...' : 'Save'}
</button>

// After
<Button
  variant="primary"
  onClick={handleClick}
  loading={loading}
>
  Save
</Button>
```

### Updating Confirmation Flows

```jsx
// Before
if (confirm('Delete this item?')) {
  deleteItem();
}

// After
const [showConfirm, setShowConfirm] = useState(false);

// In JSX
<ConfirmDialog
  open={showConfirm}
  onConfirm={() => {
    deleteItem();
    setShowConfirm(false);
  }}
  onCancel={() => setShowConfirm(false)}
  title="Delete this item?"
/>
```

---

## Contributing

When adding new UI components:

1. Follow the established patterns
2. Ensure full accessibility
3. Include comprehensive tests
4. Update this documentation
5. Add usage examples
6. Consider dark mode
7. Test on mobile devices

---

## Support

For questions or issues with UI components, please check:
1. This documentation
2. Component test files for usage examples
3. The implementation files for detailed prop types

---

*Last updated: December 2024*