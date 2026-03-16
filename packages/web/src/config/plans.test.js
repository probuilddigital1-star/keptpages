import {
  PLANS,
  TIER_LIMITS,
  BOOK_TIERS,
  BOOK_ADDONS,
  BOOK_PRICING,
  calculateBookPrice,
  resolvePrintOptions,
} from './plans';

describe('PLANS', () => {
  describe('FREE plan', () => {
    it('has correct id', () => {
      expect(PLANS.FREE.id).toBe('free');
    });

    it('has price of 0', () => {
      expect(PLANS.FREE.price).toBe(0);
    });

    it('has 40 scan limit', () => {
      expect(PLANS.FREE.limits.scans).toBe(40);
    });

    it('has 2 collection limit', () => {
      expect(PLANS.FREE.limits.collections).toBe(2);
    });

    it('has expected features list', () => {
      expect(PLANS.FREE.features).toEqual(
        expect.arrayContaining([
          '40 scans per month',
          '2 collections',
          'AI text extraction',
        ])
      );
    });
  });

  describe('KEEPER_PASS plan', () => {
    it('has correct id', () => {
      expect(PLANS.KEEPER_PASS.id).toBe('keeper');
    });

    it('has correct price of 59', () => {
      expect(PLANS.KEEPER_PASS.price).toBe(59);
    });

    it('is marked as oneTime purchase', () => {
      expect(PLANS.KEEPER_PASS.oneTime).toBe(true);
    });

    it('has unlimited scans (Infinity)', () => {
      expect(PLANS.KEEPER_PASS.limits.scans).toBe(Infinity);
    });

    it('has unlimited collections (Infinity)', () => {
      expect(PLANS.KEEPER_PASS.limits.collections).toBe(Infinity);
    });

    it('has expected features including "Unlimited scans"', () => {
      expect(PLANS.KEEPER_PASS.features).toContain('Unlimited scans');
      expect(PLANS.KEEPER_PASS.features).toContain('Unlimited collections');
      expect(PLANS.KEEPER_PASS.features).toContain('Family sharing');
      expect(PLANS.KEEPER_PASS.features).toContain('15% off all books forever');
    });
  });

  describe('KEEPER alias', () => {
    it('PLANS.KEEPER is same as PLANS.KEEPER_PASS', () => {
      expect(PLANS.KEEPER).toBe(PLANS.KEEPER_PASS);
    });
  });

  describe('BOOK_PURCHASER plan', () => {
    it('has correct id', () => {
      expect(PLANS.BOOK_PURCHASER.id).toBe('book_purchaser');
    });

    it('has unlimited scans', () => {
      expect(PLANS.BOOK_PURCHASER.limits.scans).toBe(Infinity);
    });

    it('has 3 collection limit', () => {
      expect(PLANS.BOOK_PURCHASER.limits.collections).toBe(3);
    });
  });
});

describe('TIER_LIMITS', () => {
  it('free tier has 40 scans and 2 collections', () => {
    expect(TIER_LIMITS.free.scans).toBe(40);
    expect(TIER_LIMITS.free.collections).toBe(2);
  });

  it('keeper tier has unlimited scans and collections', () => {
    expect(TIER_LIMITS.keeper.scans).toBe(Infinity);
    expect(TIER_LIMITS.keeper.collections).toBe(Infinity);
    expect(TIER_LIMITS.keeper.pdfExport).toBe(true);
    expect(TIER_LIMITS.keeper.sharing).toBe(true);
  });

  it('book_purchaser has per_book PDF export', () => {
    expect(TIER_LIMITS.book_purchaser.pdfExport).toBe('per_book');
  });
});

describe('BOOK_TIERS', () => {
  it('has classic, premium, and heirloom tiers', () => {
    expect(Object.keys(BOOK_TIERS)).toEqual(['classic', 'premium', 'heirloom']);
  });

  it('classic is $39 softcover B&W', () => {
    expect(BOOK_TIERS.classic.price).toBe(3900);
    expect(BOOK_TIERS.classic.binding).toBe('PB');
    expect(BOOK_TIERS.classic.interior).toBe('BW');
  });

  it('premium is $69 hardcover full color', () => {
    expect(BOOK_TIERS.premium.price).toBe(6900);
    expect(BOOK_TIERS.premium.binding).toBe('CW');
    expect(BOOK_TIERS.premium.interior).toBe('FC');
    expect(BOOK_TIERS.premium.featured).toBe(true);
  });

  it('heirloom is $79 hardcover full color premium paper', () => {
    expect(BOOK_TIERS.heirloom.price).toBe(7900);
    expect(BOOK_TIERS.heirloom.binding).toBe('CW');
    expect(BOOK_TIERS.heirloom.interior).toBe('FC');
    expect(BOOK_TIERS.heirloom.paper).toBe('080CW444');
  });
});

