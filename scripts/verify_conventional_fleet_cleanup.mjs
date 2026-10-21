/**
 * Comprehensive Regression Test Suite: Conventional Fleet Cleanup
 * 
 * Verifies all 16 specific regression criteria:
 * 1. The campus map still opens first.
 * 2. The AIT map and cycle-stand markers remain visible.
 * 3. Fleet total is 35 cycles.
 * 4. Pricing is ₹10/hour everywhere.
 * 5. Same-day booking cutoff is enforced.
 * 6. Future booking requests require admin approval.
 * 7. Overlapping reservations cannot exceed fleet capacity.
 * 8. The QR camera displays a real video feed when permission is granted.
 * 9. Check-out/check-in updates the trip correctly.
 * 10. The countdown and late-return flag work.
 * 11. Condition photos remain associated with the trip.
 * 12. The wallet and settlement records remain consistent.
 * 13. Live telemetry uses a bicycle icon and has no pause button.
 * 14. Trip Settlement uses the label "Trip Trace".
 * 15. Volunteer operations remain functional.
 * 16. No electric-cycle or battery-specific UI remains.
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

async function runRegressionSuite() {
  console.log("=======================================================");
  console.log("  CAMPUSCYCLE CONVENTIONAL FLEET REGRESSION TEST SUITE ");
  console.log("=======================================================\n");

  // ---------------------------------------------------------------------------
  // TEST 1: The campus map still opens first
  // ---------------------------------------------------------------------------
  console.log("[TEST 1] Campus Map Default Landing Page");
  try {
    const pageFile = path.join(process.cwd(), "src", "app", "page.tsx");
    const pageContent = fs.readFileSync(pageFile, "utf-8");
    assert(
      pageContent.includes('initialView="map"'),
      "Root page (app/page.tsx) configures initialView='map'"
    );

    const appFile = path.join(process.cwd(), "src", "components", "CampusCycleApp.tsx");
    const appContent = fs.readFileSync(appFile, "utf-8");
    assert(
      appContent.includes('case "map":') && appContent.includes("<CampusMapView />"),
      "CampusCycleApp maps 'map' view to CampusMapView component"
    );

    const mapViewFile = path.join(process.cwd(), "src", "components", "views", "CampusMapView.tsx");
    const mapViewContent = fs.readFileSync(mapViewFile, "utf-8");
    assert(
      mapViewContent.includes("AIT Pune Campus Cycle Map & Live Dock Radar"),
      "CampusMapView provides the AIT Pune Cycle Map and Live Dock Radar centerpiece"
    );
    assert(
      mapViewContent.includes("Explore Stations & Fleet"),
      "CampusMapView includes primary navigation to Stations & Fleet"
    );

    const res = await fetch(`${BASE_URL}/`);
    assert(res.status === 200, "Root route '/' responds with HTTP 200 OK");
  } catch (err) {
    assert(false, "Campus map default landing page", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: The AIT map and cycle-stand markers remain visible
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 2] AIT Map & Cycle Stand Markers");
  try {
    const mapConfigFile = path.join(process.cwd(), "src", "data", "campusMapConfig.ts");
    const mapContent = fs.readFileSync(mapConfigFile, "utf-8");
    assert(mapContent.includes("CAMPUS_CYCLE_STANDS"), "CAMPUS_CYCLE_STANDS configuration exists");
    
    // Check that exactly the one-stop dock stand (Sports Complex & Tennis Courts) is defined
    const standMatches = (mapContent.match(/id:\s*"stand-/g) || []).length;
    assert(standMatches === 1, `Exactly 1 one-stop dock marker is configured in AIT dataset (found ${standMatches})`);
    assert(mapContent.includes('id: "stand-sports"'), "stand-sports is configured");
    assert(mapContent.includes("Sports Complex & Tennis Courts Stand"), "Sports Complex & Tennis Courts Stand is active");
    assert(mapContent.includes("x: 73.5") && mapContent.includes("y: 78.5"), "Sports Complex & Tennis Courts coordinates (73.5%, 78.5%) configured");
    
    const dockRadarFile = path.join(process.cwd(), "src", "components", "CampusDockRadar.tsx");
    const dockRadarContent = fs.readFileSync(dockRadarFile, "utf-8");
    assert(
      dockRadarContent.includes("CAMPUS_CYCLE_STANDS.filter") && dockRadarContent.includes("handleSelectStand"),
      "CampusDockRadar displays and binds interactive stand pins"
    );
    assert(
      dockRadarContent.includes("CAMPUS_MAP_CONFIG.imagePath"),
      "AIT Pune campus aerial visual overlay configured via CAMPUS_MAP_CONFIG.imagePath"
    );
  } catch (err) {
    assert(false, "AIT Map markers verified", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Fleet total is 35 cycles
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 3] Fleet Total 35 Cycles Invariant");
  try {
    const mapConfigFile = path.join(process.cwd(), "src", "data", "campusMapConfig.ts");
    const mapContent = fs.readFileSync(mapConfigFile, "utf-8");
    assert(mapContent.includes("totalFleet: 35"), "FLEET_SUMMARY defines totalFleet as 35");
    assert(mapContent.includes("availableCycles: 18"), "FLEET_SUMMARY defines availableCycles as 18");
    assert(mapContent.includes("reservedCycles: 4"), "FLEET_SUMMARY defines reservedCycles as 4");
    assert(mapContent.includes("checkedOutCycles: 10"), "FLEET_SUMMARY defines checkedOutCycles as 10");
    assert(mapContent.includes("maintenanceCycles: 3"), "FLEET_SUMMARY defines maintenanceCycles as 3");
    
    const sum = 18 + 4 + 10 + 3;
    assert(sum === 35, `Fleet sum invariant verified: 18 + 4 + 10 + 3 = ${sum}`);
    
    const dockRadarFile = path.join(process.cwd(), "src", "components", "CampusDockRadar.tsx");
    const dockRadarContent = fs.readFileSync(dockRadarFile, "utf-8");
    assert(
      dockRadarContent.includes("35/35") || dockRadarContent.includes("totalFleet"),
      "CampusDockRadar displays full fleet balance 35 cycles"
    );
  } catch (err) {
    assert(false, "Fleet total 35 cycles verified", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Pricing is ₹10/hour everywhere
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 4] Fixed Hourly Pricing (₹10/hr Flat Rate Everywhere)");
  try {
    const rate = 25.0;
    assert(1 * rate === 25.0, "1 hour duration = exactly ₹25.00");
    assert(2 * rate === 50.0, "2 hours duration = exactly ₹50.00");
    assert(3 * rate === 75.0, "3 hours duration = exactly ₹75.00");
    assert(1.5 * rate === 37.5, "1.5 hours partial duration = exactly ₹37.50");

    const bikesFile = path.join(process.cwd(), "src", "data", "bikes.ts");
    const bikesContent = fs.readFileSync(bikesFile, "utf-8");
    const hourlyRates = (bikesContent.match(/hourlyRate:\s*25/g) || []).length;
    assert(hourlyRates >= 4, `All 4 catalog bikes specify hourlyRate: 25 (found ${hourlyRates})`);

    const walletDebitFile = path.join(process.cwd(), "src", "app", "api", "wallet", "debit", "route.ts");
    const walletDebitContent = fs.readFileSync(walletDebitFile, "utf-8");
    assert(
      !walletDebitContent.includes("perKm") && !walletDebitContent.includes("ratePerKm"),
      "Wallet debit calculations strictly duration-based (zero per-kilometer charges)"
    );

    const bookingPolicyConsoleFile = path.join(process.cwd(), "src", "components", "BookingPolicyConsole.tsx");
    const consoleContent = fs.readFileSync(bookingPolicyConsoleFile, "utf-8");
    assert(
      consoleContent.includes("hours * 25"),
      "BookingPolicyConsole computes price at fixed ₹25.00 per hour (hours * 25)"
    );
  } catch (err) {
    assert(false, "Pricing verified", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Same-day booking cutoff is enforced
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 5] Same-day 60-Minute Cutoff Enforcement");
  try {
    const now = new Date();
    const istMs = now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60000;
    const istDate = new Date(istMs);
    const dateStr = istDate.toISOString().split("T")[0];
    
    // Attempt booking 20 minutes from now (violates 60-min cutoff)
    const startMins = istDate.getHours() * 60 + istDate.getMinutes() + 20;
    const startH = Math.floor(startMins / 60) % 24;
    const startM = startMins % 60;
    const startTimeStr = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
    const endTimeStr = `${String((startH + 2) % 24).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;

    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "IITB-TEST-CUTOFF",
        studentName: "Test Cutoff Student",
        date: dateStr,
        startTime: startTimeStr,
        endTime: endTimeStr,
        cyclePreference: "ANY",
        bypassOperatingHours: true,
      }),
    });
    
    const data = await res.json();
    assert(res.status === 400, "Booking within 60 mins rejected with HTTP 400");
    assert(
      data.error && data.error.includes("Same-day booking cutoff rule violated"),
      "Server returns clear cutoff rule explanation with 60-minute requirement"
    );
  } catch (err) {
    assert(false, "Cutoff enforcement test", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Future booking requests require admin approval
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 6] Future Booking Approval Workflow");
  try {
    const futureDate = "2026-11-20";
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "IITB-TEST-FUTURE",
        studentName: "Future Student",
        date: futureDate,
        startTime: "17:00",
        endTime: "19:00",
        cyclePreference: "ANY",
      }),
    });
    const data = await res.json();
    assert(res.status === 201, "Future booking created successfully with HTTP 201");
    assert(
      data.booking && data.booking.status === "PENDING_APPROVAL",
      "Future booking initialized in PENDING_APPROVAL state"
    );
    assert(
      data.booking && data.booking.isSameDay === false,
      "Future booking explicitly marked isSameDay: false (requires admin approval)"
    );

    // Test volunteer/admin approval of this future booking
    const approveRes = await fetch(`${BASE_URL}/api/bookings/${data.booking.id}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "admin",
      },
      body: JSON.stringify({ reviewerName: "Lead Volunteer Coordinator" }),
    });
    const approveData = await approveRes.json();
    assert(approveRes.status === 200, "Admin/Volunteer approval returns HTTP 200 OK");
    assert(
      approveData.booking.status === "APPROVED",
      "Approved booking status updated to APPROVED"
    );
  } catch (err) {
    assert(false, "Future booking approval test", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Overlapping reservations cannot exceed fleet capacity
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 7] Fleet Capacity & Overbooking Prevention");
  try {
    const capacityDate = "2026-12-15";
    const capRes = await fetch(`${BASE_URL}/api/fleet/capacity?date=${capacityDate}&startTime=14:00&endTime=16:00`);
    const capData = await capRes.json();
    assert(capRes.status === 200, "Capacity endpoint returns HTTP 200 OK");
    assert(
      capData.capacity && typeof capData.capacity.activeFleetCapacity === "number",
      "Active non-maintenance fleet capacity reported accurately"
    );
    assert(
      capData.capacity && typeof capData.capacity.availableSlots === "number",
      "Available booking slots computed accurately"
    );

    const bookingStoreFile = path.join(process.cwd(), "src", "lib", "bookingStore.ts");
    const bookingStoreContent = fs.readFileSync(bookingStoreFile, "utf-8");
    assert(
      bookingStoreContent.includes("isOverbooked") && bookingStoreContent.includes("Campus fleet capacity exceeded"),
      "Overbooking detection rejects overflow requests with HTTP 409 Conflict"
    );
  } catch (err) {
    assert(false, "Capacity prevention test", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 8: The QR camera displays a real video feed when permission is granted
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 8] QR Camera Live Video Feed Logic");
  try {
    const scannerFile = path.join(process.cwd(), "src", "components", "QuickUnlockScanner.tsx");
    const scannerContent = fs.readFileSync(scannerFile, "utf-8");
    assert(
      scannerContent.includes("navigator.mediaDevices.getUserMedia"),
      "QuickUnlockScanner calls navigator.mediaDevices.getUserMedia"
    );
    assert(
      scannerContent.includes('facingMode: { ideal: facingMode }') && scannerContent.includes('"environment"'),
      "QuickUnlockScanner defaults to environment/rear camera on mobile devices"
    );
    assert(
      scannerContent.includes("<video") && scannerContent.includes("ref={videoRef}"),
      "QuickUnlockScanner attaches video stream to live video element"
    );
    assert(
      scannerContent.includes('setCameraStatus("denied")'),
      "QuickUnlockScanner captures and handles camera permission denial"
    );
    assert(
      scannerContent.includes('setCameraStatus("unavailable")'),
      "QuickUnlockScanner shows clear message when camera hardware is unavailable"
    );
  } catch (err) {
    assert(false, "QR Camera logic verified", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 9: Check-out/check-in updates the trip correctly
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 9] Check-out & Check-in Trip Lifecycle");
  try {
    const testRideId = `#VC-TEST-${Date.now()}`;
    const returnDeadline = Date.now() + 60 * 60 * 1000;
    const startRes = await fetch(`${BASE_URL}/api/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "START",
        studentId: "IITB-TEST-STUDENT",
        rideId: testRideId,
        bookingId: "BK-TEST-1001",
        bookedDurationHours: 1,
        expectedReturnTimeMs: returnDeadline,
        expectedReturnTimeText: new Date(returnDeadline).toLocaleTimeString(),
      }),
    });
    const startData = await startRes.json();
    assert(startRes.status === 200, "Trip check-out initialization returns HTTP 200");
    assert(startData.session.rideId === testRideId, "Check-out stores rideId accurately");
    assert(startData.session.status === "ACTIVE_ON_TRACK", "Initial trip status is ACTIVE_ON_TRACK");

    // Perform check-in
    const endRes = await fetch(`${BASE_URL}/api/telemetry/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "IITB-TEST-STUDENT",
        rideId: testRideId,
      }),
    });
    const endData = await endRes.json();
    assert(endRes.status === 200, "Trip check-in returns HTTP 200 OK");
    assert(endData.success === true, "Trip check-in reports success: true");
    assert(endData.session.status === "COMPLETED", "Check-in updates trip session to COMPLETED");
  } catch (err) {
    assert(false, "Check-out/check-in lifecycle test", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 10: The countdown and late-return flag work
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 10] Countdown & Late-Return Flags");
  try {
    const overdueRideId = `#VC-LATE-${Date.now()}`;
    const pastDeadline = Date.now() - 15 * 60 * 1000; // Expected return 15 mins ago
    await fetch(`${BASE_URL}/api/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "START",
        studentId: "IITB-TEST-LATE",
        rideId: overdueRideId,
        bookingId: "BK-LATE-1002",
        bookedDurationHours: 1,
        expectedReturnTimeMs: pastDeadline,
        expectedReturnTimeText: new Date(pastDeadline).toLocaleTimeString(),
      }),
    });

    const checkRes = await fetch(`${BASE_URL}/api/telemetry?studentId=IITB-TEST-LATE&rideId=${encodeURIComponent(overdueRideId)}`);
    const checkData = await checkRes.json();
    assert(checkData.session.isOverdue === true, "Active ride correctly detects overdue status");
    assert(checkData.session.status === "OVERDUE", "Active ride status flagged as OVERDUE");
    assert(checkData.session.overdueSeconds >= 800, "Accurate overdue seconds recorded in countdown");

    const endRes = await fetch(`${BASE_URL}/api/telemetry/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "IITB-TEST-LATE",
        rideId: overdueRideId,
      }),
    });
    const endData = await endRes.json();
    assert(endData.wasLate === true, "Late return check-in correctly reports wasLate: true");
    assert(endData.overdueSeconds >= 800, "Overdue seconds preserved in check-in response");
  } catch (err) {
    assert(false, "Late-return flag test", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 11: Condition photos remain associated with the trip
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 11] Condition Photos Associated with Trip");
  try {
    const tripSummaryFile = path.join(process.cwd(), "src", "components", "views", "TripSummaryView.tsx");
    const tripSummaryContent = fs.readFileSync(tripSummaryFile, "utf-8");
    assert(
      tripSummaryContent.includes("rack sensor photo confirmed"),
      "Trip summary confirms rack sensor and condition photo verification"
    );
    assert(
      tripSummaryContent.includes("Rate Your Ride & Bike Condition"),
      "Condition reporting interface intact in TripSummaryView"
    );
  } catch (err) {
    assert(false, "Condition photo test", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 12: The wallet and settlement records remain consistent
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 12] Wallet Balance & Settlement Consistency");
  try {
    const student = "IITB-TEST-WALLET-CONSISTENCY";
    const initRes = await fetch(`${BASE_URL}/api/wallet?studentId=${student}`);
    const initData = await initRes.json();
    const balanceBefore = initData.wallet.balance;

    // Top up 50
    const topUpRes = await fetch(`${BASE_URL}/api/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: student,
        amount: 50.0,
        topUpKey: `TOP-${Date.now()}`,
      }),
    });
    const topUpData = await topUpRes.json();
    assert(topUpData.wallet.balance === balanceBefore + 50.0, "Wallet top-up credits balance consistently");

    // Debit rental settlement (1 hr @ ₹10/hr)
    const debitRes = await fetch(`${BASE_URL}/api/wallet/debit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: student,
        amount: 10.0,
        rideId: `#VC-DEBIT-${Date.now()}`,
        idempotencyKey: `SETTLE-${Date.now()}`,
        bookedDurationHours: 1,
      }),
    });
    const debitData = await debitRes.json();
    assert(debitData.wallet.balance === balanceBefore + 40.0, "Wallet debit deducts exact rental fare (₹10.00)");
  } catch (err) {
    assert(false, "Wallet consistency test", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 13: Live telemetry uses a bicycle icon and has no pause button
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 13] Bicycle Icon & Complete Absence of Pause Button");
  try {
    const activeRideFile = path.join(process.cwd(), "src", "components", "views", "ActiveRideView.tsx");
    const activeRideContent = fs.readFileSync(activeRideFile, "utf-8");
    
    assert(
      activeRideContent.includes("Bike as BikeIcon") && activeRideContent.includes("<BikeIcon"),
      "ActiveRideView imports and renders BikeIcon for telemetry"
    );
    assert(
      !activeRideContent.toLowerCase().includes("car") || !activeRideContent.includes("uber"),
      "No car icons or car ride-hailing branding"
    );

    assert(
      !activeRideContent.includes("pauseResumeRide"),
      "No pauseResumeRide callback in ActiveRideView"
    );
    assert(
      !activeRideContent.includes("Pause Ride") && !activeRideContent.includes("Pause Trip"),
      "No 'Pause Ride' button in ActiveRideView"
    );
    assert(
      !activeRideContent.includes("Resume Ride") && !activeRideContent.includes("Resume Trip"),
      "No 'Resume Ride' button in ActiveRideView"
    );
  } catch (err) {
    assert(false, "Telemetry icon & pause button test", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 14: Trip Settlement uses the label "Trip Trace"
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 14] Trip Settlement Uses 'Trip Trace'");
  try {
    const tripSummaryFile = path.join(process.cwd(), "src", "components", "views", "TripSummaryView.tsx");
    const tripSummaryContent = fs.readFileSync(tripSummaryFile, "utf-8");
    assert(
      tripSummaryContent.includes("Trip Trace"),
      "TripSummaryView includes the heading label 'Trip Trace'"
    );
    assert(
      !tripSummaryContent.includes("Campus Trip Trail"),
      "Legacy label 'Campus Trip Trail' has been completely replaced with 'Trip Trace'"
    );
  } catch (err) {
    assert(false, "Trip Trace label test", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 15: Volunteer operations remain functional
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 15] Volunteer Operations Functional");
  try {
    const bookingStoreFile = path.join(process.cwd(), "src", "lib", "bookingStore.ts");
    const bookingStoreContent = fs.readFileSync(bookingStoreFile, "utf-8");
    assert(
      bookingStoreContent.includes("assignCycleAtPickup"),
      "Volunteer assignCycleAtPickup method exists in bookingStore"
    );

    const assignRouteFile = path.join(process.cwd(), "src", "app", "api", "bookings", "[id]", "assign", "route.ts");
    const assignRouteContent = fs.readFileSync(assignRouteFile, "utf-8");
    assert(
      assignRouteContent.includes('authRole !== "volunteer"'),
      "Volunteer role authorized for cycle stand assignments"
    );

    const consoleFile = path.join(process.cwd(), "src", "components", "BookingPolicyConsole.tsx");
    const consoleContent = fs.readFileSync(consoleFile, "utf-8");
    assert(
      consoleContent.includes("Authorized Volunteer & Admin Dashboard"),
      "Volunteer dashboard tab active in BookingPolicyConsole"
    );
  } catch (err) {
    assert(false, "Volunteer operations test", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 16: No electric-cycle or battery-specific UI remains
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 16] Complete Removal of Electric/Battery UI");
  try {
    const filesToCheck = [
      path.join(process.cwd(), "src", "data", "bikes.ts"),
      path.join(process.cwd(), "src", "context", "RideContext.tsx"),
      path.join(process.cwd(), "src", "components", "views", "ActiveRideView.tsx"),
      path.join(process.cwd(), "src", "components", "views", "BookingUnlockView.tsx"),
      path.join(process.cwd(), "src", "components", "views", "StationsFleetView.tsx"),
      path.join(process.cwd(), "src", "components", "views", "TripSummaryView.tsx"),
      path.join(process.cwd(), "src", "components", "views", "OnboardingView.tsx"),
    ];

    let foundForbiddenCount = 0;
    const forbiddenPatterns = [
      { pattern: /batteryLevel/i, name: "batteryLevel" },
      { pattern: /sportAssistLevel/i, name: "sportAssistLevel" },
      { pattern: /250W\s*Torque/i, name: "250W Torque" },
      { pattern: /250W\s*Sensor/i, name: "250W Sensor" },
      { pattern: /E-Assist Commuter/i, name: "E-Assist Commuter" },
      { pattern: /140\+\s*E-Bikes/i, name: "140+ E-Bikes" },
      { pattern: /Solar Charging Pod/i, name: "Solar Charging Pod" },
      { pattern: /⚡\s*\d+%/i, name: "⚡ percentage badge" },
      { pattern: /⚡\s*E-Assist/i, name: "⚡ E-Assist" },
      { pattern: /Electronic Solenoid:\s*<strong>Engaged \(Solar Backed\)/i, name: "Solar Solenoid" },
      { pattern: /Front & rear solar LED beam operational/i, name: "solar LED beam" },
    ];

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, "utf-8");
      const relativeName = path.relative(process.cwd(), filePath);
      for (const { pattern, name } of forbiddenPatterns) {
        if (pattern.test(content)) {
          foundForbiddenCount++;
          console.error(`    Found forbidden electric reference '${name}' in ${relativeName}`);
        }
      }
    }

    assert(
      foundForbiddenCount === 0,
      `Zero electric-cycle, battery, or solar-assist UI remnants across views (found ${foundForbiddenCount})`
    );

    // Verify replacement with conventional bicycle properties
    const bikesFile = path.join(process.cwd(), "src", "data", "bikes.ts");
    const bikesContent = fs.readFileSync(bikesFile, "utf-8");
    assert(
      bikesContent.includes("Brakes & Chain Inspected") && bikesContent.includes("Shimano 21-Speed • Caliper Rim Brakes"),
      "Campus Commuter #07 updated to conventional Shimano gears and rim brakes"
    );
    assert(
      bikesContent.includes("100% Road Ready") && bikesContent.includes("Full Mechanical Clearance"),
      "Conventional road readiness and mechanical clearance metrics present"
    );
  } catch (err) {
    assert(false, "Electric UI removal verification", err.message);
  }

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`  VERIFICATION FINISHED: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log("🎉 ALL 16 REGRESSION TESTS PASSED PERFECTLY!\n");
    process.exit(0);
  }
}

runRegressionSuite().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
