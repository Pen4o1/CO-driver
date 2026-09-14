export const colors = {
  bg: '#0B0D10',
  surface: '#161A20',
  surfaceRaised: '#1E2430',
  border: '#2A3140',
  text: '#F4F4F5',
  muted: '#9CA3AF',
  accent: '#E8F07A',
  accentMuted: '#3F4A1F',
  danger: '#F87171',
  route: '#7DD3FC',
  pinStart: '#34D399',
  pinEnd: '#F87171',
  grade1: '#E11D48',
  grade2: '#F97316',
  grade3: '#F59E0B',
  grade4: '#EAB308',
  grade5: '#4ADE80',
  grade6: '#22D3EE',
} as const;

export const gradeColor: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: colors.grade1,
  2: colors.grade2,
  3: colors.grade3,
  4: colors.grade4,
  5: colors.grade5,
  6: colors.grade6,
};

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
} as const;

export const type = {
  title: 28,
  body: 16,
  caption: 13,
  hud: 28,
} as const;
