/**
 * Safe One-Time Production Admin Setup & Password Management Tool
 * 
 * Requirements:
 * 1. Requires an explicitly supplied DATABASE_URL.
 * 2. Must NEVER fall back to localhost.
 * 3. Connects to the supplied Neon database.
 * 4. Lists only non-sensitive user information:
 *    - username
 *    - role
 *    - is_active
 * 5. Does NOT print password_hash or any credentials.
 * 6. If 0 users exist (fresh database):
 *    - prompt interactively for initial ADMIN username.
 *    - prompt securely for initial ADMIN password and confirmation.
 *    - validate username and password requirements.
 *    - hash with bcrypt (10 rounds).
 *    - create exactly one user with role = 'admin' and is_active = true using a transaction.
 *    - return only safe metadata (username, role, active status).
 * 7. If exactly one existing ADMIN user:
 *    - allow securely setting a new password interactively.
 * 8. If exactly one STAFF user and no ADMIN:
 *    - allow converting that existing user to ADMIN ONLY after explicit confirmation.
 *    - preserve username.
 *    - set new bcrypt password interactively.
 * 9. If multiple users exist:
 *    - stop safely and show only username/role/active status.
 * 10. Never print passwords, hashes, DATABASE_URL, JWTs, or secrets.
 * 11. Do not automatically modify anything.
 * 12. Keep all existing RBAC/security rules unchanged.
 */

const readline = require("readline");
const { Writable } = require("stream");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

/**
 * Masked terminal prompt that reads input without echoing characters to screen.
 */
