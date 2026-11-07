export interface Subject {
  id: string;
  name: string;
  createdAt: string;
}

export interface Area {
  id: string;
  branchId: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  /** Great-circle distance from this area to its own branch, in km — null when either side's coordinates aren't set. See master-data.service.ts listAreas. */
  distanceKm: number | null;
  createdAt: string;
  branch?: { id: string; name: string };
}
