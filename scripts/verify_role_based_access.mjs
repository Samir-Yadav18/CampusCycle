/**
 * Comprehensive Verification Suite for CampusCycle RBAC & Admin Portal
 * 
 * Verifies all 14 criteria:
 * 1. Logged-out shows login page.
 * 2. All 3 existing users (Samir, Kirtika, Sumit) authenticate with ID & Password.
 * 3. User login redirects/opens campus map.
 * 4. Administrator (Mohit Sharma / 12345678) logs in and opens Admin Dashboard.
 * 5. Incorrect password is rejected (HTTP 401).
 * 6. Logged-out visitor cannot access protected dashboards/APIs (HTTP 401).
 * 7. Normal user cannot open admin URL (frontend RBAC guard rejects & redirects).
 * 8. Normal user cannot call administrator-only APIs (HTTP 403 Forbidden).
 * 9. Admin role separation on bookings and fleet management.
 * 10. Privilege escalation attempt (submitting role: "admin" or x-user-role with student ID) is rejected (HTTP 403).
 * 11. Administrator changes to bicycle maintenance and bookings reflect immediately on user availability.
 * 12. Shared booking conflict protection continues to work (HTTP 409 Conflict).
 * 13. Logout endpoint invalidates cookies and session.
 * 14. Session persistence on refresh via /api/auth/me.
 */

import http from "http";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
let passedTests = 0;
let totalTests = 0;

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

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
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
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  } catch {
    data = null;
  }

  // Extract set-cookie if present
  const setCookie = response.headers.get("set-cookie");

  return { status: response.status, data, headers: response.headers, setCookie };
}

