import { CRUISE, customProfile, TWIST_SEEKER, profileById } from './profiles';

describe('profiles', () => {
  it('maps twist seeker onto Valhalla motorcycle levers', () => {
    expect(TWIST_SEEKER.providerParams.useHighways).toBe(0);
    expect(TWIST_SEEKER.providerParams.useTrails).toBe(0.9);
    expect(TWIST_SEEKER.providerParams.avoidFeatures).toEqual(
      expect.arrayContaining(['highways', 'tollways']),
    );
  });

  it('maps cruise toward highways and away from trails', () => {
    expect(CRUISE.providerParams.useHighways).toBe(0.95);
    expect(CRUISE.providerParams.useTrails).toBe(0);
  });

  it('derives custom costing from the curviness slider', () => {
    const twisty = customProfile({
      curviness: 10,
      maxSharpness: 1,
      avoidMotorway: true,
      avoidToll: true,
      avoidFerry: true,
      avoidUnpaved: false,
      maxDetourRatio: 1.35,
    });
    expect(twisty.providerParams.useHighways).toBe(0);
    expect(twisty.providerParams.useTrails).toBeCloseTo(0.9);
    expect(twisty.waypointStrategy).toBe('aggressive');
  });

  it('returns builtin profiles by id', () => {
    expect(profileById('balanced').id).toBe('balanced');
  });
});
