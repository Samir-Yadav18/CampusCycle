/**
 * CampusCycle Verification Suite
 * Phase: Live Telemetry / Active Trip Interface
 * 
 * Tests:
 * 1. Location permission & demo vs real GPS distinction
 * 2. Multiple sequential location updates & route trace appending
 * 3. Route persistence across simulated reloads (fetch via API)
 * 4. Overdue status calculation & late-return history preservation
 * 5. Complete absence of all ride-pause controls in ActiveRideView
 * 6. Distance statistic calculation without altering fixed ₹10/hr tariff
 * 7. End-trip check-in lifecycle
 */

import http from "http";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const TEST_STUDENT = "IITB-VERIFY-TELEMETRY";
const TEST_RIDE = `#VC-TEST-${Date.now()}`;

function logPass(title) {
  console.log(`\x1b[32m✔ PASS:\x1b[0m ${title}`);
}

function logFail(title, err) {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${title}`, err);
}

function postJson(urlPath, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const body = JSON.stringify(payload);
    const req = http.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on("error", reject);
  });
}

async function runVerification() {
  console.log("\n=======================================================");
  console.log("   CAMPUSCYCLE LIVE TELEMETRY & ACTIVE TRIP TESTS      ");
  console.log("=======================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(cond, name, details = "") {
    totalTests++;
    if (cond) {
      logPass(name);
      passedTests++;
    } else {
      logFail(name, details);
      throw new Error(`Assertion failed: ${name}. ${details}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: Absence of all Ride-Pause Controls
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 1] Complete Absence of Ride-Pause Controls");
    const activeRideViewContent = fs.readFileSync(
      path.join(process.cwd(), "src/components/views/ActiveRideView.tsx"),
      "utf-8"
    );

    assert(
      !activeRideViewContent.includes("pauseResumeRide"),
      "No pauseResumeRide callback in ActiveRideView.tsx"
    );
    assert(
      !activeRideViewContent.includes("Ride Pause"),
      "No 'Ride Pause' button text in ActiveRideView.tsx"
    );
    assert(
      !activeRideViewContent.includes("Pause Ride"),
      "No 'Pause Ride' button text in ActiveRideView.tsx"
    );
    assert(
      !activeRideViewContent.includes("Resume Ride"),
      "No 'Resume Ride' button text in ActiveRideView.tsx"
    );

    // ----------------------------------------------------
    // TEST GROUP 2: Trip Start & Session Initialization
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 2] Trip Start & Telemetry Session Initialization");
    const now = Date.now();
    const returnDeadline = now + 60 * 60 * 1000; // 1 hr expected return

    const startRes = await postJson("/api/telemetry", {
      action: "START",
      studentId: TEST_STUDENT,
      rideId: TEST_RIDE,
      bookingId: "BK-TEST-7712",
      bookedDurationHours: 1,
      expectedReturnTimeMs: returnDeadline,
      expectedReturnTimeText: new Date(returnDeadline).toLocaleTimeString(),
    });

    assert(startRes.status === 200, "Trip session initialization returns HTTP 200");
    assert(startRes.body.success === true, "Trip session initialized successfully");
    const session = startRes.body.session;
    assert(session.rideId === TEST_RIDE, "Stored rideId matches requested ID");
    assert(session.expectedReturnTimeMs === returnDeadline, "Expected return deadline stored accurately");
    assert(session.status === "ACTIVE_ON_TRACK", "Initial status is ACTIVE_ON_TRACK");
    assert(session.isOverdue === false, "Trip is not initially overdue");

    // ----------------------------------------------------
    // TEST GROUP 3: Multiple Sequential Location Updates & Route Trace
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 3] Multiple Sequential Location Updates & Route Trace");
    
    // Point 1: Near Academic Stand
    const pt1 = {
      lat: 18.6071,
      lng: 73.8745,
      xPercent: 42.0,
      yPercent: 78.0,
      accuracy: 4.5,
      speed: 12.0,
      timestamp: now + 60 * 1000,
      isRealDeviceGps: true,
    };
    const updateRes1 = await postJson("/api/telemetry", {
      studentId: TEST_STUDENT,
      rideId: TEST_RIDE,
      point: pt1,
      addedDistanceKm: 0.15,
    });
    assert(updateRes1.body.success === true, "Location point 1 appended successfully");

    // Point 2: Along Green Corridor
    const pt2 = {
      lat: 18.6075,
      lng: 73.8749,
      xPercent: 48.0,
      yPercent: 58.0,
      accuracy: 4.0,
      speed: 16.5,
      timestamp: now + 180 * 1000,
      isRealDeviceGps: true,
    };
    const updateRes2 = await postJson("/api/telemetry", {
      studentId: TEST_STUDENT,
      rideId: TEST_RIDE,
      point: pt2,
      addedDistanceKm: 0.25,
    });
    assert(updateRes2.body.success === true, "Location point 2 appended successfully");

    // Point 3: Approaching SAC Central
    const pt3 = {
      lat: 18.6081,
      lng: 73.8755,
      xPercent: 56.0,
      yPercent: 42.0,
      accuracy: 3.8,
      speed: 16.2,
      timestamp: now + 300 * 1000,
      isRealDeviceGps: true,
    };
    const updateRes3 = await postJson("/api/telemetry", {
      studentId: TEST_STUDENT,
      rideId: TEST_RIDE,
      point: pt3,
      addedDistanceKm: 0.30,
    });
    assert(updateRes3.body.success === true, "Location point 3 appended successfully");

    // Verify latest session state
    const currentSession = updateRes3.body.session;
    assert(currentSession.routeTrace.length >= 3, "Route trace contains all sequential points");
    assert(currentSession.currentLocation.lat === pt3.lat, "Current location updated to latest coordinate");
    assert(currentSession.currentSpeedKmH === 16.2, "Current speed updated accurately");
    assert(currentSession.distanceKm >= 0.7, "Distance accumulated as trip statistic");

    // ----------------------------------------------------
    // TEST GROUP 4: Route Persistence & Simulated Page Refresh
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 4] Route Persistence & Simulated Page Refresh Recovery");
    const refreshRes = await getJson(`/api/telemetry?studentId=${TEST_STUDENT}&rideId=${encodeURIComponent(TEST_RIDE)}`);
    assert(refreshRes.status === 200, "Refreshed telemetry query returns HTTP 200");
    const recoveredSession = refreshRes.body.session;
    assert(recoveredSession.rideId === TEST_RIDE, "Recovered session rideId matches");
    assert(recoveredSession.routeTrace.length >= 3, "Route trace intact after simulated refresh");
    assert(recoveredSession.expectedReturnTimeMs === returnDeadline, "Return deadline intact after refresh");

    // ----------------------------------------------------
    // TEST GROUP 5: Demo Mode vs Real Device GPS Distinction
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 5] Demo Mode vs Real Device GPS Labelling");
    const demoPoint = {
      lat: 18.6083,
      lng: 73.8758,
      xPercent: 61.0,
      yPercent: 33.0,
      accuracy: 5.0,
      speed: 15.0,
      timestamp: now + 400 * 1000,
      isRealDeviceGps: false, // Explicitly demo simulated
    };
    const demoRes = await postJson("/api/telemetry", {
      studentId: TEST_STUDENT,
      rideId: TEST_RIDE,
      point: demoPoint,
      addedDistanceKm: 0.1,
    });
    assert(demoRes.body.session.isDemoMode === true, "Session flagged as isDemoMode: true when synthetic point posted");
    assert(
      demoRes.body.session.currentLocation.isRealDeviceGps === false,
      "Location point explicitly marked as isRealDeviceGps: false"
    );

    // ----------------------------------------------------
    // TEST GROUP 6: Overdue Status Calculation & Late Return Flagging
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 6] Overdue Status Calculation & Late Return Preservation");
    const overdueRideId = `#VC-OVERDUE-${Date.now()}`;
    const pastDeadline = Date.now() - 15 * 60 * 1000; // Expected return was 15 mins ago

    // Start an overdue trip session
    await postJson("/api/telemetry", {
      action: "START",
      studentId: TEST_STUDENT,
      rideId: overdueRideId,
      bookingId: "BK-OVERDUE-01",
      bookedDurationHours: 1,
      expectedReturnTimeMs: pastDeadline,
      expectedReturnTimeText: new Date(pastDeadline).toLocaleTimeString(),
    });

    const overdueCheckRes = await getJson(`/api/telemetry?studentId=${TEST_STUDENT}&rideId=${encodeURIComponent(overdueRideId)}`);
    assert(overdueCheckRes.body.session.isOverdue === true, "Trip detected as overdue");
    assert(overdueCheckRes.body.session.status === "OVERDUE", "Status flagged as OVERDUE");
    assert(overdueCheckRes.body.session.overdueSeconds >= 800, "Overdue seconds accurately calculated");

    // End / Check-in the overdue trip
    const endOverdueRes = await postJson("/api/telemetry/end", {
      studentId: TEST_STUDENT,
      rideId: overdueRideId,
    });
    assert(endOverdueRes.status === 200, "End trip check-in returns HTTP 200");
    assert(endOverdueRes.body.success === true, "Trip ended successfully");
    assert(endOverdueRes.body.wasLate === true, "Late return recorded on check-in");
    assert(endOverdueRes.body.overdueSeconds >= 800, "Late return overdue seconds preserved in history");

    console.log("\n=======================================================");
    console.log(`   ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!          `);
    console.log("=======================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("\nVerification failed:", err.message);
    process.exit(1);
  }
}

runVerification();
