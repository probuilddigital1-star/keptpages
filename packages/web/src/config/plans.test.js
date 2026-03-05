import { PLANS, BOOK_PRICING } from './plans';

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

    it('has correct price of 14.99', () => {
      expect(PLANS.BOOK_PROJECT.price).toBe(14.99);
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
  it('has base price of 79', () => {
    expect(BOOK_PRICING.base).toBe(79);
  });

  it('has max price of 149', () => {
    expect(BOOK_PRICING.max).toBe(149);
  });

  it('has per-extra-page cost of 0.5', () => {
    expect(BOOK_PRICING.perExtraPage).toBe(0.5);
  });

  it('has family pack discount of 15%', () => {
    expect(BOOK_PRICING.familyPackDiscount).toBe(0.15);
  });

  it('has familyPackMinQty of 5', () => {
    expect(BOOK_PRICING.familyPackMinQty).toBe(5);
  });
});
