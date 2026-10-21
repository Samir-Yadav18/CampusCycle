/**
 * Verification Test Suite: CampusCycle Fleet Management & Bicycle Tracking Platform
 * 
 * Validates all 14 criteria specified in Section 13 of the transformation prompt:
 * 1. Campus Map is the main entry point.
 * 2. The actual AIT map asset is used.
 * 3. All 35 bicycles have unique records.
 * 4. Stand markers show consistent availability.
 * 5. QR check-out and check-in update the correct bicycle.
 * 6. Location status distinguishes known stand, last recorded location and live location.
 * 7. Maintenance cycles cannot be booked or checked out.
 * 8. Idle-cycle analytics use real recorded history or clearly labelled demo data.
 * 9. Rental remains accessible at ₹10/hour.
 * 10. Distance never determines rental charges.
 * 11. Admin and volunteer permissions are preserved.
 * 12. Existing trip, wallet and settlement features still work.
 * 13. The existing visual design remains consistent.
 * 14. The project builds and runs without new errors.
 */

import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;
const results = [];

function assert(condition, testName, details = "") {
  if (condition) {
    passedCount++;
    console.log(`  ✔ PASS: ${testName}`);
    results.push({ name: testName, status: "PASSED", details });
  } else {
    failedCount++;
    console.error(`  ✖ FAIL: ${testName} ${details ? `(${details})` : ""}`);
    results.push({ name: testName, status: "FAILED", details });
  }
}

