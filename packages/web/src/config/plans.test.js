import {
  PLANS,
  BOOK_PRICING,
  PRINT_OPTIONS,
  DEFAULT_PRINT_OPTIONS,
  calculateOptionModifiers,
  calculateBookPrice,
} from './plans';

describe('PLANS', () => {
  describe('FREE plan', () => {
    it('has correct id', () => {
      expect(PLANS.FREE.id).toBe('free');
    });

    it('has price of 0', () => {
      expect(PLANS.FREE.price).toBe(0);
    });

    it('has 25 scan limit', () => {
      expect(PLANS.FREE.limits.scans).toBe(25);
    });

    it('has 5 collection limit', () => {
      expect(PLANS.FREE.limits.collections).toBe(5);
    });

    it('has expected features list', () => {
      expect(PLANS.FREE.features).toEqual(
        expect.arrayContaining([
          '25 document scans',
          '5 collections',
          'AI text extraction',
          'Basic PDF export',
        ])
      );
    });
  });

  describe('KEEPER plan', () => {
    it('has correct id', () => {
      expect(PLANS.KEEPER.id).toBe('keeper');
    });

    it('has correct price of 39.99', () => {
      expect(PLANS.KEEPER.price).toBe(39.99);
    });

    it('has yearly billing period', () => {
      expect(PLANS.KEEPER.period).toBe('year');
    });

    it('has unlimited scans (Infinity)', () => {
      expect(PLANS.KEEPER.limits.scans).toBe(Infinity);
    });

    it('has unlimited collections (Infinity)', () => {
      expect(PLANS.KEEPER.limits.collections).toBe(Infinity);
    });

    it('has expected features including "Unlimited scans"', () => {
      expect(PLANS.KEEPER.features).toContain('Unlimited scans');
      expect(PLANS.KEEPER.features).toContain('Unlimited collections');
      expect(PLANS.KEEPER.features).toContain('Family sharing');
    });
  });

  describe('BOOK_PROJECT plan', () => {
    it('has correct id', () => {
      expect(PLANS.BOOK_PROJECT.id).toBe('book_project');
    });

    it('has correct price of 79', () => {
      expect(PLANS.BOOK_PROJECT.price).toBe(79);
    });

    it('is marked as oneTime purchase', () => {
      expect(PLANS.BOOK_PROJECT.oneTime).toBe(true);
    });

    it('does not have a billing period', () => {
      expect(PLANS.BOOK_PROJECT.period).toBeUndefined();
    });

    it('has expected features', () => {
      expect(PLANS.BOOK_PROJECT.features).toContain(
        'Professional book designer'
      );
      expect(PLANS.BOOK_PROJECT.features).toContain('Print-ready PDF');
    });
  });
});

describe('BOOK_PRICING', () => {
  it('has base price of 7900 cents', () => {
    expect(BOOK_PRICING.base).toBe(7900);
  });

  it('has max price of 14900 cents', () => {
    expect(BOOK_PRICING.max).toBe(14900);
  });

  it('has per-extra-page cost of 50 cents', () => {
    expect(BOOK_PRICING.perExtraPage).toBe(50);
  });

  it('has 40 free pages', () => {
    expect(BOOK_PRICING.freePages).toBe(40);
  });

  it('has family pack discount of 15%', () => {
    expect(BOOK_PRICING.familyPackDiscount).toBe(0.15);
  });

  it('has familyPackMinQty of 5', () => {
    expect(BOOK_PRICING.familyPackMinQty).toBe(5);
  });
});

describe('PRINT_OPTIONS', () => {
  it('has 4 option groups', () => {
    expect(Object.keys(PRINT_OPTIONS)).toEqual(['binding', 'interior', 'paper', 'cover']);
  });

  it('binding has 3 options', () => {
    expect(PRINT_OPTIONS.binding.options).toHaveLength(3);
  });

  it('interior has 2 options', () => {
    expect(PRINT_OPTIONS.interior.options).toHaveLength(2);
  });

  it('paper has 2 options', () => {
    expect(PRINT_OPTIONS.paper.options).toHaveLength(2);
  });

  it('cover has 2 options', () => {
    expect(PRINT_OPTIONS.cover.options).toHaveLength(2);
  });
});

describe('DEFAULT_PRINT_OPTIONS', () => {
  it('defaults to cheapest options', () => {
    expect(DEFAULT_PRINT_OPTIONS).toEqual({
      binding: 'PB',
      interior: 'BW',
      paper: '060UW444',
      cover: 'M',
    });
  });
});

describe('calculateOptionModifiers', () => {
  it('returns 0 for default options', () => {
    expect(calculateOptionModifiers(DEFAULT_PRINT_OPTIONS)).toBe(0);
  });

  it('adds hardcover modifier', () => {
    expect(calculateOptionModifiers({ ...DEFAULT_PRINT_OPTIONS, binding: 'CW' })).toBe(1500);
  });

  it('adds full color modifier', () => {
    expect(calculateOptionModifiers({ ...DEFAULT_PRINT_OPTIONS, interior: 'FC' })).toBe(2000);
  });

  it('sums multiple modifiers', () => {
    const opts = { binding: 'CW', interior: 'FC', paper: '080CW444', cover: 'G' };
    expect(calculateOptionModifiers(opts)).toBe(1500 + 2000 + 800 + 0);
  });
});

describe('calculateBookPrice', () => {
  it('returns base price for 40 or fewer pages with defaults', () => {
    expect(calculateBookPrice(40)).toBe(7900);
    expect(calculateBookPrice(0)).toBe(7900);
    expect(calculateBookPrice(20)).toBe(7900);
  });

  it('adds per-page cost for extra pages', () => {
    expect(calculateBookPrice(50)).toBe(7900 + 10 * 50); // 8400
  });

  it('adds option modifiers to base', () => {
    const opts = { binding: 'CW', interior: 'BW', paper: '060UW444', cover: 'M' };
    expect(calculateBookPrice(40, opts)).toBe(7900 + 1500); // 9400
  });

  it('caps at max + modifiers', () => {
    // 300 extra pages would be 7900 + 300*50 = 22900, capped at 14900
    expect(calculateBookPrice(340)).toBe(14900);
  });

  it('caps at max + modifiers for premium options', () => {
    const opts = { binding: 'CW', interior: 'FC', paper: '080CW444', cover: 'G' };
    expect(calculateBookPrice(340, opts)).toBe(14900 + 1500 + 2000 + 800);
  });
});
