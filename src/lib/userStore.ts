import fs from "fs";
import path from "path";
import crypto from "crypto";
import { UserModel, PublicUserProfile } from "@/models/types";
import { supabase } from "@/lib/supabaseClient";

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Secure password hashing using PBKDF2 (SHA-512, 100,000 iterations, 16-byte salt)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

/**
 * Verifies a password against a stored PBKDF2 hash using timing-safe comparison
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
      return false;
    }
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalHash = parts[3];

    const computedHash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
    
    const bufOriginal = Buffer.from(originalHash, "hex");
    const bufComputed = Buffer.from(computedHash, "hex");
    if (bufOriginal.length !== bufComputed.length) return false;
    return crypto.timingSafeEqual(bufOriginal, bufComputed);
  } catch {
    return false;
  }
}

/**
 * Sanitizes a UserModel to PublicUserProfile, removing passwordHash
 */
export function sanitizeUser(user: UserModel): PublicUserProfile {
  return {
    id: user.id,
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    semester: user.semester,
    isActive: user.isActive !== false,
  };
}

/**
 * The canonical administrator account required by the system
 */
export const ADMIN_SEED_USER = {
  userId: "Mohit Sharma",
  name: "Mohit Sharma",
  initialPassword: "12345678",
  email: "mohit.sharma@aitpune.edu.in",
  role: "admin" as const,
  department: "Fleet Operations & Administration",
  semester: "Mobility Manager",
  isActive: true,
};

/**
 * The 3 canonical student user accounts + 1 administrator required by the system
 */
export const REQUIRED_SEED_USERS = [
  {
    userId: "260691",
    name: "Samir Yadav",
    initialPassword: "260691",
    email: "260691@aitpune.edu.in",
    role: "student" as const,
    department: "Computer Engineering",
    semester: "6th Semester",
    isActive: true,
  },
  {
    userId: "260816",
    name: "Kirtika Chaudhary",
    initialPassword: "260816",
    email: "260816@aitpune.edu.in",
    role: "student" as const,
    department: "Information Technology",
    semester: "6th Semester",
    isActive: true,
  },
  {
    userId: "264071",
    name: "Sumit Kumar",
    initialPassword: "264071",
    email: "264071@aitpune.edu.in",
    role: "student" as const,
    department: "Mechanical Engineering",
    semester: "6th Semester",
    isActive: true,
  },
  ADMIN_SEED_USER,
];

/**
 * Load all users from disk
 */
export function loadUsers(): UserModel[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    const seeded = seedInitialUsers();
    return seeded;
  }
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    const users: UserModel[] = JSON.parse(raw);
    if (!Array.isArray(users) || users.length === 0) {
      return seedInitialUsers();
    }
    // Verify admin exists in the loaded users, if not reseed
    const hasAdmin = users.some((u) => u.role === "admin" || u.name.toLowerCase() === "mohit sharma");
    if (!hasAdmin) {
      return seedInitialUsers();
    }
    return users;
  } catch {
    return seedInitialUsers();
  }
}

/**
 * Save users to disk
 */
export function saveUsers(users: UserModel[]) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

/**
 * Idempotent seed function: creates or updates the 4 user accounts safely.
 * Can be run repeatedly without duplicating accounts.
 */
