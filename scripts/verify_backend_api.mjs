import assert from "assert";

const BASE_URL = "http://localhost:3000";

async function run() {
  console.log("======================================================");
  console.log("  CAMPUSCYCLE BACKEND ARCHITECTURE & CRUD TEST SUITE  ");
  console.log("======================================================\n");

  // TEST 1: GET /api/cycles
  console.log("👉 TEST 1: Fetching cycles via GET /api/cycles...");
  const res1 = await fetch(`${BASE_URL}/api/cycles`);
  assert.strictEqual(res1.status, 200, "GET /api/cycles returns 200 OK");
  const data1 = await res1.json();
  assert(data1.success, "Response indicates success: true");
  assert(Array.isArray(data1.data), "Response contains data array");
  assert(data1.count >= 30, `Expected at least 30 cycles, received ${data1.count}`);
  console.log(`✅ TEST 1 PASSED: Retrieved ${data1.count} cycles successfully.\n`);

  // TEST 2: POST /api/cycles (Create new cycle)
  console.log("👉 TEST 2: Creating a new cycle via POST /api/cycles...");
  const newCyclePayload = {
    id: "CC-TEST-99",
    name: "Campus Test Cruiser #99",
    series: "Test Fleet",
    modelCode: "CC-T99",
    category: "city",
    dockNumber: "Bay 99",
    hourlyRate: 25.0,
    isMaintenance: false,
  };
  const res2 = await fetch(`${BASE_URL}/api/cycles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newCyclePayload),
  });
  assert.strictEqual(res2.status, 201, "POST /api/cycles returns 201 Created");
  const data2 = await res2.json();
  assert(data2.success, "Response indicates success: true");
  assert.strictEqual(data2.data.id, "CC-TEST-99");
  console.log(`✅ TEST 2 PASSED: Created cycle ${data2.data.name} (${data2.data.id}).\n`);

  // TEST 3: GET /api/cycles/CC-TEST-99
  console.log("👉 TEST 3: Fetching single cycle via GET /api/cycles/CC-TEST-99...");
  const res3 = await fetch(`${BASE_URL}/api/cycles/CC-TEST-99`);
  assert.strictEqual(res3.status, 200, "GET /api/cycles/CC-TEST-99 returns 200 OK");
  const data3 = await res3.json();
  assert(data3.success, "Response indicates success: true");
  assert.strictEqual(data3.data.id, "CC-TEST-99");
  console.log(`✅ TEST 3 PASSED: Retrieved cycle record: ${data3.data.name}.\n`);

  // TEST 4: PATCH /api/cycles/CC-TEST-99 (Update cycle)
  console.log("👉 TEST 4: Updating cycle via PATCH /api/cycles/CC-TEST-99...");
  const res4 = await fetch(`${BASE_URL}/api/cycles/CC-TEST-99`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      isMaintenance: true,
      maintenanceReason: "Routine safety inspection",
    }),
  });
  assert.strictEqual(res4.status, 200, "PATCH /api/cycles/CC-TEST-99 returns 200 OK");
  const data4 = await res4.json();
  assert(data4.success, "Update indicates success");
  console.log(`✅ TEST 4 PASSED: Cycle status updated successfully.\n`);

  // TEST 5: DELETE /api/cycles/CC-TEST-99
  console.log("👉 TEST 5: Deleting cycle via DELETE /api/cycles/CC-TEST-99...");
  const res5 = await fetch(`${BASE_URL}/api/cycles/CC-TEST-99`, {
    method: "DELETE",
  });
  assert.strictEqual(res5.status, 200, "DELETE /api/cycles/CC-TEST-99 returns 200 OK");
  const data5 = await res5.json();
  assert(data5.success, "Delete indicates success");
  console.log(`✅ TEST 5 PASSED: ${data5.message}\n`);

  console.log("======================================================");
  console.log("  ALL BACKEND API CRUD TESTS PASSED SUCCESSFULLY!    ");
  console.log("======================================================");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
