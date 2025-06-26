// Interface for Roam block structure
export interface RoamBlock {
  uid: string;
  string: string;
  order: number;
  heading?: number | null;
  children: RoamBlock[];
}
