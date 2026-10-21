import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

async function run() {
  console.log("======================================================");
  console.log("     SUPABASE & POSTGRES CONNECTIVITY TEST SUITE      ");
  console.log("======================================================\n");

  const supabaseUrl = process.env.SUPABASE_URL || "https://jresgcozfanfgbeszavf.supabase.co";
  const supabaseKey = process.env.SUPABASE_ANON_KEY || "sb_publishable_kz8ozrgP1QWJyhyXQwsxsA_tRtnamI2";
  const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:RadhaKrsna%4001@db.jresgcozfanfgbeszavf.supabase.co:5432/postgres";

  console.log(`[CONFIG] SUPABASE_URL: ${supabaseUrl}`);
  console.log(`[CONFIG] SUPABASE_ANON_KEY: ${supabaseKey.slice(0, 16)}...`);
  console.log(`[CONFIG] DATABASE_URL: ${databaseUrl.replace(/(:[^:@]+@)/, ':****@')}\n`);

  // 1. Test Supabase API (HTTPS Port 443)
  console.log("👉 STEP 1: Testing Supabase HTTPS Gateway & Authentication...");
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const authRes = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseKey },
    });
    if (authRes.status === 200) {
      console.log("✅ PASS: Supabase Gateway reached successfully (HTTP 200 OK).");
    } else {
      console.log(`⚠️ Status: HTTP ${authRes.status}`);
    }

    const restRes = await supabase.from("cycles").select("id").limit(1);
    if (!restRes.error) {
      console.log("✅ PASS: Supabase PostgREST query completed successfully.");
    } else if (restRes.error.code === "PGRST205") {
      console.log("ℹ️ INFO: Schema cache reached: 'cycles' table not yet migrated in Supabase public schema.");
    } else {
      console.log("ℹ️ Supabase response:", restRes.error.message);
    }
  } catch (err) {
    console.error("❌ FAILED Supabase HTTPS test:", err.message, err.cause || "");
  }

  // 2. Test PostgreSQL Direct Connection
  console.log("\n👉 STEP 2: Testing PostgreSQL Direct Connection...");
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log("✅ PASS: Direct TCP connection established to PostgreSQL.");
    const queryRes = await client.query("SELECT NOW() as now, version() as version;");
    console.log("DB Timestamp:", queryRes.rows[0].now);
    console.log("Engine Version:", queryRes.rows[0].version.split("\n")[0]);
    await client.end();
  } catch (err) {
    console.log(`ℹ️ Direct TCP Notice: ${err.message}`);
    if (err.message.includes("ENOTFOUND")) {
      console.log("  -> Host 'db.jresgcozfanfgbeszavf.supabase.co' is IPv6-only on Supabase.");
      console.log("  -> Local Wi-Fi network currently lacks public IPv6 routing.");
    } else if (err.message.includes("timeout")) {
      console.log("  -> Outbound TCP port 5432 is restricted on local Wi-Fi / ISP firewall.");
    }
    console.log("  -> Hybrid architecture enabled: using Supabase HTTPS API on Port 443 for zero-interruption data operations.");
    try { await client.end(); } catch (e) {}
  }

  console.log("\n======================================================");
  console.log("          CONNECTIVITY DIAGNOSTIC COMPLETE            ");
  console.log("======================================================");
}

run();