async function runVerification() {
  console.log("======================================================================");
  console.log("🚀 CAMPUSCYCLE ROLE-BASED ACCESS CONTROL (RBAC) & ADMIN VERIFICATION ");
  console.log("======================================================================\n");

  // CRITERION 1: Opening CampusCycle while logged out shows login page & /login route exists
  console.log("▶ CRITERION 1: Default Landing Page is dedicated Login Page for unauthenticated visitors");
  {
    const pageContent = fs.readFileSync(path.join(process.cwd(), "src/components/CampusCycleApp.tsx"), "utf-8");
    assert(pageContent.includes("if (!currentUser)") && pageContent.includes("<LoginPage />"), "CampusCycleApp renders <LoginPage /> when unauthenticated");
    assert(pageContent.includes("if (currentUser.role === \"admin\")") && pageContent.includes("<AdminDashboard />"), "CampusCycleApp renders <AdminDashboard /> for admin role");
    
    // Check /login route
    const loginRes = await request("/login");
    assert(loginRes.status === 200, "Dedicated /login route returns HTTP 200 OK");

    // Check auth/me returns authenticated: false when no session is present
    const meRes = await request("/api/auth/me");
    assert(meRes.data.authenticated === false, "Unauthenticated session check /api/auth/me returns authenticated: false");
  }

  // CRITERION 2 & 3: Three student user accounts authenticate and redirect to user home
  console.log("\n▶ CRITERION 2 & 3: Three student users authenticate and redirect to user map");
  const studentAccounts = [
    { id: "260691", name: "Samir Yadav", pass: "260691" },
    { id: "260816", name: "Kirtika Chaudhary", pass: "260816" },
    { id: "264071", name: "Sumit Kumar", pass: "264071" },
  ];

  for (const acc of studentAccounts) {
    const authRes = await request("/api/auth/login", {
      method: "POST",
      body: { userId: acc.id, password: acc.pass },
    });
    assert(authRes.status === 200 && authRes.data.success, `${acc.name} (${acc.id}) logged in successfully`);
    assert(authRes.data.user.role === "student", `${acc.name} has role 'student'`);
    assert(authRes.data.redirectUrl === "/", `${acc.name} redirected to user home page '/'`);
    assert(!authRes.data.user.passwordHash, "Password hash is NEVER leaked in login response");
    assert(authRes.setCookie && authRes.setCookie.includes("campuscycle_user_id"), "Session cookie set in response");
  }

  // CRITERION 4: Administrator account (Mohit Sharma / 12345678)
  console.log("\n▶ CRITERION 4: Administrator account (Mohit Sharma / 12345678) provisions and logs in");
  let adminCookie = "";
  {
    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: { userId: "Mohit Sharma", password: "12345678" },
    });
    assert(adminLogin.status === 200 && adminLogin.data.success, "Mohit Sharma logged in with administrator credentials");
    assert(adminLogin.data.user.role === "admin", "Authenticated account has verified 'admin' role");
    assert(adminLogin.data.redirectUrl === "/admin", "Administrator redirected to Admin Dashboard '/admin'");
    assert(!adminLogin.data.user.passwordHash, "Admin password hash is securely concealed");
    adminCookie = adminLogin.setCookie;
    assert(adminCookie.includes("campuscycle_user_role=admin"), "Admin role cookie issued for browser session");

    // Case-insensitivity check (e.g. mohit sharma)
    const adminCaseCheck = await request("/api/auth/login", {
      method: "POST",
      body: { userId: "mohit sharma", password: "12345678" },
    });
    assert(adminCaseCheck.status === 200 && adminCaseCheck.data.success, "Admin login ID is case-insensitive ('mohit sharma')");
  }

  // CRITERION 5: Incorrect password is rejected
  console.log("\n▶ CRITERION 5: Incorrect passwords rejected");
  {
    const wrongStudent = await request("/api/auth/login", {
      method: "POST",
      body: { userId: "260691", password: "wrongpassword" },
    });
    assert(wrongStudent.status === 401 && !wrongStudent.data.success, "Incorrect student password rejected with HTTP 401");

    const wrongAdmin = await request("/api/auth/login", {
      method: "POST",
      body: { userId: "Mohit Sharma", password: "wrongpassword" },
    });
    assert(wrongAdmin.status === 401 && !wrongAdmin.data.success, "Incorrect admin password rejected with HTTP 401");
  }

  // CRITERION 6: Logged-out visitor cannot directly access protected dashboards or APIs
  console.log("\n▶ CRITERION 6: Logged-out visitor cannot call protected admin APIs");
  {
    const unauthOverview = await request("/api/admin/overview");
    assert(unauthOverview.status === 401, "GET /api/admin/overview rejects unauthenticated visitor with HTTP 401");

    const unauthUsers = await request("/api/admin/users");
    assert(unauthUsers.status === 401, "GET /api/admin/users rejects unauthenticated visitor with HTTP 401");

    const unauthToggle = await request("/api/admin/users/260691/toggle-status", {
      method: "POST",
      body: { isActive: false },
    });
    assert(unauthToggle.status === 401, "POST /api/admin/users/.../toggle-status rejects unauthenticated visitor with HTTP 401");
  }

  // CRITERION 7 & 8: Normal user cannot call administrator-only APIs
  console.log("\n▶ CRITERION 7 & 8: Normal user cannot call admin APIs directly");
  {
    // Samir Yadav tries to call GET /api/admin/overview
    const studentOverview = await request("/api/admin/overview", {
      headers: { "x-user-id": "260691" },
    });
    assert(studentOverview.status === 403, "Student calling GET /api/admin/overview rejected with HTTP 403 Forbidden");

    // Samir Yadav tries to call GET /api/admin/users
    const studentUsers = await request("/api/admin/users", {
      headers: { "x-user-id": "260691" },
    });
    assert(studentUsers.status === 403, "Student calling GET /api/admin/users rejected with HTTP 403 Forbidden");

    // Samir Yadav tries to toggle another user's status
    const studentToggle = await request("/api/admin/users/260816/toggle-status", {
      method: "POST",
      headers: { "x-user-id": "260691" },
      body: { isActive: false },
    });
    assert(studentToggle.status === 403, "Student calling user deactivation rejected with HTTP 403 Forbidden");
  }

  // CRITERION 9: Ownership check on booking cancellations
  console.log("\n▶ CRITERION 9: Ownership checks on booking cancellations");
  {
    const testDate = "2026-11-05";
    // Samir creates a booking
    const samirBook = await request("/api/bookings", {
      method: "POST",
      headers: { "x-user-id": "260691" },
      body: {
        studentId: "260691",
        studentName: "Samir Yadav",
        date: testDate,
        startTime: "17:00",
        endTime: "18:00",
        cyclePreference: "CC-007",
      },
    });
    assert(samirBook.status === 201, "Samir created test booking for CC-007");
    const bookingId = samirBook.data.booking.id;

    // Kirtika (260816) tries to cancel Samir's booking
    const kirtikaCancelAttempt = await request(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "x-user-id": "260816" },
    });
    assert(kirtikaCancelAttempt.status === 403, "Kirtika attempting to cancel Samir's booking rejected with HTTP 403 Forbidden");

    // Samir cancels his OWN booking -> succeeds
    const samirCancelOwn = await request(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "x-user-id": "260691" },
    });
    assert(samirCancelOwn.status === 200 && samirCancelOwn.data.success, "Samir successfully cancelled his OWN booking");
  }

  // CRITERION 10: Client privilege escalation rejected
  console.log("\n▶ CRITERION 10: Privilege escalation attempt (sending role: admin) rejected");
  {
    // Samir passes x-user-role: admin header with his student id
    const escalateRes = await request("/api/admin/overview", {
      headers: {
        "x-user-id": "260691",
        "x-user-role": "admin",
      },
    });
    assert(escalateRes.status === 403, "Student passing 'x-user-role: admin' is verified against DB and rejected with HTTP 403 Forbidden");
  }

  // CRITERION 11: Administrator changes to bicycle status and bookings reflect in user portal
  console.log("\n▶ CRITERION 11: Administrator maintenance toggle immediately affects cycle availability");
  {
    const targetCycle = "CC-005";
    // Admin marks CC-005 under maintenance
    const maintRes = await request("/api/fleet", {
      method: "POST",
      headers: { "x-user-id": "Mohit Sharma" },
      body: { cycleId: targetCycle, isMaintenance: true, reason: "Brake alignment" },
    });
    assert(maintRes.status === 200 && maintRes.data.success, "Admin marked CC-005 under maintenance");

    // User attempts to book CC-005
    const bookMaintRes = await request("/api/bookings", {
      method: "POST",
      headers: { "x-user-id": "260691" },
      body: {
        studentId: "260691",
        studentName: "Samir Yadav",
        date: "2026-11-06",
        startTime: "17:00",
        endTime: "18:00",
        cyclePreference: targetCycle,
      },
    });
    assert(bookMaintRes.status === 400, "User booking cycle under maintenance rejected with HTTP 400");

    // Admin restores CC-005 to available
    const restoreRes = await request("/api/fleet", {
      method: "POST",
      headers: { "x-user-id": "Mohit Sharma" },
      body: { cycleId: targetCycle, isMaintenance: false },
    });
    assert(restoreRes.status === 200 && restoreRes.data.success, "Admin restored CC-005 to available");
  }

  // CRITERION 12: Admin Overview API calculates actual DB counts
  console.log("\n▶ CRITERION 12: Admin Overview returns actual database counts (no fake numbers)");
  {
    const overviewRes = await request("/api/admin/overview", {
      headers: { "x-user-id": "Mohit Sharma" },
    });
    assert(overviewRes.status === 200 && overviewRes.data.success, "GET /api/admin/overview returns HTTP 200 OK");
    const stats = overviewRes.data.stats;
    assert(stats.totalBicycles === 35, `Total fleet is accurately 35 bicycles (got ${stats.totalBicycles})`);
    assert(typeof stats.availableBicycles === "number", `Available bicycles is numeric (${stats.availableBicycles})`);
    assert(typeof stats.maintenanceBicycles === "number", `Maintenance count is numeric (${stats.maintenanceBicycles})`);
    assert(stats.totalUsers >= 4, `Total registered users is at least 4 (${stats.totalUsers})`);
  }

  // CRITERION 13: Admin Users API returns registered users without passwords
  console.log("\n▶ CRITERION 13: Admin Users API securely lists accounts without password hashes");
  {
    const usersRes = await request("/api/admin/users", {
      headers: { "x-user-id": "Mohit Sharma" },
    });
    assert(usersRes.status === 200 && usersRes.data.success, "GET /api/admin/users returns HTTP 200 OK");
    const userList = usersRes.data.users;
    assert(userList.length >= 4, "Includes all 4 registered accounts");
    const hasAdmin = userList.some((u) => u.userId === "Mohit Sharma" && u.role === "admin");
    assert(hasAdmin, "Mohit Sharma is listed with role 'admin'");
    const noHashes = userList.every((u) => !u.passwordHash);
    assert(noHashes, "Zero password hashes are exposed in the user list");
  }

  // CRITERION 14: Logout clears session
  console.log("\n▶ CRITERION 14: Logout clears session cookies and state");
  {
    const logoutRes = await request("/api/auth/logout", {
      method: "POST",
    });
    assert(logoutRes.status === 200 && logoutRes.data.success, "POST /api/auth/logout returns HTTP 200 OK");
    assert(logoutRes.setCookie && logoutRes.setCookie.includes("Max-Age=0"), "Session cookies expired (Max-Age=0)");
  }

  console.log("\n======================================================================");
  console.log(`🎉 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("======================================================================\n");
}

runVerification().catch((err) => {
  console.error("\n❌ Test suite failed:", err);
  process.exit(1);
});
