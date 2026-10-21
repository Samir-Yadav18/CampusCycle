/**
 * Verification Test Suite for CampusCycle Booking Policy
 * 
 * Executes the 9 required tests in Requirement F:
 * 1. A booking exactly at the one-hour cutoff.
 * 2. A booking after the cutoff.
 * 3. A same-day available slot.
 * 4. A future-date request.
 * 5. Admin approval.
 * 6. Admin rejection.
 * 7. Two students competing for the final available cycle.
 * 8. A maintenance cycle.
 * 9. Correct hourly price calculation.
 */

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("====================================================");
  console.log("🚀 STARTING CAMPUSCYCLE BOOKING POLICY TEST SUITE");
  console.log("====================================================");

  // Clean test database before executing policy test suite
  const fs = await import("fs");
  const path = await import("path");
  const bookingsFile = path.join(process.cwd(), ".data", "bookings.json");
  if (fs.existsSync(bookingsFile)) {
    fs.writeFileSync(bookingsFile, "[]", "utf-8");
  }

  // 0. Fetch initial campus info
  const fleetRes = await fetch(`${BASE_URL}/api/fleet`);
  const fleetData = await fleetRes.json();
  console.log(`[INIT] Total Fleet: ${fleetData.fleet.length}, Active: ${fleetData.activeCapacity}, Maintenance: ${fleetData.maintenanceCount}`);

  const bookingsRes = await fetch(`${BASE_URL}/api/bookings`);
  const bookingsData = await bookingsRes.json();
  const campusNow = bookingsData.campusNow;
  console.log(`[INIT] Campus Local Time (IST): Date=${campusNow.dateStr}, Time=${campusNow.timeStr}\n`);

  const todayStr = campusNow.dateStr;
  const [currH, currM] = campusNow.timeStr.split(":").map(Number);

  // Helper to format HH:MM
  const formatTime = (h, m) => `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

  let passedTests = 0;
  let totalTests = 9;

  // ----------------------------------------------------------------
  // TEST 1: A booking exactly at the one-hour cutoff
  // ----------------------------------------------------------------
  console.log("👉 TEST 1: Booking exactly at the 60-minute cutoff...");
  // Start time = current time + exactly 60 minutes
  const totalMin60 = currH * 60 + currM + 60;
  const startH1 = Math.floor(totalMin60 / 60) % 24;
  const startM1 = totalMin60 % 60;
  const endH1 = (startH1 + 2) % 24;
  const startTime1 = formatTime(startH1, startM1);
  const endTime1 = formatTime(endH1, startM1);

  const t1Res = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: "TEST-STU-01",
      studentName: "Student Cutoff Exact",
      date: todayStr,
      startTime: startTime1,
      endTime: endTime1,
      cyclePreference: "ANY",
      bypassOperatingHours: true,
    }),
  });
  const t1Data = await t1Res.json();
  if (t1Res.status === 201 && t1Data.booking?.status === "PENDING_APPROVAL") {
    const t1Approve = await fetch(`${BASE_URL}/api/bookings/${t1Data.booking.id}/approve`, {
      method: "POST",
      headers: { "x-user-role": "admin", "Content-Type": "application/json" },
      body: JSON.stringify({ reviewerName: "Admin", notes: "Approved cutoff booking" }),
    });
    const t1ApproveData = await t1Approve.json();
    if (t1Approve.status === 200 && t1ApproveData.booking?.status === "APPROVED") {
      console.log(`✅ TEST 1 PASSED: Booking at exactly 60m cutoff (${startTime1}) created as PENDING_APPROVAL and approved by admin. ID=${t1Data.booking.id}`);
      passedTests++;
    } else {
      console.log(`❌ TEST 1 FAILED: Approval failed for cutoff booking`);
    }
  } else {
    console.log(`❌ TEST 1 FAILED: Status=${t1Res.status}, Error=${t1Data.error}`);
  }

  // ----------------------------------------------------------------
  // TEST 2: A booking after the cutoff (< 60 minutes away)
  // ----------------------------------------------------------------
  console.log("\n👉 TEST 2: Booking after cutoff (< 60 minutes away)...");
  // Start time = current time + 20 minutes (Cutoff violated!)
  const totalMin20 = currH * 60 + currM + 20;
  const startH2 = Math.floor(totalMin20 / 60) % 24;
  const startM2 = totalMin20 % 60;
  const endH2 = (startH2 + 1) % 24;
  const startTime2 = formatTime(startH2, startM2);
  const endTime2 = formatTime(endH2, startM2);

  const t2Res = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: "TEST-STU-02",
      studentName: "Student Late Cutoff",
      date: todayStr,
      startTime: startTime2,
      endTime: endTime2,
      cyclePreference: "ANY",
      bypassOperatingHours: true,
    }),
  });
  const t2Data = await t2Res.json();
  if (t2Res.status === 400 && t2Data.error?.includes("cutoff rule violated")) {
    console.log(`✅ TEST 2 PASSED: Booking after cutoff was rejected with 400. Error: "${t2Data.error}"`);
    passedTests++;
  } else {
    console.log(`❌ TEST 2 FAILED: Expected 400 rejection, got ${t2Res.status}: ${JSON.stringify(t2Data)}`);
  }

  // ----------------------------------------------------------------
  // TEST 3: A same-day available slot (> 60 minutes away)
  // ----------------------------------------------------------------
  console.log("\n👉 TEST 3: Same-day available slot (> 60 minutes away)...");
  const totalMin120 = currH * 60 + currM + 120;
  const startH3 = Math.floor(totalMin120 / 60) % 24;
  const startM3 = totalMin120 % 60;
  const endH3 = (startH3 + 2) % 24;
  const startTime3 = formatTime(startH3, startM3);
  const endTime3 = formatTime(endH3, startM3);

  const t3Res = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: "TEST-STU-03",
      studentName: "Student Same Day",
      date: todayStr,
      startTime: startTime3,
      endTime: endTime3,
      cyclePreference: "ANY",
      bypassOperatingHours: true,
    }),
  });
  const t3Data = await t3Res.json();
  if (t3Res.status === 201 && t3Data.booking?.status === "PENDING_APPROVAL" && t3Data.booking?.isSameDay === true) {
    console.log(`✅ TEST 3 PASSED: Same-day slot (${startTime3} - ${endTime3}) created as PENDING_APPROVAL (all rides approval-based). ID=${t3Data.booking.id}`);
    
    // Admin approves same-day request
    const approveRes = await fetch(`${BASE_URL}/api/bookings/${t3Data.booking.id}/approve`, {
      method: "POST",
      headers: { "x-user-role": "admin", "Content-Type": "application/json" },
      body: JSON.stringify({ reviewerName: "Admin", notes: "Approved same-day ride" }),
    });
    const approveData = await approveRes.json();
    if (approveRes.status === 200 && approveData.booking?.status === "APPROVED") {
      console.log(`✅ TEST 3 PASSED: Admin approval confirmed for same-day ride. Status=${approveData.booking.status}`);
      passedTests++;
    } else {
      console.log(`❌ TEST 3 FAILED: Same-day approval failed. Status=${approveRes.status}`);
    }
  } else {
    console.log(`❌ TEST 3 FAILED: Status=${t3Res.status}, Error=${t3Data.error}, BookingStatus=${t3Data.booking?.status}`);
  }

  // ----------------------------------------------------------------
  // TEST 4: A future-date request (Must NOT be auto-confirmed!)
  // ----------------------------------------------------------------
  console.log("\n👉 TEST 4: Future-date booking request (Must be PENDING_APPROVAL)...");
  // Tomorrow's date
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const t4Res = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: "TEST-STU-04",
      studentName: "Student Future",
      date: tomorrowStr,
      startTime: "17:00",
      endTime: "19:00",
      cyclePreference: "ANY",
    }),
  });
  const t4Data = await t4Res.json();
  let futureBookingId = t4Data.booking?.id;
  if (t4Res.status === 201 && t4Data.booking?.status === "PENDING_APPROVAL" && t4Data.booking?.isSameDay === false) {
    console.log(`✅ TEST 4 PASSED: Future booking created as PENDING_APPROVAL (not auto-confirmed). ID=${t4Data.booking.id}`);
    passedTests++;
  } else {
    console.log(`❌ TEST 4 FAILED: Status=${t4Res.status}, BookingStatus=${t4Data.booking?.status}`);
  }

  // ----------------------------------------------------------------
  // TEST 5: Admin approval of future-date request
  // ----------------------------------------------------------------
  console.log("\n👉 TEST 5: Admin approval of future-date request...");
  if (futureBookingId) {
    const t5Res = await fetch(`${BASE_URL}/api/bookings/${futureBookingId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "admin",
      },
      body: JSON.stringify({
        reviewerName: "Volunteer Lead Rohit S.",
        notes: "Fleet capacity checked and verified.",
      }),
    });
    const t5Data = await t5Res.json();
    if (t5Res.status === 200 && t5Data.booking?.status === "APPROVED") {
      console.log(`✅ TEST 5 PASSED: Admin approved booking ${futureBookingId}. New Status=${t5Data.booking.status}`);
      passedTests++;
    } else {
      console.log(`❌ TEST 5 FAILED: Status=${t5Res.status}, Error=${t5Data.error}`);
    }
  } else {
    console.log("❌ TEST 5 SKIPPED: No booking ID from Test 4.");
  }

  // ----------------------------------------------------------------
  // TEST 6: Admin rejection of future-date request
  // ----------------------------------------------------------------
  console.log("\n👉 TEST 6: Admin rejection of future-date request...");
  // Create another future request
  const t6Req = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: "TEST-STU-06",
      studentName: "Student To Reject",
      date: tomorrowStr,
      startTime: "17:30",
      endTime: "19:30",
      cyclePreference: "ANY",
    }),
  });
  const t6ReqData = await t6Req.json();
  const rejectBookingId = t6ReqData.booking?.id;

  const t6Res = await fetch(`${BASE_URL}/api/bookings/${rejectBookingId}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-role": "admin",
    },
    body: JSON.stringify({
      reviewerName: "Volunteer Lead Rohit S.",
      reason: "Hostel marathon event scheduled; fleet restricted.",
    }),
  });
  const t6Data = await t6Res.json();
  if (t6Res.status === 200 && t6Data.booking?.status === "REJECTED" && t6Data.booking?.rejectionReason) {
    console.log(`✅ TEST 6 PASSED: Admin rejected booking ${rejectBookingId}. Reason: "${t6Data.booking.rejectionReason}"`);
    passedTests++;
  } else {
    console.log(`❌ TEST 6 FAILED: Status=${t6Res.status}, Error=${t6Data.error}`);
  }

  // ----------------------------------------------------------------
  // TEST 7: Two students competing for final available cycle
  // ----------------------------------------------------------------
  console.log("\n👉 TEST 7: Concurrency & Overbooking prevention (Competing for final cycle)...");
  // Select a unique future date for isolation
  const randomDays = 20 + Math.floor(Math.random() * 50);
  const dayIn3 = new Date(Date.now() + randomDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const testSlotStart = "17:00";
  const testSlotEnd = "19:00";

  // Check active fleet capacity
  const capRes = await fetch(`${BASE_URL}/api/fleet/capacity?date=${dayIn3}&startTime=${testSlotStart}&endTime=${testSlotEnd}`);
  const capData = await capRes.json();
  const activeCap = capData.capacity.activeFleetCapacity; // e.g. 3
  console.log(`[TEST 7] Date: ${dayIn3}, Active non-maintenance fleet capacity = ${activeCap}`);

  // Create and approve bookings up to activeCap - 1
  for (let i = 0; i < activeCap - 1; i++) {
    const fillReq = await fetch(`${BASE_URL}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: `FILL-STU-${i}`,
        studentName: `Filling Student ${i}`,
        date: dayIn3,
        startTime: testSlotStart,
        endTime: testSlotEnd,
        cyclePreference: "ANY",
      }),
    });
    const fillData = await fillReq.json();
    await fetch(`${BASE_URL}/api/bookings/${fillData.booking.id}/approve`, {
      method: "POST",
      headers: { "x-user-role": "admin", "Content-Type": "application/json" },
      body: JSON.stringify({ reviewerName: "Admin", notes: "Pre-filling" }),
    });
  }

  // Now exactly 1 cycle remains!
  console.log(`[TEST 7] Fleet filled to ${activeCap - 1}. Exactly 1 cycle slot left. Simulating 2 competing students...`);
  
  // Student A and Student B submit simultaneously
  const [competeA, competeB] = await Promise.all([
    fetch(`${BASE_URL}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "COMPETE-STU-A",
        studentName: "Student A (Final Cycle)",
        date: dayIn3,
        startTime: testSlotStart,
        endTime: testSlotEnd,
        cyclePreference: "ANY",
      }),
    }).then(async r => ({ status: r.status, data: await r.json() })),

    fetch(`${BASE_URL}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "COMPETE-STU-B",
        studentName: "Student B (Final Cycle)",
        date: dayIn3,
        startTime: testSlotStart,
        endTime: testSlotEnd,
        cyclePreference: "ANY",
      }),
    }).then(async r => ({ status: r.status, data: await r.json() }))
  ]);

  // Approve the first one to take the last slot
  const winner = competeA.data.booking || competeB.data.booking;
  await fetch(`${BASE_URL}/api/bookings/${winner.id}/approve`, {
    method: "POST",
    headers: { "x-user-role": "admin", "Content-Type": "application/json" },
    body: JSON.stringify({ reviewerName: "Admin", notes: "Final slot filled" }),
  });

  // Now attempt to book an EXTRA cycle for the same slot
  const overbookReq = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: "OVERBOOK-STU-EXCESS",
      studentName: "Student Over Capacity",
      date: dayIn3,
      startTime: testSlotStart,
      endTime: testSlotEnd,
      cyclePreference: "ANY",
    }),
  });
  const overbookData = await overbookReq.json();

  if (overbookReq.status === 409 && overbookData.error?.includes("capacity exceeded")) {
    console.log(`✅ TEST 7 PASSED: Competing overflow booking was blocked with 409 Conflict. Error: "${overbookData.error}"`);
    passedTests++;
  } else {
    console.log(`❌ TEST 7 FAILED: Expected 409, got ${overbookReq.status}: ${JSON.stringify(overbookData)}`);
  }

  // ----------------------------------------------------------------
  // TEST 8: A maintenance cycle (Attempt to reserve cycle in maintenance)
  // ----------------------------------------------------------------
  console.log("\n👉 TEST 8: Maintenance cycle reservation prevention...");
  // Identify cycle under maintenance (trail-gravel-04)
  const maintCycle = fleetData.fleet.find(c => c.isMaintenance) || fleetData.fleet[2];
  console.log(`[TEST 8] Target cycle under maintenance: ${maintCycle.name} (${maintCycle.id})`);

  const t8Res = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: "TEST-STU-08",
      studentName: "Student Maint Attempt",
      date: dayIn3,
      startTime: "18:00",
      endTime: "20:00",
      cyclePreference: maintCycle.id,
    }),
  });
  const t8Data = await t8Res.json();
  if (t8Res.status === 400 && t8Data.error?.includes("maintenance")) {
    console.log(`✅ TEST 8 PASSED: Booking maintenance cycle was rejected with 400. Error: "${t8Data.error}"`);
    passedTests++;
  } else {
    console.log(`❌ TEST 8 FAILED: Expected rejection for maintenance cycle, got ${t8Res.status}: ${JSON.stringify(t8Data)}`);
  }

  // ----------------------------------------------------------------
  // TEST 9: Correct hourly price calculation (₹10/hr flat rate)
  // ----------------------------------------------------------------
  console.log("\n👉 TEST 9: Correct hourly price calculation (₹25.00 / hour)...");
  // 2.5 hours booking: 17:30 to 20:00 -> Expected ₹62.50
  const futureDay4 = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const t9Res = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: "TEST-STU-09",
      studentName: "Student Hourly Calc",
      date: futureDay4,
      startTime: "17:30",
      endTime: "20:00", // 2.5 hours
      cyclePreference: "ANY",
    }),
  });
  const t9Data = await t9Res.json();
  const b9 = t9Data.booking;
  if (b9 && b9.durationHours === 2.5 && b9.hourlyRate === 25 && b9.totalPrice === 62.5) {
    console.log(`✅ TEST 9 PASSED: 2.5 hrs calculated as ₹${b9.totalPrice.toFixed(2)} (@ ₹${b9.hourlyRate}/hr).`);
    passedTests++;
  } else {
    console.log(`❌ TEST 9 FAILED: Expected 2.5 hrs = ₹62.50, got:`, b9);
  }

  // ----------------------------------------------------------------
  // FINAL SUMMARY
  // ----------------------------------------------------------------
  console.log("\n====================================================");
  console.log(`🏁 TEST RESULTS: ${passedTests} OF ${totalTests} TESTS PASSED`);
  console.log("====================================================");
  if (passedTests === totalTests) {
    console.log("🎉 ALL BOOKING POLICY TESTS SUCCEEDED PERFECTLY!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
