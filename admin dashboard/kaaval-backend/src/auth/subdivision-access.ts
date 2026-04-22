import { Role } from './roles.enum.js';

export interface ScopedUser {
  role: string;
  subdivision?: string | null;
}

type LngLat = [number, number];

interface SubdivisionScope {
  name: string;
  keywords: string[];
  polygon: LngLat[];
}

export const SUBDIVISION_ROLES: Role[] = [
  Role.COLACHEL_ADMIN,
  Role.MARTHANDAM_ADMIN,
  Role.NAGERCOIL_ADMIN,
  Role.KANYAKUMARI_ADMIN,
  Role.THUCKALAY_ADMIN,
];

const FULL_ACCESS_ROLES = new Set<Role>([
  Role.SUPER_ADMIN,
  Role.TRAFFIC_ADMIN,
  Role.DEV_ADMIN,
]);

const SUBDIVISION_SCOPE_BY_ROLE: Record<Role, SubdivisionScope | undefined> = {
  [Role.SUPER_ADMIN]: undefined,
  [Role.TRAFFIC_ADMIN]: undefined,
  [Role.DEV_ADMIN]: undefined,
  [Role.COLACHEL_ADMIN]: {
    name: 'Colachel',
    keywords: ['colachel'],
    polygon: [
      [77.172, 8.082],
      [77.21, 8.12],
      [77.265, 8.132],
      [77.302, 8.112],
      [77.332, 8.14],
      [77.335, 8.19],
      [77.308, 8.226],
      [77.252, 8.236],
      [77.206, 8.224],
      [77.168, 8.192],
    ],
  },
  [Role.MARTHANDAM_ADMIN]: {
    name: 'Marthandam',
    keywords: ['marthandam'],
    polygon: [
      [77.145, 8.228],
      [77.2, 8.218],
      [77.252, 8.236],
      [77.282, 8.272],
      [77.312, 8.306],
      [77.304, 8.36],
      [77.246, 8.392],
      [77.184, 8.382],
      [77.136, 8.334],
      [77.128, 8.278],
    ],
  },
  [Role.NAGERCOIL_ADMIN]: {
    name: 'Nagercoil',
    keywords: ['nagercoil', 'ramanputhoor'],
    polygon: [
      [77.328, 8.132],
      [77.366, 8.116],
      [77.41, 8.122],
      [77.454, 8.148],
      [77.478, 8.188],
      [77.472, 8.238],
      [77.428, 8.274],
      [77.372, 8.282],
      [77.326, 8.246],
      [77.31, 8.19],
    ],
  },
  [Role.KANYAKUMARI_ADMIN]: {
    name: 'Kanyakumari',
    keywords: ['kanyakumari', 'cape'],
    polygon: [
      [77.39, 7.982],
      [77.444, 8.002],
      [77.506, 8.028],
      [77.566, 8.066],
      [77.624, 8.112],
      [77.65, 8.162],
      [77.63, 8.212],
      [77.566, 8.226],
      [77.504, 8.206],
      [77.448, 8.168],
      [77.404, 8.116],
      [77.386, 8.056],
    ],
  },
  [Role.THUCKALAY_ADMIN]: {
    name: 'Thuckalay',
    keywords: ['thuckalay'],
    polygon: [
      [77.234, 8.162],
      [77.276, 8.152],
      [77.322, 8.17],
      [77.358, 8.21],
      [77.372, 8.258],
      [77.352, 8.304],
      [77.304, 8.328],
      [77.252, 8.318],
      [77.216, 8.284],
      [77.206, 8.228],
    ],
  },
};

export function hasFullAccessRole(role?: string | null): boolean {
  if (!role) return false;
  return FULL_ACCESS_ROLES.has(role as Role);
}

export function getSubdivisionScopeByRole(role?: string | null): SubdivisionScope | null {
  if (!role) return null;
  return SUBDIVISION_SCOPE_BY_ROLE[role as Role] ?? null;
}

function pointInPolygon(point: LngLat, polygon: LngLat[]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function isInUserScope(
  user: ScopedUser | undefined,
  lat?: number | null,
  lng?: number | null,
  locationText?: string | null,
): boolean {
  if (!user || hasFullAccessRole(user.role)) {
    return true;
  }

  const subdivision = getSubdivisionScopeByRole(user.role);
  if (!subdivision) {
    return false;
  }

  if (typeof lat === 'number' && typeof lng === 'number') {
    return pointInPolygon([lng, lat], subdivision.polygon);
  }

  const text = (locationText ?? '').toLowerCase();
  if (!text) return false;
  return subdivision.keywords.some((k) => text.includes(k));
}
