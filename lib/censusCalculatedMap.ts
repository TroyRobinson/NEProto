export interface CalculatedMapping {
  numerator: string;
  denominator: string;
  label: string;
}

// Curated mappings for common calculated metrics.
// Variable ids include _001E where appropriate.
const CALC_MAP: Array<{
  match: (q: string) => boolean;
  value: CalculatedMapping;
}> = [
  {
    match: (q) => /\b(poverty\s*rate|percent\s*(below|in)\s*poverty|share\s*(below|in)\s*poverty|below\s*poverty\s*rate)\b/i.test(q),
    value: {
      numerator: 'B17001_002E', // Below poverty level
      denominator: 'B17001_001E', // Total population for whom poverty status is determined
      label: 'Poverty Rate (%)',
    },
  },
  {
    match: (q) => /\b(unemployment\s*rate|jobless\s*rate|unemployed\s*share|%\s*unemployed)\b/i.test(q),
    value: {
      // Unemployment rate = Unemployed / Civilian labor force
      numerator: 'B23025_005E',
      denominator: 'B23025_003E',
      label: 'Unemployment Rate (%)',
    },
  },
  {
    match: (q) => /\b(labor\s*force\s*participation|lfpr|participation\s*rate)\b/i.test(q),
    value: {
      // Labor force participation = Civilian labor force / Population 16+
      numerator: 'B23025_003E',
      denominator: 'B23025_001E',
      label: 'Labor Force Participation (%)',
    },
  },
  {
    match: (q) => /\b(renter\s*rate|renters\s*share|%\s*renter-?occupied|rentership)\b/i.test(q),
    value: {
      numerator: 'B25003_003E', // Renter-occupied housing units
      denominator: 'B25003_001E', // Total occupied housing units
      label: 'Renter-Occupied Share (%)',
    },
  },
  {
    match: (q) => /\b(home( ?owner(ship)?|ownership)\s*rate|owner-?occupied\s*share)\b/i.test(q),
    value: {
      numerator: 'B25003_002E', // Owner-occupied housing units
      denominator: 'B25003_001E', // Total occupied housing units
      label: 'Homeownership Rate (%)',
    },
  },
  {
    match: (q) => /\b(vacancy\s*rate|%\s*vacant|vacant\s*units\s*share)\b/i.test(q),
    value: {
      numerator: 'B25002_003E', // Vacant housing units
      denominator: 'B25002_001E', // Total housing units
      label: 'Housing Vacancy Rate (%)',
    },
  },
  {
    match: (q) => /\b(snap|food\s*stamps?|ebt).*\b(rate|percent|share)\b/i.test(q),
    value: {
      numerator: 'B22003_002E', // Households with SNAP
      denominator: 'B22003_001E', // Total households
      label: 'SNAP Participation Rate (%)',
    },
  },
  {
    match: (q) => /\b(percent(age)?\s*hispanic|hispanic\s*share|latino\s*share|percent\s*latino)\b/i.test(q),
    value: {
      numerator: 'B03003_003E', // Hispanic or Latino
      denominator: 'B03003_001E', // Total population
      label: 'Hispanic or Latino (%)',
    },
  },
  {
    match: (q) => /\b(percent\s*white|white\s*share)\b/i.test(q),
    value: {
      numerator: 'B02001_002E', // White alone
      denominator: 'B02001_001E', // Total
      label: 'White Alone (%)',
    },
  },
  {
    match: (q) => /\b(percent\s*black|black\s*share|african\s*american\s*share)\b/i.test(q),
    value: {
      numerator: 'B02001_003E', // Black or African American alone
      denominator: 'B02001_001E', // Total
      label: 'Black or African American (%)',
    },
  },
  {
    match: (q) => /\b(foreign-?born\s*rate|foreign\s*born\s*share|immigrant\s*share)\b/i.test(q),
    value: {
      numerator: 'B05012_003E', // Foreign born
      denominator: 'B05012_001E', // Total
      label: 'Foreign Born (%)',
    },
  },
  {
    match: (q) => /\b(drive|driving)\s*alone.*\b(rate|share|percent)\b/i.test(q),
    value: {
      numerator: 'B08301_003E', // Car, truck, or van - drove alone
      denominator: 'B08301_001E', // Total workers
      label: 'Drive Alone to Work (%)',
    },
  },
  {
    match: (q) => /\b(percent\s*female|female\s*share|%\s*female)\b/i.test(q),
    value: {
      numerator: 'B01001_026E', // Female total
      denominator: 'B01001_001E', // Total population
      label: 'Female (%)',
    },
  },
];

export function findCalculated(query: string): CalculatedMapping | null {
  const q = query.toLowerCase();
  for (const { match, value } of CALC_MAP) {
    if (match(q)) return value;
  }
  return null;
}
