import { buildPodPackageId } from '../services/lulu.js';

describe('buildPodPackageId', () => {
  it('returns default package ID with no options', () => {
    expect(buildPodPackageId()).toBe('0850X1100BWSTDPB060UW444MXX');
  });

  it('returns default package ID with empty options', () => {
    expect(buildPodPackageId({})).toBe('0850X1100BWSTDPB060UW444MXX');
  });

  it('builds hardcover full-color coated glossy', () => {
    const result = buildPodPackageId({
      binding: 'CW',
      interior: 'FC',
      paper: '080CW444',
      cover: 'G',
    });
    expect(result).toBe('0850X1100FCSTDCW080CW444GXX');
  });

  it('builds coil-bound BW uncoated matte', () => {
    const result = buildPodPackageId({
      binding: 'CO',
      interior: 'BW',
      paper: '060UW444',
      cover: 'M',
    });
    expect(result).toBe('0850X1100BWSTDCO060UW444MXX');
  });

  it('builds paperback full-color coated matte', () => {
    const result = buildPodPackageId({
      binding: 'PB',
      interior: 'FC',
      paper: '080CW444',
      cover: 'M',
    });
    expect(result).toBe('0850X1100FCSTDPB080CW444MXX');
  });

  it('uses defaults for missing options', () => {
    const result = buildPodPackageId({ binding: 'CW' });
    expect(result).toBe('0850X1100BWSTDCW060UW444MXX');
  });

  it('always starts with 0850X1100 trim', () => {
    const id = buildPodPackageId({ binding: 'CO', interior: 'FC', paper: '080CW444', cover: 'G' });
    expect(id.startsWith('0850X1100')).toBe(true);
  });

  it('always has STD quality segment', () => {
    const id = buildPodPackageId({ binding: 'CW', interior: 'FC' });
    expect(id).toContain('STD');
  });
});
