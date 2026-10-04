export interface Subject {
  id: string;
  name: string;
  createdAt: string;
}

export interface Area {
  id: string;
  branchId: string;
  name: string;
  createdAt: string;
  branch?: { id: string; name: string };
}
