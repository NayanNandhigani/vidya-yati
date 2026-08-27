// Runs a local, file-backed PostgreSQL server for development — no Docker,
// no system install. Data lives in /DATA at the project root so it's easy
// to find, back up, or wipe. Swapping to an external database later is just
// changing DATABASE_URL in .env; nothing else about the app depends on
// this script.
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const DATABASE_NAME = "vidyayati";
const PORT = 5432;
const USER = "postgres";
const PASSWORD = "postgres";

const databaseDir = path.join(process.cwd(), "DATA", "postgres");

const pg = new EmbeddedPostgres({
  databaseDir,
  port: PORT,
  user: USER,
  password: PASSWORD,
  persistent: true,
});

async function main() {
  const fs = await import("node:fs");
  const alreadyInitialised = fs.existsSync(path.join(databaseDir, "PG_VERSION"));

  if (!alreadyInitialised) {
    console.log(`Initialising local Postgres data directory at ${databaseDir} ...`);
    await pg.initialise();
  }

  await pg.start();
  console.log(`Local Postgres is running on port ${PORT}.`);

  try {
    await pg.createDatabase(DATABASE_NAME);
    console.log(`Created database "${DATABASE_NAME}".`);
  } catch {
    // Already exists — fine.
  }

  console.log(`DATABASE_URL=postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE_NAME}`);
  console.log("Local database ready. Leave this process running while you work; Ctrl+C to stop it.");
}

async function shutdown() {
  console.log("\nStopping local Postgres...");
  await pg.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
