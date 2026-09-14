import { speakLikeCoDriver, spellOutNumber } from '../normalizeSpeech';

describe('spellOutNumber', () => {
  it('uses words under 20 and "three fifty" for 350', () => {
    expect(spellOutNumber(4)).toBe('four');
    expect(spellOutNumber(20)).toBe('twenty');
    expect(spellOutNumber(150)).toBe('one fifty');
    expect(spellOutNumber(350)).toBe('three fifty');
    expect(spellOutNumber(300)).toBe('three hundred');
  });
});

describe('speakLikeCoDriver', () => {
  it('prepends nothing and keeps digits by default', () => {
    expect(speakLikeCoDriver('  In 150, left four.  ')).toBe(
      'In 150, left four.',
    );
  });

  it('spells distances only when opted in', () => {
    expect(
      speakLikeCoDriver('In 150, left four.', { spellOutDistances: true }),
    ).toBe('In one fifty, left four.');
  });
});
