/**
 * Comprehensive Verification Test Suite for CampusCycle
 * Requirements 1-11: Three Users, Idempotent Seeding, Shared Booking Availability,
 * Concurrency Protection, Slot Release on Cancel, Non-overlapping Bookings, and Regressions.
 */

import http from "http";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";

// Isolated test date to avoid conflicts with other features
const testDate = "2026-10-28";

let passedTests = 0;
let totalTests = 0;

function cleanupTestDateBookings() {
  const DATA_DIR = path.join(process.cwd(), ".data");
  const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");
  if (fs.existsSync(BOOKINGS_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(BOOKINGS_FILE, "utf-8"));
      const filtered = existing.filter((b) => b.date !== testDate);
      fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
    } catch {}
  }
}

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const method = options.method || "GET";
  const headers = options.headers || {};
  let body = options.body;

  if (body && typeof body === "object" && !(body instanceof String)) {
    body = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function runTests() {
  console.log("======================================================================");
  console.log("🚀 STARTING CAMPUSCYCLE SHARED BOOKING & USER VERIFICATION SUITE");
  console.log(`Target Date: ${testDate} | Base URL: ${BASE_URL}`);
  cleanupTestDateBookings();

  // TEST 1: User Authentication for all three accounts
  console.log("▶ TEST 1: Authenticate all 3 required users with User ID and Password");
  {
    const users = [
      { name: "Samir Yadav", userId: "260691", password: "260691" },
      { name: "Kirtika Chaudhary", userId: "260816", password: "260816" },
      { name: "Sumit Kumar", userId: "264071", password: "264071" },
    ];

    for (const u of users) {
      const res = await request("/api/auth/login", {
        method: "POST",
        body: { userId: u.userId, password: u.password },
      });
      assert(res.status === 200 && res.data.success, `${u.name} logged in with ID '${u.userId}'`);
      assert(res.data.user.userId === u.userId, `Returned user profile matches ID '${u.userId}'`);
      assert(res.data.user.name === u.name, `Returned user profile has correct name '${u.name}'`);
      assert(!res.data.user.passwordHash, `Password hash is NEVER exposed in the API response`);
    }

    // Invalid password test
    const badAuth = await request("/api/auth/login", {
      method: "POST",
      body: { userId: "260691", password: "wrong_password" },
    });
    assert(badAuth.status === 401 && !badAuth.data.success, "Invalid password rejected with HTTP 401");
  }

  // TEST 2: Seed script idempotency
  console.log("\n▶ TEST 2: Verify database seed script idempotency");
  {
    const { execSync } = await import("child_process");
    const output = execSync("node scripts/seed_users.mjs", { encoding: "utf-8" });
    assert(output.includes("Verified: 3") || output.includes("Created: 0"), "Rerunning seed script safely verifies existing users without creating duplicates");

    const usersListRes = await request("/api/auth/users");
    assert(usersListRes.status === 200 && usersListRes.data.users.length === 3, "Total user accounts in database remains exactly 3");
  }

  // TEST 3: Samir books Cycle A (CC-001) for 17:00-18:00
  console.log("\n▶ TEST 3: Samir Yadav books Cycle A (CC-001) for 17:00–18:00");
  let samirBookingId = "";
  {
    const bookRes = await request("/api/bookings", {
      method: "POST",
      body: {
        studentId: "260691",
        studentName: "Samir Yadav",
        date: testDate,
        startTime: "17:00",
        endTime: "18:00",
        cyclePreference: "CC-001",
      },
    });

    assert(bookRes.status === 201 && bookRes.data.success, "Samir successfully created booking for CC-001 (17:00-18:00)");
    samirBookingId = bookRes.data.booking.id;
    assert(Boolean(samirBookingId), `Booking ID assigned: ${samirBookingId}`);
  }

  // TEST 4: Kirtika opens CampusCycle and sees Cycle A is booked
  console.log("\n▶ TEST 4: Kirtika views fleet capacity and sees Cycle A (CC-001) booked");
  {
    const capRes = await request(`/api/fleet/capacity?date=${testDate}&startTime=17:00&endTime=18:00&cycleId=CC-001`);
    assert(capRes.status === 200 && capRes.data.success, "Capacity API returned successfully");
    assert(capRes.data.capacity.specificBikeBooked === true, "specificBikeBooked is true for CC-001 in that slot");
    const bikeSlot = capRes.data.capacity.cycleAvailability?.["CC-001"];
    assert(bikeSlot?.status === "BOOKED", "cycleAvailability['CC-001'].status is 'BOOKED'");
    assert(bikeSlot?.bookedSlot?.startTime === "17:00", "bookedSlot has startTime 17:00");
    assert(bikeSlot?.bookedSlot?.endTime === "18:00", "bookedSlot has endTime 18:00");
  }

  // TEST 5: Kirtika cannot book Cycle A for the same or overlapping time
  console.log("\n▶ TEST 5: Kirtika is blocked from overlapping bookings on Cycle A (CC-001)");
  {
    // Exact overlap: 17:00 - 18:00
    const conflict1 = await request("/api/bookings", {
      method: "POST",
      body: {
        studentId: "260816",
        studentName: "Kirtika Chaudhary",
        date: testDate,
        startTime: "17:00",
        endTime: "18:00",
        cyclePreference: "CC-001",
      },
    });
    assert(conflict1.status === 409, "Exact overlap booking rejected with HTTP 409 Conflict");
    assert(
      conflict1.data.error === "This bicycle is already booked for the selected time. Please choose another bicycle or time.",
      `Exact required error message returned: "${conflict1.data.error}"`
    );

    // Partial overlap: 17:30 - 18:30
    const conflict2 = await request("/api/bookings", {
      method: "POST",
      body: {
        studentId: "260816",
        studentName: "Kirtika Chaudhary",
        date: testDate,
        startTime: "17:30",
        endTime: "18:30",
        cyclePreference: "CC-001",
      },
    });
    assert(conflict2.status === 409, "Partial overlap booking (17:30-18:30) rejected with HTTP 409 Conflict");
  }

  // TEST 6: Sumit sees the same booking status across users/sessions
  console.log("\n▶ TEST 6: Sumit opens CampusCycle and sees the same booking status");
  {
    const sumitCheck = await request(`/api/fleet/capacity?date=${testDate}&startTime=17:00&endTime=18:00&cycleId=CC-001`);
    assert(sumitCheck.data.capacity.specificBikeBooked === true, "Sumit sees CC-001 is booked for 17:00-18:00");
    assert(sumitCheck.data.capacity.cycleAvailability?.["CC-001"]?.status === "BOOKED", "CC-001 status is BOOKED for Sumit");
  }

  // TEST 7: Cycle A can still be booked for a non-overlapping time
  console.log("\n▶ TEST 7: Sumit books Cycle A (CC-001) for non-overlapping time (18:00-19:00)");
  let sumitBookingId = "";
  {
    const nonOverlapRes = await request("/api/bookings", {
      method: "POST",
      body: {
        studentId: "264071",
        studentName: "Sumit Kumar",
        date: testDate,
        startTime: "18:00",
        endTime: "19:00",
        cyclePreference: "CC-001",
      },
    });
    assert(nonOverlapRes.status === 201 && nonOverlapRes.data.success, "Sumit successfully booked CC-001 for non-overlapping slot (18:00-19:00)");
    sumitBookingId = nonOverlapRes.data.booking.id;
  }

  // TEST 8: Cancelling a booking releases its slot
  console.log("\n▶ TEST 8: Samir cancels booking; slot 17:00–18:00 is released and Kirtika can book it");
  {
    const cancelRes = await request(`/api/bookings/${samirBookingId}/cancel`, {
      method: "POST",
    });
    assert(cancelRes.status === 200 && cancelRes.data.success, "Samir's booking cancelled successfully");

    // Verify slot is now available
    const postCancelCheck = await request(`/api/fleet/capacity?date=${testDate}&startTime=17:00&endTime=18:00&cycleId=CC-001`);
    assert(postCancelCheck.data.capacity.specificBikeBooked === false, "specificBikeBooked is now false for 17:00-18:00");
    assert(postCancelCheck.data.capacity.cycleAvailability?.["CC-001"]?.status === "AVAILABLE", "CC-001 status is now AVAILABLE");

    // Kirtika now books the newly released slot
    const kirtikaRebook = await request("/api/bookings", {
      method: "POST",
      body: {
        studentId: "260816",
        studentName: "Kirtika Chaudhary",
        date: testDate,
        startTime: "17:00",
        endTime: "18:00",
        cyclePreference: "CC-001",
      },
    });
    assert(kirtikaRebook.status === 201 && kirtikaRebook.data.success, "Kirtika successfully booked the released slot (17:00-18:00)");
  }

  // TEST 9: Race Condition / Simultaneous Booking Attempts
  console.log("\n▶ TEST 9: Simultaneous booking attempts for the same cycle and overlapping time");
  {
    const targetCycle = "CC-002";
    // Fire two simultaneous requests in parallel
    const [reqA, reqB] = await Promise.all([
      request("/api/bookings", {
        method: "POST",
        body: {
          studentId: "260691",
          studentName: "Samir Yadav",
          date: testDate,
          startTime: "17:00",
          endTime: "18:30",
          cyclePreference: targetCycle,
        },
      }),
      request("/api/bookings", {
        method: "POST",
        body: {
          studentId: "264071",
          studentName: "Sumit Kumar",
          date: testDate,
          startTime: "17:00",
          endTime: "18:30",
          cyclePreference: targetCycle,
        },
      }),
    ]);

    const successes = [reqA, reqB].filter((r) => r.status === 201);
    const conflicts = [reqA, reqB].filter((r) => r.status === 409);

    assert(successes.length === 1, "Exactly ONE simultaneous booking request succeeded (HTTP 201)");
    assert(conflicts.length === 1, "Exactly ONE simultaneous booking request was rejected with HTTP 409 Conflict");
    assert(
      conflicts[0].data.error === "This bicycle is already booked for the selected time. Please choose another bicycle or time.",
      "Conflict error message explains cycle is already booked"
    );
  }

  // TEST 10: Non-existent cycle verification
  console.log("\n▶ TEST 10: Backend validates cycle existence");
  {
    const badCycle = await request("/api/bookings", {
      method: "POST",
      body: {
        studentId: "260691",
        studentName: "Samir Yadav",
        date: testDate,
        startTime: "17:00",
        endTime: "18:00",
        cyclePreference: "NON_EXISTENT_BIKE_999",
      },
    });
    assert(badCycle.status === 400 || badCycle.status === 409, "Non-existent cycle booking rejected");
  }

  // TEST 11: Regression checks on fleet and existing endpoints
  console.log("\n▶ TEST 11: Existing features regression verification");
  {
    // Fleet API (35 cycles)
    const fleetRes = await request("/api/fleet");
    assert(fleetRes.status === 200 && fleetRes.data.fleet.length === 35, "Central fleet tracking API returns all 35 campus cycles");

    // All bookings list
    const allBookingsRes = await request("/api/bookings");
    assert(allBookingsRes.status === 200 && Array.isArray(allBookingsRes.data.bookings), "Bookings query API functioning properly");
  }

  console.log("\n======================================================================");
  console.log(`🎉 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("======================================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution aborted:", err);
  process.exit(1);
});