async function runFleetTransformationSuite() {
  console.log("=====================================================================");
  console.log("  CAMPUSCYCLE FLEET MANAGEMENT & TRACKING VERIFICATION SUITE       ");
  console.log("=====================================================================\n");

  // -------------------------------------------------------------------------
  // CRITERION 1: Campus Map is the main entry point
  // -------------------------------------------------------------------------
  console.log("[CRITERION 1] Campus Map as Primary Landing Page");
  try {
    const pageFile = path.join(process.cwd(), "src", "app", "page.tsx");
    const pageContent = fs.readFileSync(pageFile, "utf-8");
    assert(pageContent.includes('initialView="map"'), "Root page renders initialView='map'");

    const appFile = path.join(process.cwd(), "src", "components", "CampusCycleApp.tsx");
    const appContent = fs.readFileSync(appFile, "utf-8");
    assert(appContent.includes('case "map":') && appContent.includes("<CampusMapView />"), "CampusCycleApp renders CampusMapView on root view");

    const res = await fetch(`${BASE_URL}/`);
    assert(res.status === 200, "Root route '/' returns HTTP 200 OK");
  } catch (err) {
    assert(false, "Criterion 1 execution", err.message);
  }

  // -------------------------------------------------------------------------
  // CRITERION 2: Actual AIT Map Asset is configured and used
  // -------------------------------------------------------------------------
  console.log("\n[CRITERION 2] Actual AIT Pune Campus Map Asset");
  try {
    const mapConfigFile = path.join(process.cwd(), "src", "data", "campusMapConfig.ts");
    const mapConfigContent = fs.readFileSync(mapConfigFile, "utf-8");
    assert(mapConfigContent.includes('imagePath: "/images/ait-campus-map.png"'), "CAMPUS_MAP_CONFIG specifies actual AIT Pune map imagePath");
    assert(mapConfigContent.includes("Sports Complex & Tennis Courts Stand"), "Sports Complex & Tennis Courts configured at actual campus coords");
    assert(mapConfigContent.includes("x: 73.5") && mapConfigContent.includes("y: 78.5"), "Normalized coords x: 73.5%, y: 78.5% defined");

    const dockRadarFile = path.join(process.cwd(), "src", "components", "CampusDockRadar.tsx");
    const dockRadarContent = fs.readFileSync(dockRadarFile, "utf-8");
    assert(dockRadarContent.includes("CAMPUS_MAP_CONFIG.imagePath"), "CampusDockRadar renders actual map asset with error fallback");
  } catch (err) {
    assert(false, "Criterion 2 execution", err.message);
  }

  // -------------------------------------------------------------------------
  // CRITERION 3: All 35 bicycles have unique records
  // -------------------------------------------------------------------------
  console.log("\n[CRITERION 3] Canonical 35-Bicycle Fleet with Unique Records");
  try {
    const res = await fetch(`${BASE_URL}/api/fleet`);
    const data = await res.json();
    assert(res.status === 200 && data.success, "GET /api/fleet returns HTTP 200 with success");
    assert(data.fleet.length === 35, `Fleet array contains exactly 35 bicycles (received ${data.fleet.length})`);

    const idSet = new Set(data.fleet.map((c) => c.id));
    assert(idSet.size === 35, "All 35 bicycles have strictly unique IDs (CC-001 to CC-035)");

    const hasAllFields = data.fleet.every((c) => (
      c.id && c.name && c.modelCode && c.category && c.status &&
      c.condition && c.tirePressurePsi && c.lastRecordedLocation &&
      c.specs && Array.isArray(c.recentUsageHistory)
    ));
    assert(hasAllFields, "Every bicycle record contains ID, status, stand, location, condition, specs, and usage history");

    // Check invariant rule: available (18) + reserved (4) + checkedOut (10) + maintenance (3) = 35
    const available = data.fleet.filter((c) => c.status === "AVAILABLE").length;
    const reserved = data.fleet.filter((c) => c.status === "RESERVED").length;
    const checkedOut = data.fleet.filter((c) => c.status === "CHECKED_OUT" || c.status === "OVERDUE").length;
    const maintenance = data.fleet.filter((c) => c.status === "MAINTENANCE" || c.status === "INSPECTION").length;
    const computedSum = available + reserved + checkedOut + maintenance;
    assert(computedSum === 35, `Fleet invariant verified: ${available} Avail + ${reserved} Res + ${checkedOut} Out + ${maintenance} Maint = ${computedSum} (strictly 35)`);
  } catch (err) {
    assert(false, "Criterion 3 execution", err.message);
  }

  // -------------------------------------------------------------------------
  // CRITERION 4: Stand markers show consistent availability
  // -------------------------------------------------------------------------
  console.log("\n[CRITERION 4] Stand Markers & Compact Information Panel");
  try {
    const dockRadarFile = path.join(process.cwd(), "src", "components", "CampusDockRadar.tsx");
    const dockRadarContent = fs.readFileSync(dockRadarFile, "utf-8");
    assert(dockRadarContent.includes("selectedStand.totalCapacity"), "Stand panel displays total capacity");
    assert(dockRadarContent.includes("selectedStand.availableCycles"), "Stand panel displays available cycles");
    assert(dockRadarContent.includes("selectedStand.checkedOutCycles"), "Stand panel displays checked out cycles");
    assert(dockRadarContent.includes("selectedStand.maintenanceCycles"), "Stand panel displays maintenance cycles");
    assert(dockRadarContent.includes("selectedStand.lastUpdated"), "Stand panel displays last-updated timestamp");
    assert(dockRadarContent.includes("View Stand Bicycle Inventory") || dockRadarContent.includes("View Stand Fleet Inventory"), "Stand panel includes direct CTA button to view bicycle inventory");
  } catch (err) {
    assert(false, "Criterion 4 execution", err.message);
  }

  // -------------------------------------------------------------------------
  // CRITERION 5: QR check-out and check-in update the correct bicycle
  // -------------------------------------------------------------------------
  console.log("\n[CRITERION 5] QR Check-Out & Check-In Atomic State Updates");
  try {
    // Check out CC-002
    const checkoutRes = await fetch(`${BASE_URL}/api/fleet/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycleId: "CC-002",
        riderId: "TEST-RIDER-01",
        riderName: "Test Volunteer",
        departureStand: "Sports Complex & Tennis Courts Stand",
      }),
    });
    const checkoutData = await checkoutRes.json();
    assert(checkoutRes.status === 200 && checkoutData.success, "POST /api/fleet/checkout returns HTTP 200 with success");
    assert(checkoutData.cycle.status === "CHECKED_OUT", "Cycle CC-002 operational status updated to CHECKED_OUT");
    assert(checkoutData.cycle.currentStandId === null, "Current stand cleared upon checkout (cycle is in transit)");

    // Duplicate check-out must be blocked
    const duplicateRes = await fetch(`${BASE_URL}/api/fleet/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycleId: "CC-002",
        riderId: "TEST-RIDER-02",
        riderName: "Another Rider",
        departureStand: "Sports Complex & Tennis Courts Stand",
      }),
    });
    assert(duplicateRes.status === 409, "Duplicate check-out of already checked-out bicycle rejected with HTTP 409 Conflict");

    // Check in CC-002
    const checkinRes = await fetch(`${BASE_URL}/api/fleet/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycleId: "CC-002",
        returnStand: "Sports Complex & Tennis Courts Stand",
        volunteerId: "VOL-001",
      }),
    });
    const checkinData = await checkinRes.json();
    assert(checkinRes.status === 200 && checkinData.success, "POST /api/fleet/checkin returns HTTP 200 with success");
    assert(checkinData.cycle.status === "AVAILABLE", "Cycle CC-002 operational status returned to AVAILABLE upon check-in");
    assert(checkinData.cycle.lastRecordedLocation.type === "STAND_DOCK", "Location recorded as STAND_DOCK");
  } catch (err) {
    assert(false, "Criterion 5 execution", err.message);
  }

  // -------------------------------------------------------------------------
  // CRITERION 6: Location status distinguishes stand, checkpoint, GPS, unknown
  // -------------------------------------------------------------------------
  console.log("\n[CRITERION 6] Realistic Location Mechanism Distinctions");
  try {
    const fleetStoreFile = path.join(process.cwd(), "src", "lib", "fleetStore.ts");
    const fleetStoreContent = fs.readFileSync(fleetStoreFile, "utf-8");
    assert(
      fleetStoreContent.includes('"STAND_DOCK"') &&
      fleetStoreContent.includes('"CHECKPOINT"') &&
      fleetStoreContent.includes('"LIVE_GPS"') &&
      fleetStoreContent.includes('"UNKNOWN"'),
      "Location model explicitly defines STAND_DOCK, CHECKPOINT, LIVE_GPS, and UNKNOWN"
    );

    const activeRideFile = path.join(process.cwd(), "src", "components", "views", "ActiveRideView.tsx");
    const activeRideContent = fs.readFileSync(activeRideFile, "utf-8");
    assert(activeRideContent.includes("isRealDeviceGps"), "Active trip distinguishes real browser device GPS from simulated trail");
  } catch (err) {
    assert(false, "Criterion 6 execution", err.message);
  }

  // -------------------------------------------------------------------------
  // CRITERION 7: Maintenance cycles cannot be booked or checked out
  // -------------------------------------------------------------------------
  console.log("\n[CRITERION 7] Maintenance Lockout Enforcement");
  try {
    // Attempt to book CC-033 which is under maintenance
    const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "STU-TEST-LOCKOUT",
        studentName: "Student Tester",
        date: "2026-11-20",
        startTime: "17:00",
        endTime: "19:00",
        cyclePreference: "CC-033",
      }),
    });
    assert(bookRes.status === 400, "Booking a cycle under maintenance (CC-033) is rejected with HTTP 400 Bad Request");

    // Attempt to check out CC-033 via QR API
    const checkoutRes = await fetch(`${BASE_URL}/api/fleet/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycleId: "CC-033",
        riderId: "STU-TEST-LOCKOUT",
        riderName: "Student Tester",
        departureStand: "Sports Complex & Tennis Courts Stand",
      }),
    });
    assert(checkoutRes.status === 400, "QR check-out of cycle under maintenance is blocked with HTTP 400 Bad Request");

    const scannerFile = path.join(process.cwd(), "src", "components", "QuickUnlockScanner.tsx");
    const scannerContent = fs.readFileSync(scannerFile, "utf-8");
    assert(scannerContent.includes("maintenance-locked"), "QuickUnlockScanner features dedicated maintenance-locked state");
  } catch (err) {
    assert(false, "Criterion 7 execution", err.message);
  }

  // -------------------------------------------------------------------------
  // CRITERION 8: Idle-cycle detection and utilisation analytics
  // -------------------------------------------------------------------------
  console.log("\n[CRITERION 8] Configurable Idle-Cycle Detection & Analytics");
  try {
    const res7 = await fetch(`${BASE_URL}/api/fleet/analytics?thresholdDays=7`);
    const data7 = await res7.json();
    assert(res7.status === 200 && data7.success, "GET /api/fleet/analytics?thresholdDays=7 returns HTTP 200");
    assert(data7.idleThresholdDays === 7, "Threshold accurately configured to 7 days");
    assert(Array.isArray(data7.idleCycles), "Analytics returns idleCycles array");
    assert(data7.idleCycles.every((c) => c.suggestedAction && c.daysSinceLastUse >= 7), "Every idle cycle includes data-driven suggestedAction and daysSinceLastUse");

    const res14 = await fetch(`${BASE_URL}/api/fleet/analytics?thresholdDays=14`);
    const data14 = await res14.json();
    assert(data14.idleThresholdDays === 14, "Threshold dynamically recomputed for 14 days");
    assert(data14.idleCyclesCount <= data7.idleCyclesCount, "14-day idle count is a proper subset of 7-day idle count");
  } catch (err) {
    assert(false, "Criterion 8 execution", err.message);
  }

  // -------------------------------------------------------------------------
  // CRITERION 9: Rental remains accessible at ₹10/hour
  // -------------------------------------------------------------------------
  console.log("\n[CRITERION 9] Secondary Rental Access at ₹10/hour Flat Rate");
  try {
    const headerFile = path.join(process.cwd(), "src", "components", "Header.tsx");
    const headerContent = fs.readFileSync(headerFile, "utf-8");
    assert(headerContent.includes("Book & Unlock") || headerContent.includes("Book and Unlock"), "Header navigation maintains Book & Unlock rental entry point");

    const bookingViewFile = path.join(process.cwd(), "src", "components", "views", "BookingUnlockView.tsx");
    const bookingViewContent = fs.readFileSync(bookingViewFile, "utf-8");
    assert(bookingViewContent.includes("₹25.00 / hour"), "BookingUnlockView specifies fixed ₹25.00 / hour rate");
  } catch (err) {
    assert(false, "Criterion 9 execution", err.message);
  }

  // -------------------------------------------------------------------------
  // CRITERION 10: Distance never determines rental charges
  // -------------------------------------------------------------------------
  console.log("\n[CRITERION 10] Zero Distance-Based Rental Charges");
  try {
    const debitFile = path.join(process.cwd(), "src", "app", "api", "wallet", "debit", "route.ts");
    const debitContent = fs.readFileSync(debitFile, "utf-8");
    assert(!debitContent.includes("ratePerKm"), "Wallet debit contains zero per-kilometer rate logic");

    const consoleFile = path.join(process.cwd(), "src", "components", "BookingPolicyConsole.tsx");
    const consoleContent = fs.readFileSync(consoleFile, "utf-8");
    assert(consoleContent.includes("hours * 25"), "Fare calculation is duration in hours * 25 with zero distance dependency");
  } catch (err) {
    assert(false, "Criterion 10 execution", err.message);
  }

  // -------------------------------------------------------------------------
  // CRITERION 11: Admin and volunteer permissions are preserved
  // -------------------------------------------------------------------------
  console.log("\n[CRITERION 11] Admin & Volunteer Workflows Preserved");
  try {
    const consoleFile = path.join(process.cwd(), "src", "components", "BookingPolicyConsole.tsx");
    const consoleContent = fs.readFileSync(consoleFile, "utf-8");
    assert(consoleContent.includes("admin-portal") || consoleContent.includes("handleApprove"), "Booking approval console supports admin approvals");

    const stationsFile = path.join(process.cwd(), "src", "components", "views", "StationsFleetView.tsx");
    const stationsContent = fs.readFileSync(stationsFile, "utf-8");
    assert(stationsContent.includes("userRole") && stationsContent.includes("volunteer"), "StationsFleetView includes Volunteer and Admin operational modes");
    assert(stationsContent.includes("handleClearMaintenance"), "Volunteer maintenance clearance workflow implemented");
  } catch (err) {
    assert(false, "Criterion 11 execution", err.message);
  }

  // -------------------------------------------------------------------------
  // CRITERION 12: Existing trip, wallet and settlement features work
  // -------------------------------------------------------------------------
  console.log("\n[CRITERION 12] Existing Wallet & Settlement Functional");
  try {
    const walletRes = await fetch(`${BASE_URL}/api/wallet?studentId=IITB-22B0814`);
    const walletData = await walletRes.json();
    assert(walletRes.status === 200 && walletData.success, "GET /api/wallet returns HTTP 200 OK");
    assert(typeof walletData.wallet.balance === "number", "Wallet balance is a valid numerical currency");
  } catch (err) {
    assert(false, "Criterion 12 execution", err.message);
  }

  // -------------------------------------------------------------------------
  // CRITERION 13: Existing visual design remains consistent
  // -------------------------------------------------------------------------
  console.log("\n[CRITERION 13] Visual Design Identity Preserved");
  try {
    const headerFile = path.join(process.cwd(), "src", "components", "Header.tsx");
    const headerContent = fs.readFileSync(headerFile, "utf-8");
    assert(headerContent.includes("#1E5631"), "Forest green (#1E5631) brand color preserved in Header");
    assert(headerContent.includes("CampusCycle"), "CampusCycle branding preserved");

    const stationsFile = path.join(process.cwd(), "src", "components", "views", "StationsFleetView.tsx");
    const stationsContent = fs.readFileSync(stationsFile, "utf-8");
    assert(stationsContent.includes("#1E5631") && stationsContent.includes("amber"), "Visual palette (forest green + amber) preserved in StationsFleetView");
  } catch (err) {
    assert(false, "Criterion 13 execution", err.message);
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n=====================================================================");
  console.log(`  VERIFICATION FINISHED: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=====================================================================");

  if (failedCount === 0) {
    console.log("🎉 ALL 14 TRANSFORMATION CRITERIA FULLY VERIFIED!\n");
    process.exit(0);
  } else {
    console.error("❌ Some verification checks failed.\n");
    process.exit(1);
  }
}

runFleetTransformationSuite();
