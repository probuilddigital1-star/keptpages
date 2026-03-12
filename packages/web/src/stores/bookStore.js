import { create } from 'zustand';
import { temporal } from 'zundo';
import api from '@/services/api';
import { createInitialBlueprint, createPage, TEMPLATES } from '@/components/book/constants';

// Separate blueprint slice for undo/redo tracking
const blueprintSlice = (set, get) => ({
  blueprint: null,
  selectedPageIndex: 0,
  selectedElementId: null,
  dirty: false,

  // Blueprint initialization
  initBlueprint: (documents, existingCover) => {
    const blueprint = createInitialBlueprint(documents, existingCover);
    set({ blueprint, selectedPageIndex: 0, selectedElementId: null, dirty: true });
  },

  loadBlueprint: (customization) => {
    if (customization?.pages?.length) {
      set({ blueprint: customization, selectedPageIndex: 0, selectedElementId: null, dirty: false });
    }
  },

  // Page actions
  setSelectedPage: (index) => set({ selectedPageIndex: index, selectedElementId: null }),

  addPage: (kind, afterIndex = null) => {
    set((state) => {
      if (!state.blueprint) return state;
      const page = createPage(kind);
      const pages = [...state.blueprint.pages];
      const insertAt = afterIndex !== null ? afterIndex + 1 : pages.length;
      pages.splice(insertAt, 0, page);
      return {
        blueprint: { ...state.blueprint, pages },
        selectedPageIndex: insertAt,
        selectedElementId: null,
        dirty: true,
      };
    });
  },

  removePage: (pageIndex) => {
    set((state) => {
      if (!state.blueprint || state.blueprint.pages.length <= 1) return state;
      const pages = state.blueprint.pages.filter((_, i) => i !== pageIndex);
      const newIndex = Math.min(state.selectedPageIndex, pages.length - 1);
      return {
        blueprint: { ...state.blueprint, pages },
        selectedPageIndex: newIndex,
        selectedElementId: null,
        dirty: true,
      };
    });
  },

  reorderPages: (fromIndex, toIndex) => {
    set((state) => {
      if (!state.blueprint) return state;
      const pages = [...state.blueprint.pages];
      const [moved] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, moved);
      return {
        blueprint: { ...state.blueprint, pages },
        selectedPageIndex: toIndex,
        dirty: true,
      };
    });
  },

  updatePageBackground: (pageIndex, background) => {
    set((state) => {
      if (!state.blueprint) return state;
      const pages = state.blueprint.pages.map((p, i) =>
        i === pageIndex ? { ...p, background: { ...p.background, ...background } } : p
      );
      return { blueprint: { ...state.blueprint, pages }, dirty: true };
    });
  },

  // Element actions
  setSelectedElement: (elementId) => set({ selectedElementId: elementId }),

  addElement: (pageIndex, element) => {
    set((state) => {
      if (!state.blueprint) return state;
      const newElement = { id: crypto.randomUUID(), ...element };
      const pages = state.blueprint.pages.map((p, i) =>
        i === pageIndex ? { ...p, elements: [...p.elements, newElement] } : p
      );
      return {
        blueprint: { ...state.blueprint, pages },
        selectedElementId: newElement.id,
        dirty: true,
      };
    });
  },

  updateElement: (pageIndex, elementId, props) => {
    set((state) => {
      if (!state.blueprint) return state;
      const pages = state.blueprint.pages.map((p, i) =>
        i === pageIndex
          ? { ...p, elements: p.elements.map((el) => el.id === elementId ? { ...el, ...props } : el) }
          : p
      );
      return { blueprint: { ...state.blueprint, pages }, dirty: true };
    });
  },

  deleteElement: (pageIndex, elementId) => {
    set((state) => {
      if (!state.blueprint) return state;
      const pages = state.blueprint.pages.map((p, i) =>
        i === pageIndex
          ? { ...p, elements: p.elements.filter((el) => el.id !== elementId) }
          : p
      );
      return {
        blueprint: { ...state.blueprint, pages },
        selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId,
        dirty: true,
      };
    });
  },

  // Global settings
  updateGlobalSettings: (settings) => {
    set((state) => {
      if (!state.blueprint) return state;
      return {
        blueprint: {
          ...state.blueprint,
          globalSettings: { ...state.blueprint.globalSettings, ...settings },
        },
        dirty: true,
      };
    });
  },

  // Apply template — updates global settings + reskins all pages and elements
  applyTemplate: (templateId) => {
    set((state) => {
      if (!state.blueprint) return state;
      const template = TEMPLATES.find((t) => t.id === templateId);
      if (!template) return state;

      const pages = state.blueprint.pages.map((page) => ({
        ...page,
        background: { ...page.background, color: template.pageBg },
        elements: page.elements.map((el) => {
          if (el.type === 'text') {
            const isTitle = el.fontSize >= 20 || el.fontWeight === 'bold';
            return { ...el, color: isTitle ? template.titleColor : template.bodyColor };
          }
          if (el.type === 'decorative' || el.type === 'shape') {
            return { ...el, stroke: template.accentColor };
          }
          return el;
        }),
      }));

      return {
        blueprint: {
          ...state.blueprint,
          globalSettings: { ...state.blueprint.globalSettings, template: templateId },
          pages,
        },
        dirty: true,
      };
    });
  },

  // Cover design
  updateCoverDesign: (coverData) => {
    set((state) => {
      if (!state.blueprint) return state;
      return {
        blueprint: {
          ...state.blueprint,
          coverDesign: { ...state.blueprint.coverDesign, ...coverData },
        },
        dirty: true,
      };
    });
  },

  // Additional images
  addAdditionalImage: (imageData) => {
    set((state) => {
      if (!state.blueprint) return state;
      return {
        blueprint: {
          ...state.blueprint,
          additionalImages: [...(state.blueprint.additionalImages || []), imageData],
        },
        dirty: true,
      };
    });
  },

  removeAdditionalImage: (key) => {
    set((state) => {
      if (!state.blueprint) return state;
      return {
        blueprint: {
          ...state.blueprint,
          additionalImages: (state.blueprint.additionalImages || []).filter((img) => img.key !== key),
        },
        dirty: true,
      };
    });
  },

  markClean: () => set({ dirty: false }),
});