function promptSecret(promptText) {
  return new Promise((resolve) => {
    const mutableStdout = new Writable({
      write(chunk, encoding, callback) {
        if (!this.muted) {
          process.stdout.write(chunk, encoding);
        }
        callback();
      },
    });
    mutableStdout.muted = false;

    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: Boolean(process.stdin.isTTY),
    });

    process.stdout.write(promptText);
    mutableStdout.muted = true;

    rl.question("", (answer) => {
      mutableStdout.muted = false;
      process.stdout.write("\n");
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Standard visible terminal prompt for confirmations and usernames.
 */
function promptText(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Safely parse database connection target without leaking credentials.
 */
function getSanitizedTarget(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const dbName = parsed.pathname ? parsed.pathname.replace(/^\//, "") : "unknown";
    return `Host: ${parsed.host} | Database: ${dbName}`;
  } catch {
    return "Custom DATABASE_URL (SSL enabled)";
  }
}

/**
 * Normalize and clean the supplied connection string.
 */
function normalizeDatabaseUrl(url) {
  if (!url || typeof url !== "string") {
    return null;
  }
  let cleaned = url.trim();
  if (cleaned.startsWith("DATABASE_URL=")) {
    cleaned = cleaned.slice("DATABASE_URL=".length).trim();
  }
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Read and confirm password interactively with masking and validation.
 */
async function promptPasswordInteractive(label) {
  const password = await promptSecret(`Enter new password for ${label}: `);
  if (!password || password.length < 8) {
    console.error("[ERROR] Password must be at least 8 characters long.");
    return null;
  }

  const confirmPassword = await promptSecret(`Confirm new password: `);
  if (password !== confirmPassword) {
    console.error("[ERROR] Passwords do not match.");
    return null;
  }

  return password;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`
Usage:
  DATABASE_URL="<neon_database_url>" node scripts/reset-admin-password.js

Description:
  Safe one-time production admin setup and password management tool.
  - Requires explicit DATABASE_URL (NEVER falls back to localhost).
  - Displays non-sensitive user metadata (username, role, is_active).
  - If 0 users exist: sets up the initial ADMIN account interactively.
  - If 1 ADMIN exists: securely resets password.
  - If 1 STAFF exists and 0 ADMINs: allows promoting to ADMIN with new password upon explicit confirmation.
  - If multiple users exist: safely lists users and halts.
  - Never prints passwords, password hashes, or secrets.
`);
    process.exit(0);
  }

  // Reject passwords passed as command-line arguments to prevent shell history leaks
  if (process.argv.some((arg) => arg.startsWith("--password") || arg.startsWith("-p="))) {
    console.error(
      "[SECURITY ERROR] Passing passwords via CLI arguments is prohibited to avoid exposing credentials in shell history and process tables."
    );
    console.error("Please run the command interactively without --password.");
    process.exit(1);
  }

  // Enforce explicit DATABASE_URL (NEVER fallback to localhost)
  const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!connectionString) {
    console.error("==================================================");
    console.error("[ERROR] DATABASE_URL environment variable is required.");
    console.error("==================================================");
    console.error("This is a production admin setup script. To prevent unintended modifications,");
    console.error("it will NEVER silently fall back to localhost or local .env settings.\n");
    console.error("Please supply the target DATABASE_URL, for example:");
    console.error('  DATABASE_URL="postgresql://<user>:<password>@<neon_host>/<database>?sslmode=require" node scripts/reset-admin-password.js\n');
    process.exit(1);
  }

  console.log("==================================================");
  console.log("   Safe Production Admin Setup (One-Time Tool)    ");
  console.log("==================================================");
  console.log(`Target: ${getSanitizedTarget(connectionString)}\n`);

  const pool = new Pool({
    connectionString,
    ssl:
      process.env.DB_SSL === "false"
        ? false
        : {
            rejectUnauthorized: false,
          },
  });

  try {
    // 1. Query all users (WITHOUT password_hash or credentials)
    const usersQuery = await pool.query(
      `SELECT id, username, role, is_active, created_at
       FROM users
       ORDER BY created_at ASC`
    );

    const users = usersQuery.rows;

    console.log(`Database Users Found (${users.length} total):`);
    console.log("----------------------------------------------------------------------");
    console.log(
      `#  | ${"Username".padEnd(25)} | ${"Role".padEnd(15)} | ${"Active".padEnd(8)}`
    );
    console.log("----------------------------------------------------------------------");

    if (users.length === 0) {
      console.log("(No user records currently exist in database)");
    } else {
      users.forEach((u, idx) => {
        const num = String(idx + 1).padEnd(2);
        const uname = String(u.username || "").padEnd(25);
        const urole = String(u.role || "").padEnd(15);
        const uactive = String(Boolean(u.is_active)).padEnd(8);
        console.log(`${num} | ${uname} | ${urole} | ${uactive}`);
      });
    }
    console.log("----------------------------------------------------------------------\n");

    // Case 1: Fresh database (0 users exist) -> Initial ADMIN creation flow
    if (users.length === 0) {
      console.log("No users found in database (fresh database detected).");
      console.log("Starting Initial Production Admin Creation Flow.\n");

      const rawUsername = await promptText("Enter initial ADMIN username (e.g. admin): ");
      if (!rawUsername || typeof rawUsername !== "string" || rawUsername.trim().length < 3) {
        console.error("[ERROR] Username is required and must be at least 3 characters long.");
        await pool.end();
        process.exit(1);
      }

      const cleanUsername = rawUsername.trim().toLowerCase();

      const password = await promptPasswordInteractive(`initial ADMIN '${cleanUsername}'`);
      if (!password) {
        console.log("Operation aborted. No changes were made.");
        await pool.end();
        process.exit(1);
      }

      const confirm = await promptText(
        `\nAre you sure you want to create initial ADMIN user '${cleanUsername}'? (yes/no): `
      );

      if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
        console.log("Operation cancelled by user. No changes were made.");
        await pool.end();
        process.exit(0);
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Double-check uniqueness inside transaction
        const check = await client.query("SELECT id FROM users WHERE LOWER(username) = $1", [cleanUsername]);
        if (check.rows.length > 0) {
          throw new Error("Username is already taken");
        }

        const insertUser = await client.query(
          `INSERT INTO users (username, password_hash, role, is_active)
           VALUES ($1, $2, 'admin'::user_role, TRUE)
           RETURNING id, username, role, is_active, created_at, updated_at`,
          [cleanUsername, passwordHash]
        );

        const newUser = insertUser.rows[0];

        // Link initial staff record for directory representation
        await client.query(
          `INSERT INTO staff (name, user_id, is_available)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (user_id) DO NOTHING`,
          [cleanUsername, newUser.id]
        ).catch(() => {});

        await client.query("COMMIT");

        console.log("\n==================================================");
        console.log("[SUCCESS] Initial ADMIN user created successfully!");
        console.log("==================================================");
        console.log(`  Username:   ${newUser.username}`);
        console.log(`  Role:       ${newUser.role} (ADMIN)`);
        console.log(`  Status:     Active (${newUser.is_active})`);
        console.log(`  Created At: ${newUser.created_at}`);
        console.log("\nYou can now log in to the application with username:", newUser.username);
        await pool.end();
        process.exit(0);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    // Case 2: Multiple users exist -> Stop safely and report status
    if (users.length > 1) {
      console.log("==================================================");
      console.log(`[SAFE STOP] Multiple users exist (${users.length} found).`);
      console.log("==================================================");
      console.log("To ensure security, this one-time setup script will not modify any account");
      console.log("when multiple users are present.");
      console.log("Please review the users listed above.");
      await pool.end();
      process.exit(0);
    }

    // Exactly 1 user exists
    const targetUser = users[0];

    // Case 3: Exactly 1 user exists and that user is already an ADMIN
    if (targetUser.role === "admin") {
      console.log(`Target User: '${targetUser.username}' (ADMIN)`);
      console.log(`Active Status: ${targetUser.is_active ? "Active" : "Inactive"}`);

      const password = await promptPasswordInteractive(`ADMIN '${targetUser.username}'`);
      if (!password) {
        console.log("Operation aborted. No changes were made.");
        await pool.end();
        process.exit(1);
      }

      const confirm = await promptText(
        `\nAre you sure you want to set a new password for ADMIN '${targetUser.username}'? (yes/no): `
      );

      if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
        console.log("Operation cancelled by user. No changes were made.");
        await pool.end();
        process.exit(0);
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const updateResult = await pool.query(
        `UPDATE users
         SET password_hash = $1, is_active = TRUE, updated_at = NOW()
         WHERE id = $2 AND role = 'admin'
         RETURNING id, username, role, is_active, updated_at`,
        [passwordHash, targetUser.id]
      );

      if (updateResult.rowCount !== 1) {
        throw new Error(`Failed to update password for ADMIN user.`);
      }

      const updated = updateResult.rows[0];
      console.log("\n==================================================");
      console.log("[SUCCESS] Admin password updated successfully!");
      console.log("==================================================");
      console.log(`  Username:   ${updated.username} (preserved)`);
      console.log(`  Role:       ${updated.role} (ADMIN)`);
      console.log(`  Status:     Active (${updated.is_active})`);
      console.log(`  Updated At: ${updated.updated_at}`);
      console.log("\nYou can now log in with username:", updated.username);
      await pool.end();
      process.exit(0);
    }

    // Case 4: Exactly 1 user exists and that user is STAFF (or non-admin) with 0 ADMINs
    console.log(`Existing user '${targetUser.username}' currently has role '${targetUser.role}'.`);
    console.log("There is currently NO ADMIN user in the database.\n");

    const confirmPromote = await promptText(
      `Do you want to convert '${targetUser.username}' to ADMIN and set their password? (yes/no): `
    );

    if (confirmPromote.toLowerCase() !== "yes" && confirmPromote.toLowerCase() !== "y") {
      console.log("Operation cancelled by user. No changes were made.");
      await pool.end();
      process.exit(0);
    }

    const password = await promptPasswordInteractive(`new ADMIN '${targetUser.username}'`);
    if (!password) {
      console.log("Operation aborted. No changes were made.");
      await pool.end();
      process.exit(1);
    }

    const finalConfirm = await promptText(
      `\nFinal confirmation: Convert '${targetUser.username}' to ADMIN and update password? (yes/no): `
    );

    if (finalConfirm.toLowerCase() !== "yes" && finalConfirm.toLowerCase() !== "y") {
      console.log("Operation cancelled by user. No changes were made.");
      await pool.end();
      process.exit(0);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const updateResult = await pool.query(
      `UPDATE users
       SET role = 'admin'::user_role, password_hash = $1, is_active = TRUE, updated_at = NOW()
       WHERE id = $2
       RETURNING id, username, role, is_active, updated_at`,
      [passwordHash, targetUser.id]
    );

    if (updateResult.rowCount !== 1) {
      throw new Error(`Failed to convert user to ADMIN.`);
    }

    const updated = updateResult.rows[0];
    console.log("\n==================================================");
    console.log("[SUCCESS] User converted to ADMIN successfully!");
    console.log("==================================================");
    console.log(`  Username:   ${updated.username} (preserved)`);
    console.log(`  Role:       ${updated.role} (ADMIN)`);
    console.log(`  Status:     Active (${updated.is_active})`);
    console.log(`  Updated At: ${updated.updated_at}`);
    console.log("\nYou can now log in with username:", updated.username);
  } catch (error) {
    console.error("\n[FATAL ERROR] Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
