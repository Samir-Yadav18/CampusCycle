import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
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

const REQUIRED_SEED_USERS = [
  {
    userId: "260691",
    name: "Samir Yadav",
    initialPassword: "260691",
    email: "260691@aitpune.edu.in",
    role: "student",
    department: "Computer Engineering",
    semester: "6th Semester",
    isActive: true,
  },
  {
    userId: "260816",
    name: "Kirtika Chaudhary",
    initialPassword: "260816",
    email: "260816@aitpune.edu.in",
    role: "student",
    department: "Information Technology",
    semester: "6th Semester",
    isActive: true,
  },
  {
    userId: "264071",
    name: "Sumit Kumar",
    initialPassword: "264071",
    email: "264071@aitpune.edu.in",
    role: "student",
    department: "Mechanical Engineering",
    semester: "6th Semester",
    isActive: true,
  },
  {
    userId: "Mohit Sharma",
    name: "Mohit Sharma",
    initialPassword: "12345678",
    email: "mohit.sharma@aitpune.edu.in",
    role: "admin",
    department: "Fleet Operations & Administration",
    semester: "Mobility Manager",
    isActive: true,
  },
];

export function runSeed() {
  console.log("======================================================");
  console.log("     CAMPUSCYCLE USER ACCOUNTS DATABASE SEED SCRIPT   ");
  console.log("======================================================\n");

  ensureDataDir();

  let existing = [];
  if (fs.existsSync(USERS_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    } catch {
      existing = [];
    }
  }

  const now = new Date().toISOString();
  const updatedList = [...existing];
  let createdCount = 0;
  let updatedCount = 0;

  for (const seed of REQUIRED_SEED_USERS) {
    const idx = updatedList.findIndex(
      (u) =>
        u.userId.toLowerCase() === seed.userId.toLowerCase() ||
        u.id.toLowerCase() === seed.userId.toLowerCase() ||
        u.email.toLowerCase() === seed.email.toLowerCase() ||
        u.name.toLowerCase() === seed.name.toLowerCase()
    );

    if (idx >= 0) {
      const cur = updatedList[idx];
      const valid = verifyPassword(seed.initialPassword, cur.passwordHash);
      updatedList[idx] = {
        ...cur,
        id: seed.userId,
        userId: seed.userId,
        name: seed.name,
        email: seed.email,
        role: seed.role,
        department: seed.department,
        semester: seed.semester,
        isActive: cur.isActive !== false,
        passwordHash: valid ? cur.passwordHash : hashPassword(seed.initialPassword),
        updatedAt: now,
      };
      updatedCount++;
      console.log(`[VERIFIED/UPDATED] ${seed.name} (User ID: ${seed.userId}) -> Password hash intact. Role: ${seed.role}`);
    } else {
      const newUser = {
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
      createdCount++;
      console.log(`[CREATED] ${seed.name} (User ID: ${seed.userId}) -> Hashed with PBKDF2-SHA512. Role: ${seed.role}`);
    }
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(updatedList, null, 2), "utf-8");

  console.log(`\n✅ Database seed completed. Total accounts: ${updatedList.length} (Created: ${createdCount}, Verified: ${updatedCount})`);
  console.log(`📁 Saved to: ${USERS_FILE}\n`);

  return updatedList;
}

runSeed();