export function seedInitialUsers(): UserModel[] {
  ensureDataDir();
  let existing: UserModel[] = [];
  if (fs.existsSync(USERS_FILE)) {
    try {
      const raw = fs.readFileSync(USERS_FILE, "utf-8");
      existing = JSON.parse(raw);
    } catch {
      existing = [];
    }
  }

  const now = new Date().toISOString();
  const updatedList = [...existing];

  for (const seed of REQUIRED_SEED_USERS) {
    const index = updatedList.findIndex(
      (u) =>
        u.userId.toLowerCase() === seed.userId.toLowerCase() ||
        u.id.toLowerCase() === seed.userId.toLowerCase() ||
        u.email.toLowerCase() === seed.email.toLowerCase() ||
        u.name.toLowerCase() === seed.name.toLowerCase()
    );

    if (index >= 0) {
      // User exists: update profile attributes, verify password hash is intact
      const current = updatedList[index];
      const isPassValid = verifyPassword(seed.initialPassword, current.passwordHash);
      
      updatedList[index] = {
        ...current,
        id: seed.userId,
        userId: seed.userId,
        name: seed.name,
        email: seed.email,
        role: seed.role,
        department: seed.department,
        semester: seed.semester,
        isActive: current.isActive !== false,
        passwordHash: isPassValid ? current.passwordHash : hashPassword(seed.initialPassword),
        updatedAt: now,
      };
    } else {
      // Create fresh user account
      const newUser: UserModel = {
        id: seed.userId,
        userId: seed.userId,
        name: seed.name,
        email: seed.email,
        passwordHash: hashPassword(seed.initialPassword),
        role: seed.role,
        department: seed.department,
        semester: seed.semester,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      updatedList.push(newUser);
    }
  }

  saveUsers(updatedList);

  // Sync to Supabase in background if available
  syncToSupabase(updatedList).catch(() => {});

  return updatedList;
}

/**
 * Syncs user accounts to Supabase if reachable
 */
async function syncToSupabase(users: UserModel[]) {
  try {
    const payload = users.map((u) => ({
      id: u.id,
      user_id: u.userId,
      name: u.name,
      email: u.email,
      password_hash: u.passwordHash,
      role: u.role,
      department: u.department,
      semester: u.semester,
      created_at: u.createdAt,
      updated_at: u.updatedAt,
    }));
    await supabase.from("users").upsert(payload, { onConflict: "user_id" });
  } catch {
    // Non-blocking fallback
  }
}

/**
 * Authenticates a user by User ID (or university email / name) and password
 */
export function authenticateUser(
  userIdOrEmail: string,
  password: string
): { success: boolean; user?: PublicUserProfile; error?: string } {
  if (!userIdOrEmail || !password) {
    return { success: false, error: "User ID / Email and password are required." };
  }

  const users = loadUsers();
  const cleanInput = userIdOrEmail.trim().toLowerCase();

  const user = users.find(
    (u) =>
      u.userId.toLowerCase() === cleanInput ||
      u.id.toLowerCase() === cleanInput ||
      u.email.toLowerCase() === cleanInput ||
      u.name.toLowerCase() === cleanInput
  );

  if (!user) {
    return { success: false, error: "Invalid credentials: User ID not found." };
  }

  if (user.isActive === false) {
    return { success: false, error: "Account deactivated by administrator. Please contact mobility support." };
  }

  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Invalid credentials: Incorrect password." };
  }

  return { success: true, user: sanitizeUser(user) };
}

/**
 * Finds public user by User ID or Name
 */
export function getUserById(userId: string): PublicUserProfile | null {
  const users = loadUsers();
  const cleanId = userId.trim().toLowerCase();
  const user = users.find(
    (u) =>
      u.userId.toLowerCase() === cleanId ||
      u.id.toLowerCase() === cleanId ||
      u.name.toLowerCase() === cleanId
  );
  return user ? sanitizeUser(user) : null;
}

/**
 * Finds full UserModel for internal server-side auth & verification
 */
export function getUserModelById(userId: string): UserModel | null {
  const users = loadUsers();
  const cleanId = userId.trim().toLowerCase();
  return (
    users.find(
      (u) =>
        u.userId.toLowerCase() === cleanId ||
        u.id.toLowerCase() === cleanId ||
        u.name.toLowerCase() === cleanId
    ) || null
  );
}

/**
 * Lists all public user profiles
 */
export function listPublicUsers(): PublicUserProfile[] {
  const users = loadUsers();
  return users.map(sanitizeUser);
}

/**
 * Toggle user active/disabled status (Admin operation)
 */
export function toggleUserActiveStatus(
  userId: string,
  isActive: boolean
): { success: boolean; error?: string; user?: PublicUserProfile } {
  const users = loadUsers();
  const cleanId = userId.trim().toLowerCase();
  const index = users.findIndex(
    (u) =>
      u.userId.toLowerCase() === cleanId ||
      u.id.toLowerCase() === cleanId ||
      u.name.toLowerCase() === cleanId
  );

  if (index === -1) {
    return { success: false, error: `User with ID ${userId} not found.` };
  }

  // Prevent disabling the primary admin
  if (users[index].role === "admin" && !isActive) {
    return { success: false, error: "Cannot deactivate the primary administrator account." };
  }

  users[index].isActive = isActive;
  users[index].updatedAt = new Date().toISOString();
  saveUsers(users);

  return { success: true, user: sanitizeUser(users[index]) };
}