export const useBookStore = create(
  temporal(
    (set, get) => ({
      // Existing state
      book: null,
      template: 'heritage',
      chapters: [],
      coverDesign: {
        title: '',
        subtitle: '',
        photo: null,
        colorScheme: 'default',
      },
      generatingPdf: false,
      loading: false,
      saveStatus: 'saved', // 'saved' | 'saving' | 'unsaved'
      documents: [],

      // Blueprint slice
      ...blueprintSlice(set, get),

      // Existing actions
      createBook: async (collectionId, title, extra = {}) => {
        set({ loading: true });
        try {
          const book = await api.post('/books', { collectionId, title, ...extra });
          set({
            book,
            template: book.template || 'heritage',
            chapters: book.chapters || [],
            coverDesign: book.coverDesign || get().coverDesign,
            loading: false,
          });
          return book;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      loadBook: async (bookId) => {
        set({ loading: true });
        try {
          const book = await api.get(`/books/${bookId}`);
          set({
            book,
            template: book.template || 'heritage',
            chapters: book.chapters || [],
            coverDesign: book.coverDesign || get().coverDesign,
            loading: false,
          });
          // Load blueprint if exists
          if (book.customization?.pages?.length) {
            get().loadBlueprint(book.customization);
          }
          return book;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      loadDocuments: async (collectionId) => {
        try {
          const result = await api.get(`/collections/${collectionId}`);
          const items = result.items || [];
          const docs = items.map((item) => {
            const data = item.scan?.extractedData || {};
            const docType = item.scan?.documentType || 'other';
            let content = data.text || data.content || '';

            // Format recipe content using structured fields when available
            if (docType === 'recipe' && (data.ingredients || data.instructions)) {
              const parts = [];
              if (data.servings) parts.push(`Serves ${data.servings}`);
              if (data.prepTime) parts.push(`Prep: ${data.prepTime}`);
              if (data.cookTime) parts.push(`Cook: ${data.cookTime}`);
              if (parts.length) content = parts.join('  •  ') + '\n\n';
              else content = '';

              if (data.ingredients?.length) {
                content += 'Ingredients\n';
                for (const ing of data.ingredients) {
                  if (typeof ing === 'string') {
                    content += `• ${ing}\n`;
                  } else {
                    const amount = [ing.amount, ing.unit].filter(Boolean).join(' ');
                    content += amount ? `• ${amount} ${ing.item}\n` : `• ${ing.item}\n`;
                  }
                }
              }

              if (data.instructions?.length) {
                content += '\nInstructions\n';
                data.instructions.forEach((step, i) => {
                  content += `${i + 1}. ${step}\n`;
                });
              }

              if (data.notes) {
                content += `\nNotes: ${data.notes}`;
              }
            }

            return {
              id: item.id,
              title: item.scan?.title || item.title || 'Untitled',
              content,
              documentType: docType,
              imageKey: item.scan?.r2Key || null,
            };
          });
          set({ documents: docs });
          return docs;
        } catch (error) {
          console.error('Failed to load documents:', error);
          set({ documents: [] });
          return [];
        }
      },

      updateTemplate: (template) => {
        set({ template });
      },

      updateCover: (coverData) => {
        set((state) => ({
          coverDesign: { ...state.coverDesign, ...coverData },
        }));
      },

      updateBook: async (bookId, data) => {
        try {
          const updated = await api.put(`/books/${bookId}`, data);
          set((state) => ({
            book: state.book?.id === bookId
              ? { ...state.book, ...updated }
              : state.book,
          }));
          return updated;
        } catch (error) {
          throw error;
        }
      },

      saveBlueprint: async (bookId) => {
        const { blueprint } = get();
        if (!blueprint || !bookId) return;
        set({ saveStatus: 'saving' });
        try {
          // Strip coverDesign.photo (data URL) before saving — server only needs photoKey
          const { photo, ...coverDesignClean } = blueprint.coverDesign || {};
          const cleanBlueprint = { ...blueprint, coverDesign: coverDesignClean };
          await api.put(`/books/${bookId}`, { customization: cleanBlueprint });
          set({ saveStatus: 'saved', dirty: false });
        } catch (error) {
          set({ saveStatus: 'unsaved' });
          throw error;
        }
      },

      uploadCoverPhoto: async (bookId, photoDataUrl) => {
        try {
          const img = new Image();
          const loaded = new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          img.src = photoDataUrl;
          await loaded;

          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const jpegBlob = await new Promise((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', 0.92)
          );
          const file = new File([jpegBlob], 'cover-photo.jpg', { type: 'image/jpeg' });
          return await api.upload(`/books/${bookId}/cover-photo`, file);
        } catch (error) {
          console.error('Cover photo upload failed:', error);
          throw error;
        }
      },

      generatePdf: async (bookId) => {
        set({ generatingPdf: true });
        try {
          // Upload cover photo to R2 if it exists as a data URL but hasn't been uploaded
          const { blueprint, uploadCoverPhoto: doUpload } = get();
          if (blueprint?.coverDesign?.photo && !blueprint?.coverDesign?.photoKey) {
            try {
              const result = await doUpload(bookId, blueprint.coverDesign.photo);
              get().updateCoverDesign({ photoKey: result.photoKey, photoMimeType: 'image/jpeg' });
            } catch {
              // Continue without cover photo if upload fails
            }
          }

          // Save blueprint before generating (strip photo data URL to avoid huge request)
          const currentBlueprint = get().blueprint;
          if (currentBlueprint?.pages?.length) {
            const { photo, ...coverClean } = currentBlueprint.coverDesign || {};
            const cleanBp = { ...currentBlueprint, coverDesign: coverClean };
            await api.put(`/books/${bookId}`, { customization: cleanBp });
          }
          const result = await api.post(`/books/${bookId}/generate`);
          set((state) => ({
            generatingPdf: false,
            book: state.book?.id === bookId
              ? { ...state.book, pageCount: result.pageCount, status: result.status }
              : state.book,
          }));
          return result;
        } catch (error) {
          set({ generatingPdf: false });
          throw error;
        }
      },

      orderBook: async (bookId, shippingAddress, quantity = 1, printOptions = null) => {
        set({ loading: true });
        try {
          const body = { shippingAddress, quantity };
          if (printOptions) body.printOptions = printOptions;
          const order = await api.post(`/books/${bookId}/order`, body);
          set({ loading: false });
          return order;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      checkStatus: async (bookId) => {
        try {
          const status = await api.get(`/books/${bookId}/status`);
          set((state) => ({
            book: state.book?.id === bookId
              ? { ...state.book, status: status.status }
              : state.book,
          }));
          return status;
        } catch (error) {
          throw error;
        }
      },

      // Upload additional image for book
      uploadBookImage: async (bookId, file) => {
        try {
          const result = await api.upload(`/books/${bookId}/images`, file);
          get().addAdditionalImage(result);
          return result;
        } catch (error) {
          throw error;
        }
      },

      deleteBookImage: async (bookId, key) => {
        try {
          await api.delete(`/books/${bookId}/images/${encodeURIComponent(key)}`);
          get().removeAdditionalImage(key);
        } catch (error) {
          throw error;
        }
      },
    }),
    {
      // zundo temporal options — only track blueprint changes for undo/redo
      partialize: (state) => ({
        blueprint: state.blueprint,
        selectedPageIndex: state.selectedPageIndex,
        selectedElementId: state.selectedElementId,
      }),
      limit: 50,
    }
  )
);