describe('BOOK_ADDONS', () => {
  it('glossy addon is free and available on all tiers', () => {
    expect(BOOK_ADDONS.glossy.price).toBe(0);
    expect(BOOK_ADDONS.glossy.tiers).toBe('all');
  });

  it('coil addon costs $8 and available on all tiers', () => {
    expect(BOOK_ADDONS.coil.price).toBe(800);
    expect(BOOK_ADDONS.coil.tiers).toBe('all');
  });

  it('color addon costs $10 and only available on classic', () => {
    expect(BOOK_ADDONS.color.price).toBe(1000);
    expect(BOOK_ADDONS.color.tiers).toEqual(['classic']);
  });
});

describe('BOOK_PRICING', () => {
  it('has 60 free pages', () => {
    expect(BOOK_PRICING.freePages).toBe(60);
  });

  it('has per-extra-page cost of 35 cents', () => {
    expect(BOOK_PRICING.perExtraPage).toBe(35);
  });
});

describe('calculateBookPrice', () => {
  it('returns tier base price for 60 or fewer pages', () => {
    expect(calculateBookPrice(60, 'premium')).toBe(6900);
    expect(calculateBookPrice(0, 'premium')).toBe(6900);
    expect(calculateBookPrice(30, 'classic')).toBe(3900);
  });

  it('adds per-page cost for pages over 60', () => {
    // 70 pages: 10 extra at 35 cents = 350
    expect(calculateBookPrice(70, 'premium')).toBe(6900 + 350);
  });

  it('adds addon prices', () => {
    expect(calculateBookPrice(40, 'premium', ['coil'])).toBe(6900 + 800);
    expect(calculateBookPrice(40, 'premium', ['glossy'])).toBe(6900); // free addon
  });

  it('skips addons not valid for the tier', () => {
    // Color addon is only for classic
    expect(calculateBookPrice(40, 'premium', ['color'])).toBe(6900);
  });

  it('includes color addon on classic tier', () => {
    expect(calculateBookPrice(40, 'classic', ['color'])).toBe(3900 + 1000);
  });

  it('applies 15% multi-copy discount at 3+ copies', () => {
    const expected = Math.round(6900 * 3 * 0.85);
    expect(calculateBookPrice(40, 'premium', [], 3)).toBe(expected);
  });

  it('applies 20% multi-copy discount at 5+ copies', () => {
    const expected = Math.round(6900 * 5 * 0.80);
    expect(calculateBookPrice(40, 'premium', [], 5)).toBe(expected);
  });

  it('applies keeper discount (15%)', () => {
    const expected = Math.round(6900 * 0.85);
    expect(calculateBookPrice(40, 'premium', [], 1, true)).toBe(expected);
  });

  it('stacks multi-copy and keeper discounts multiplicatively', () => {
    const afterMulti = Math.round(6900 * 3 * 0.85);
    const expected = Math.round(afterMulti * 0.85);
    expect(calculateBookPrice(40, 'premium', [], 3, true)).toBe(expected);
  });

  it('throws for unknown tier', () => {
    expect(() => calculateBookPrice(40, 'fake')).toThrow('Unknown book tier: fake');
  });

  it('handles negative page count without crashing', () => {
    expect(calculateBookPrice(-5, 'classic')).toBe(3900);
  });
});

describe('resolvePrintOptions', () => {
  it('returns tier defaults with no addons', () => {
    expect(resolvePrintOptions('premium')).toEqual({
      binding: 'CW', interior: 'FC', paper: '060UW444', cover: 'M',
    });
  });

  it('glossy addon overrides cover to G', () => {
    expect(resolvePrintOptions('classic', ['glossy'])).toEqual({
      binding: 'PB', interior: 'BW', paper: '060UW444', cover: 'G',
    });
  });

  it('coil addon overrides binding to CO', () => {
    expect(resolvePrintOptions('premium', ['coil'])).toEqual({
      binding: 'CO', interior: 'FC', paper: '060UW444', cover: 'M',
    });
  });

  it('color addon overrides interior on classic', () => {
    expect(resolvePrintOptions('classic', ['color'])).toEqual({
      binding: 'PB', interior: 'FC', paper: '060UW444', cover: 'M',
    });
  });

  it('color addon is skipped on premium (tier restriction)', () => {
    expect(resolvePrintOptions('premium', ['color'])).toEqual({
      binding: 'CW', interior: 'FC', paper: '060UW444', cover: 'M',
    });
  });

  it('throws for unknown tier', () => {
    expect(() => resolvePrintOptions('fake')).toThrow('Unknown book tier: fake');
  });
});
