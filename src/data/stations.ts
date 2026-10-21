export interface Station {
  id: string;
  hubNumber: string;
  name: string;
  subLocation: string;
  totalDocks: number;
  availableBikes: number;
  freeDocks: number;
  status: "ONLINE" | "BUSY" | "REBALANCE_INCENTIVE";
  walkingTime: string;
  walkingDistanceMeters: number;
  solarGridPercent: number;
  dockReadinessPercent?: number;
  coordinates: { x: number; y: number };
  rebalanceCredit?: number;
}

export const CAMPUS_STATIONS: Station[] = [
  {
    id: "hub-sports",
    hubNumber: "CENTRAL DOCK",
    name: "Sports Complex & Tennis Courts Dock",
    subLocation: "Tennis Courts & Sports Complex Point • Central One-Stop Dock",
    totalDocks: 35,
    availableBikes: 18,
    freeDocks: 17,
    status: "ONLINE",
    walkingTime: "Central Dock",
    walkingDistanceMeters: 0,
    solarGridPercent: 99,
    dockReadinessPercent: 100,
    coordinates: { x: 73.5, y: 78.5 },
  },
];

