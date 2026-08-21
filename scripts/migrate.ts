import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  const sql = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 15,
    idle_timeout: 10,
  });

  try {
    // 1. Create migrations tracking table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS public._migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // 2. Check if baseline initial schema already existed before _migrations tracking
    const usersTableCheck = await sql`
      SELECT to_regclass('public.users') as exists;
    `;
    if (usersTableCheck[0]?.exists) {
      // Check if 0001 is already recorded
      const hasInitial = await sql`
        SELECT 1 FROM public._migrations WHERE name = '0001_initial_schema.sql';
      `;
      if (hasInitial.length === 0) {
        console.log('📌 Baseline detected: Marking 0001_initial_schema.sql as already applied.');
        await sql`
          INSERT INTO public._migrations (name)
          VALUES ('0001_initial_schema.sql')
          ON CONFLICT (name) DO NOTHING;
        `;
      }
    }

    // 3. Fetch already applied migrations
    const appliedRows = await sql<{ name: string }[]>`
      SELECT name FROM public._migrations;
    `;
    const appliedSet = new Set(appliedRows.map((r) => r.name));

    // 4. Read migration files from supabase/migrations
    const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.error(`❌ Migrations directory not found: ${migrationsDir}`);
      process.exit(1);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${files.length} migration file(s) in supabase/migrations`);

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏭️  Skipping already applied: ${file}`);
        continue;
      }

      console.log(`⚡ Running migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      // Execute SQL migration in a transaction
      await sql.begin(async (tx) => {
        await tx.unsafe(sqlContent);
        await tx`
          INSERT INTO public._migrations (name)
          VALUES (${file});
        `;
      });

      console.log(`✅ Successfully applied: ${file}`);
    }

    console.log('\n🎉 All migrations are up to date!');
  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
