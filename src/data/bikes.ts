export interface Bike {
  id: string;
  name: string;
  series: string;
  modelCode: string;
  category: "commuter" | "city" | "trail" | "step-thru";
  categoryLabel: string;
  conditionBadge: string;
  conditionType: "ready" | "inspected" | "sanitized" | "maintenance" | "attention";
  isMaintenance?: boolean;
  dockNumber: string;
  distanceMeters: number;
  distanceWalkText: string;
  hourlyRate: number;
  ratePerKm?: number;
  rateSubtext: string;
  specs: {
    motorOrGear: string;
    features: string[];
    topSpeed: string;
    tirePressurePsi?: number;
    sensorStatus?: string;
  };
  image: string;
  tags: string[];
}

/**
 * 35 Canonical Conventional Bicycles of AIT Pune CampusCycle Fleet
 */
export const CAMPUS_BIKES: Bike[] = [
  {
    id: "e-commuter-07",
    name: "Campus Commuter #07",
    series: "Campus Commuter Series II",
    modelCode: "CC-007",
    category: "commuter",
    categoryLabel: "Classic Commuter",
    conditionBadge: "Brakes & Chain Inspected",
    conditionType: "inspected",
    dockNumber: "Bay 07",
    distanceMeters: 10,
    distanceWalkText: "10m away",
    hourlyRate: 25,
    rateSubtext: "₹25/hr Flat Rate",
    specs: {
      motorOrGear: "Shimano 21-Speed • Caliper Rim Brakes",
      features: ["Quick-Release Saddle", "Dual Rim Brakes", "Safety Spoke Reflectors", "Front Wire Basket"],
      topSpeed: "Pedal Powered (21 Gears)",
      tirePressurePsi: 50,
      sensorStatus: "Brake & Chain Inspection Passed",
    },
    image: "/bikes/city-cruiser.jpg",
    tags: ["21-Speed Shimano", "Dual Rim Brakes"],
  },
  {
    id: "city-cruiser-12",
    name: "City Cruiser #12",
    series: "Classic Campus Utility",
    modelCode: "CC-012",
    category: "city",
    categoryLabel: "City Cruiser",
    conditionBadge: "100% Road Ready",
    conditionType: "ready",
    dockNumber: "Bay 12",
    distanceMeters: 15,
    distanceWalkText: "15m away",
    hourlyRate: 25,
    rateSubtext: "₹25/hr Flat Rate",
    specs: {
      motorOrGear: "Shimano 7-Speed • Puncture-Resistant Tires",
      features: ["Easy Saddle Adjust", "Loud Ding Bell", "Front Wire Carrier", "Water Bottle Cage"],
      topSpeed: "Human Powered (7 Gears)",
      tirePressurePsi: 45,
      sensorStatus: "Full Mechanical Clearance",
    },
    image: "/bikes/city-cruiser.jpg",
    tags: ["Easy Saddle Adjust", "Loud Ding Bell"],
  },
  {
    id: "trail-gravel-04",
    name: "Mountain Bike #04",
    series: "TrailCommuter Series",
    modelCode: "CC-004",
    category: "trail",
    categoryLabel: "Trail & Gravel",
    conditionBadge: "Inspected today 08:30 AM",
    conditionType: "inspected",
    dockNumber: "Bay 04",
    distanceMeters: 20,
    distanceWalkText: "20m away",
    hourlyRate: 25,
    rateSubtext: "₹25/hr Flat Rate",
    specs: {
      motorOrGear: "Dual Suspension • Hill Climber Ratios",
      features: ["Ridge & Slope Grade", "Heavy Duty Chains", "Disc Brakes", "All-Terrain Knobby"],
      topSpeed: "25 km/h Campus Cap",
      tirePressurePsi: 52,
      sensorStatus: "Mechanical Stand Lock: Secured",
    },
    image: "/bikes/trail-gravel.jpg",
    tags: ["Ridge & Slope Grade", "Heavy Duty Chains"],
  },
  {
    id: "step-thru-09",
    name: "Campus Step-Thru #09",
    series: "Comfort Glide Fleet",
    modelCode: "CC-009",
    category: "step-thru",
    categoryLabel: "Step-Thru Comfort",
    conditionBadge: "Inspected & Sanitized",
    conditionType: "sanitized",
    dockNumber: "Bay 09",
    distanceMeters: 25,
    distanceWalkText: "25m away",
    hourlyRate: 25,
    rateSubtext: "₹25/hr Flat Rate",
    specs: {
      motorOrGear: "Lightweight Aluminum • Large Rear Cargo Rack",
      features: ["Low Standover Frame", "Backpack Straps", "Chain Guard", "Comfort Wide Saddle"],
      topSpeed: "Cruising Speed (Easy Mount)",
      tirePressurePsi: 48,
      sensorStatus: "Sanitized with UV-C Kiosk",
    },
    image: "/bikes/campus-stepthru.jpg",
    tags: ["Backpack Straps", "Chain Guard"],
  },
  // Canonical Fleet Entries CC-001 through CC-035 (remaining 31 bikes)
  ...(Array.from({ length: 35 }, (_, idx) => {
    const num = idx + 1;
    // Skip 4, 7, 9, 12 since they are configured above with legacy IDs
    if (num === 4 || num === 7 || num === 9 || num === 12) return null;
    const pad = num.toString().padStart(3, "0");
    const category: "commuter" | "city" | "trail" | "step-thru" = 
      num <= 12 ? "commuter" : num <= 22 ? "city" : num <= 30 ? "trail" : "step-thru";
    const categoryLabel = 
      category === "commuter" ? "Classic Commuter" : category === "city" ? "City Cruiser" : category === "trail" ? "Trail & Gravel" : "Step-Thru Comfort";
    const image = 
      category === "trail" ? "/bikes/trail-gravel.jpg" : category === "step-thru" ? "/bikes/campus-stepthru.jpg" : "/bikes/city-cruiser.jpg";

    const isMaint = num >= 33;
    const bikeObj: Bike = {
      id: `CC-${pad}`,
      name: `${categoryLabel} #${pad}`,
      series: "Campus Standard Fleet",
      modelCode: `CC-${pad}`,
      category,
      categoryLabel,
      conditionBadge: isMaint ? "Under Maintenance" : num >= 14 && num <= 18 ? "Idle - Air Check" : "100% Road Ready",
      conditionType: isMaint ? "maintenance" : "ready",
      isMaintenance: isMaint,
      dockNumber: `Bay ${num.toString().padStart(2, "0")}`,
      distanceMeters: 10 + (num * 2),
      distanceWalkText: `${10 + (num * 2)}m away`,
      hourlyRate: 25, // ₹25/hr flat rate
      rateSubtext: "₹25/hr Flat Rate",
      specs: {
        motorOrGear: category === "trail" ? "Shimano 21-Speed • Disc Brakes" : "Shimano 7-Speed • Rim Brakes",
        features: ["Quick-Release Saddle", "Loud Ding Bell", "Front Wire Basket", "Safety Reflectors"],
        topSpeed: "Pedal Powered",
        tirePressurePsi: isMaint ? 32 : 50,
        sensorStatus: isMaint ? "Maintenance Required" : "Safety Clearance Active",
      },
      image,
      tags: ["Shimano Gears", "Safety Reflectors"],
    };
    return bikeObj;
  }).filter((b): b is Bike => b !== null) as Bike[])
];
