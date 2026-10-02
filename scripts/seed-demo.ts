import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

const DEMO_USERS = [
  {
    email: 'demo@voney.app',
    password: 'password123',
    displayName: 'Alex Morgan (Demo)',
  },
  {
    email: 'voney.demo@gmail.com',
    password: 'password123',
    displayName: 'Alex Morgan (Demo)',
  },
];

async function seedDemo() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('🔄 Connecting to database for demo account creation...');
  const sql = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 15,
  });

  try {
    // 1. Fetch categories
    const categories = await sql<{ id: string; name: string; type: string }[]>`
      SELECT id, name, type FROM public.categories;
    `;
    const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

    const getCatId = (name: string) => {
      const cat = catMap.get(name.toLowerCase());
      if (!cat) {
        throw new Error(`Category "${name}" not found in database.`);
      }
      return cat.id;
    };

    // Dates relative to current date (2026-10-02)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    const formatDt = (daysAgo: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    for (const demoConfig of DEMO_USERS) {
      console.log(`\n======================================================`);
      console.log(`👤 Setting up demo account: ${demoConfig.email}`);
      console.log(`======================================================`);

      // 2. Ensure user exists in auth.users with known password
      const pwHash = (
        await sql`SELECT extensions.crypt(${demoConfig.password}, extensions.gen_salt('bf', 10)) as hash;`
      )[0].hash;

      const existingAuth = (
        await sql<{ id: string }[]>`
          SELECT id FROM auth.users WHERE email = ${demoConfig.email};
        `
      )[0];

      let userId = existingAuth?.id;

      if (!userId) {
        console.log('  ➕ Creating new auth user...');
        const inserted = await sql<{ id: string }[]>`
          INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            is_super_admin,
            is_sso_user,
            is_anonymous
          ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            ${demoConfig.email},
            ${pwHash},
            now(),
            ${sql.json({ provider: 'email', providers: ['email'] })},
            ${sql.json({ display_name: demoConfig.displayName, email: demoConfig.email })},
            now(),
            now(),
            '',
            '',
            '',
            '',
            false,
            false,
            false
          )
          RETURNING id;
        `;
        userId = inserted[0].id;
      } else {
        console.log('  🔄 Updating existing auth user password and status...');
        await sql`
          UPDATE auth.users
          SET encrypted_password = ${pwHash},
              email_confirmed_at = COALESCE(email_confirmed_at, now()),
              raw_user_meta_data = ${sql.json({ display_name: demoConfig.displayName, email: demoConfig.email })},
              updated_at = now()
          WHERE id = ${userId};
        `;
      }

      // 3. Upsert into auth.identities
      await sql`DELETE FROM auth.identities WHERE user_id = ${userId};`;
      await sql`
        INSERT INTO auth.identities (
          id,
          user_id,
          identity_data,
          provider,
          provider_id,
          last_sign_in_at,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${userId},
          ${sql.json({ sub: userId, email: demoConfig.email, display_name: demoConfig.displayName })},
          'email',
          ${userId},
          now(),
          now(),
          now()
        );
      `;

      // 4. Upsert into public.users
      await sql`
        INSERT INTO public.users (id, email, display_name)
        VALUES (${userId}, ${demoConfig.email}, ${demoConfig.displayName})
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          display_name = EXCLUDED.display_name;
      `;

      // 5. Clean up old user data for this demo user only
      await sql`DELETE FROM public.transactions WHERE user_id = ${userId};`;
      await sql`DELETE FROM public.budgets WHERE user_id = ${userId};`;
      await sql`DELETE FROM public.recurring_bills WHERE user_id = ${userId};`;
      await sql`DELETE FROM public.accounts WHERE user_id = ${userId};`;

      // 6. Create standard 5 wallets
      const defaultAccounts = [
        { name: 'Bank BCA', type: 'bank', icon: 'building-2', sortOrder: 0 },
        { name: 'Cash', type: 'cash', icon: 'wallet', sortOrder: 1 },
        { name: 'GoPay', type: 'e-wallet', icon: 'smartphone', sortOrder: 2 },
        { name: 'Dana', type: 'e-wallet', icon: 'smartphone', sortOrder: 3 },
        { name: 'OVO', type: 'e-wallet', icon: 'smartphone', sortOrder: 4 },
      ];

      for (const acc of defaultAccounts) {
        await sql`
          INSERT INTO public.accounts (user_id, name, type, icon, balance, sort_order)
          VALUES (${userId}, ${acc.name}, ${acc.type}, ${acc.icon}, 0, ${acc.sortOrder});
        `;
      }

      const userAccounts = await sql<{ id: string; name: string }[]>`
        SELECT id, name FROM public.accounts WHERE user_id = ${userId} ORDER BY sort_order ASC;
      `;
      const accountMap = new Map(userAccounts.map((a) => [a.name.toLowerCase(), a.id]));

      const getAccId = (name: string) => {
        const id = accountMap.get(name.toLowerCase());
        if (!id) throw new Error(`Account "${name}" not found for user.`);
        return id;
      };

      // 7. Seed Sample Transactions (Rich realistic history across 45 days)
      const transactionsToSeed = [
        // --- October 2026: Business Activity (Current Month) ---
        {
          account: 'Bank BCA',
          category: 'Client Project',
          type: 'income',
          amount: 8500000,
          note: 'SaaS Mobile App UI/UX Redesign - Milestone 2 payment',
          date: formatDt(0), // Today (Oct 2)
        },
        {
          account: 'Bank BCA',
          category: 'Business Expense',
          type: 'expense',
          amount: 450000,
          note: 'Vercel Pro & Cloud Server hosting fee',
          date: formatDt(0), // Today (Oct 2)
        },
        {
          account: 'GoPay',
          category: 'Business Expense',
          type: 'expense',
          amount: 68000,
          note: 'Client meeting coffee & pastry at Common Grounds',
          date: formatDt(0), // Today (Oct 2)
        },
        {
          account: 'Bank BCA',
          category: 'Freelance',
          type: 'income',
          amount: 4200000,
          note: 'Design System implementation consulting retainer',
          date: formatDt(1), // Oct 1
        },
        {
          account: 'Bank BCA',
          category: 'Business Expense',
          type: 'expense',
          amount: 240000,
          note: 'Figma Professional Team monthly seat',
          date: formatDt(1), // Oct 1
        },
        {
          account: 'Dana',
          category: 'Client Project',
          type: 'income',
          amount: 1500000,
          note: 'Landing page performance optimization retainer',
          date: formatDt(1), // Oct 1
        },
        {
          account: 'Bank BCA',
          category: 'Business Expense',
          type: 'expense',
          amount: 350000,
          note: 'Envato Elements & typography commercial license',
          date: formatDt(1), // Oct 1
        },

        // --- October 2026: Personal Expenses & Income ---
        {
          account: 'GoPay',
          category: 'Food',
          type: 'expense',
          amount: 48000,
          note: 'Morning Iced Latte at Fore Coffee',
          date: formatDt(0), // Today (Oct 2)
        },
        {
          account: 'Cash',
          category: 'Food',
          type: 'expense',
          amount: 75000,
          note: 'Lunch at Nasi Padang Garuda with colleagues',
          date: formatDt(0),
        },
        {
          account: 'GoPay',
          category: 'Transport',
          type: 'expense',
          amount: 28000,
          note: 'GoRide to client office',
          date: formatDt(0),
        },
        {
          account: 'Bank BCA',
          category: 'Salary',
          type: 'income',
          amount: 18500000,
          note: 'Monthly salary from Tech Global Corp',
          date: formatDt(1), // Oct 1
        },
        {
          account: 'Cash',
          category: 'Salary',
          type: 'income',
          amount: 2000000,
          note: 'ATM cash withdrawal for monthly petty cash',
          date: formatDt(1),
        },
        {
          account: 'GoPay',
          category: 'Other Income',
          type: 'income',
          amount: 1000000,
          note: 'Monthly GoPay balance top-up',
          date: formatDt(1),
        },
        {
          account: 'Dana',
          category: 'Other Income',
          type: 'income',
          amount: 1000000,
          note: 'Monthly Dana balance top-up for utilities',
          date: formatDt(1),
        },
        {
          account: 'OVO',
          category: 'Other Income',
          type: 'income',
          amount: 800000,
          note: 'Monthly OVO wallet top-up',
          date: formatDt(1),
        },

        // --- Late September 2026 ---
        {
          account: 'Bank BCA',
          category: 'Shopping',
          type: 'expense',
          amount: 499000,
          note: 'Uniqlo AIRism basics & work shirts',
          date: formatDt(3),
        },
        {
          account: 'Bank BCA',
          category: 'Client Project',
          type: 'income',
          amount: 7500000,
          note: 'Fintech Dashboard Web Design - Final Milestone',
          date: formatDt(4),
        },
        {
          account: 'Dana',
          category: 'Food',
          type: 'expense',
          amount: 135000,
          note: 'GoFood dinner pizza delivery',
          date: formatDt(5),
        },
        {
          account: 'Bank BCA',
          category: 'Bills',
          type: 'expense',
          amount: 450000,
          note: 'Biznet 100Mbps Home Fiber Internet',
          date: formatDt(6),
        },
        {
          account: 'Bank BCA',
          category: 'Bills',
          type: 'expense',
          amount: 550000,
          note: 'PLN Electricity token 500k',
          date: formatDt(7),
        },
        {
          account: 'Cash',
          category: 'Food',
          type: 'expense',
          amount: 45000,
          note: 'Bakso street food snacks',
          date: formatDt(8),
        },
        {
          account: 'GoPay',
          category: 'Transport',
          type: 'expense',
          amount: 35000,
          note: 'GoRide to co-working space',
          date: formatDt(9),
        },
        {
          account: 'Bank BCA',
          category: 'Freelance',
          type: 'income',
          amount: 4500000,
          note: 'E-commerce mobile app UI consultation',
          date: formatDt(10),
        },
        {
          account: 'Bank BCA',
          category: 'Food',
          type: 'expense',
          amount: 680000,
          note: 'Weekly family groceries at Super Indo',
          date: formatDt(11),
        },
        {
          account: 'OVO',
          category: 'Entertainment',
          type: 'expense',
          amount: 195000,
          note: 'Cinema XXI IMAX tickets (2x) + popcorn',
          date: formatDt(12),
        },
        {
          account: 'Bank BCA',
          category: 'Health',
          type: 'expense',
          amount: 450000,
          note: 'Mega Fit gym monthly membership',
          date: formatDt(13),
        },
        {
          account: 'Bank BCA',
          category: 'Client Project',
          type: 'income',
          amount: 12000000,
          note: 'Fintech Mobile Banking App - Phase 1 Deliverables',
          date: formatDt(14),
        },
        {
          account: 'Bank BCA',
          category: 'Business Expense',
          type: 'expense',
          amount: 1200000,
          note: 'WeWork co-working dedicated desk monthly fee',
          date: formatDt(15),
        },
        {
          account: 'Dana',
          category: 'Gift',
          type: 'income',
          amount: 1000000,
          note: 'Birthday gift from family',
          date: formatDt(14),
        },
        {
          account: 'Bank BCA',
          category: 'Entertainment',
          type: 'expense',
          amount: 186000,
          note: 'Netflix 4K UHD subscription',
          date: formatDt(15),
        },
        {
          account: 'GoPay',
          category: 'Entertainment',
          type: 'expense',
          amount: 86900,
          note: 'Spotify Premium Family subscription',
          date: formatDt(16),
        },
        {
          account: 'Bank BCA',
          category: 'Education',
          type: 'expense',
          amount: 390000,
          note: 'Frontend Masters annual plan milestone',
          date: formatDt(17),
        },
        {
          account: 'Bank BCA',
          category: 'Transport',
          type: 'expense',
          amount: 250000,
          note: 'Pertamax fuel refill for car',
          date: formatDt(18),
        },
        {
          account: 'Cash',
          category: 'Health',
          type: 'expense',
          amount: 120000,
          note: 'Pharmacy vitamins & supplement',
          date: formatDt(19),
        },
        {
          account: 'OVO',
          category: 'Shopping',
          type: 'expense',
          amount: 289000,
          note: 'Ergonomic aluminum laptop stand on Tokopedia',
          date: formatDt(20),
        },

        // --- Mid September 2026 ---
        {
          account: 'Bank BCA',
          category: 'Business Expense',
          type: 'expense',
          amount: 240000,
          note: 'Figma Professional monthly seat',
          date: formatDt(22),
        },
        {
          account: 'GoPay',
          category: 'Food',
          type: 'expense',
          amount: 55000,
          note: 'Starbucks cold brew coffee',
          date: formatDt(23),
        },
        {
          account: 'Cash',
          category: 'Transport',
          type: 'expense',
          amount: 20000,
          note: 'Mall basement parking fee',
          date: formatDt(24),
        },
        {
          account: 'Bank BCA',
          category: 'Food',
          type: 'expense',
          amount: 520000,
          note: 'Weekend dinner with family at Sushi Tei',
          date: formatDt(25),
        },
        {
          account: 'Dana',
          category: 'Bills',
          type: 'expense',
          amount: 150000,
          note: 'Telkomsel Halo postpaid mobile plan',
          date: formatDt(26),
        },
        {
          account: 'Bank BCA',
          category: 'Shopping',
          type: 'expense',
          amount: 320000,
          note: 'Periplus books - Designing Data-Intensive Applications',
          date: formatDt(27),
        },

        // --- Early September / Late August 2026 (Historical baseline) ---
        {
          account: 'Bank BCA',
          category: 'Salary',
          type: 'income',
          amount: 18500000,
          note: 'Monthly salary from Tech Global Corp (September)',
          date: formatDt(32),
        },
        {
          account: 'Bank BCA',
          category: 'Client Project',
          type: 'income',
          amount: 6000000,
          note: 'Brand Identity Design Project kickoff',
          date: formatDt(35),
        },
        {
          account: 'Bank BCA',
          category: 'Bills',
          type: 'expense',
          amount: 450000,
          note: 'Biznet Internet September',
          date: formatDt(36),
        },
        {
          account: 'Bank BCA',
          category: 'Food',
          type: 'expense',
          amount: 720000,
          note: 'Supermarket monthly household supplies',
          date: formatDt(38),
        },
        {
          account: 'Bank BCA',
          category: 'Salary',
          type: 'income',
          amount: 18500000,
          note: 'Monthly salary from Tech Global Corp (August)',
          date: formatDt(62),
        },
        {
          account: 'Bank BCA',
          category: 'Freelance',
          type: 'income',
          amount: 5000000,
          note: 'SaaS Mobile App UX Audit',
          date: formatDt(60),
        },
      ];

      for (const t of transactionsToSeed) {
        await sql`
          INSERT INTO public.transactions (
            user_id,
            account_id,
            category_id,
            type,
            amount,
            note,
            transaction_date,
            is_settled
          )
          VALUES (
            ${userId},
            ${getAccId(t.account)},
            ${getCatId(t.category)},
            ${t.type},
            ${t.amount},
            ${t.note},
            ${t.date},
            true
          );
        `;
      }
      console.log(`  ✅ Inserted ${transactionsToSeed.length} sample transactions.`);

      // 8. Seed Date-Range Budgets for Current Month
      const firstOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
      const lastOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      const budgetsToSeed = [
        { category: 'Food', amount: 3500000, startDate: firstOfMonth, endDate: lastOfMonth },
        { category: 'Shopping', amount: 1500000, startDate: firstOfMonth, endDate: lastOfMonth },
        { category: 'Transport', amount: 1000000, startDate: firstOfMonth, endDate: lastOfMonth },
        { category: 'Bills', amount: 1500000, startDate: firstOfMonth, endDate: lastOfMonth },
        { category: 'Entertainment', amount: 800000, startDate: firstOfMonth, endDate: lastOfMonth },
        { category: 'Health', amount: 600000, startDate: firstOfMonth, endDate: lastOfMonth },
        { category: 'Education', amount: 500000, startDate: firstOfMonth, endDate: lastOfMonth },
      ];

      for (const b of budgetsToSeed) {
        await sql`
          INSERT INTO public.budgets (
            user_id,
            category_id,
            amount,
            start_date,
            end_date,
            month,
            year
          )
          VALUES (
            ${userId},
            ${getCatId(b.category)},
            ${b.amount},
            ${b.startDate},
            ${b.endDate},
            ${currentMonth},
            ${currentYear}
          );
        `;
      }
      console.log(`  ✅ Inserted ${budgetsToSeed.length} date-range budgets for ${currentMonth}/${currentYear}.`);

      // 9. Seed Active Recurring Bills
      const recurringBillsToSeed = [
        {
          name: 'Mega Fit Gym Membership',
          amount: 450000,
          frequency: 'monthly',
          dueDay: 5,
          nextDueDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-05`,
          account: 'Bank BCA',
          category: 'Health',
        },
        {
          name: 'Spotify Premium Family',
          amount: 86900,
          frequency: 'monthly',
          dueDay: 10,
          nextDueDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-10`,
          account: 'GoPay',
          category: 'Entertainment',
        },
        {
          name: 'Netflix 4K UHD Plan',
          amount: 186000,
          frequency: 'monthly',
          dueDay: 15,
          nextDueDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-15`,
          account: 'Bank BCA',
          category: 'Entertainment',
        },
        {
          name: 'Biznet 100Mbps Home Internet',
          amount: 450000,
          frequency: 'monthly',
          dueDay: 20,
          nextDueDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-20`,
          account: 'Bank BCA',
          category: 'Bills',
        },
        {
          name: 'iCloud 2TB Family Storage',
          amount: 149000,
          frequency: 'monthly',
          dueDay: 28,
          nextDueDate: `${currentYear}-${String(currentMonth).padStart(2, '0')}-28`,
          account: 'Bank BCA',
          category: 'Bills',
        },
      ];

      for (const r of recurringBillsToSeed) {
        await sql`
          INSERT INTO public.recurring_bills (
            user_id,
            account_id,
            category_id,
            name,
            amount,
            frequency,
            due_day,
            next_due_date,
            is_active
          )
          VALUES (
            ${userId},
            ${getAccId(r.account)},
            ${getCatId(r.category)},
            ${r.name},
            ${r.amount},
            ${r.frequency},
            ${r.dueDay},
            ${r.nextDueDate},
            true
          );
        `;
      }
      console.log(`  ✅ Inserted ${recurringBillsToSeed.length} active recurring bills.`);

      // 10. Recalculate and update account balances
      for (const acc of userAccounts) {
        const result = await sql<{ income: string; expense: string }[]>`
          SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
          FROM public.transactions
          WHERE user_id = ${userId} AND account_id = ${acc.id};
        `;

        const income = Number(result[0]?.income ?? 0);
        const expense = Number(result[0]?.expense ?? 0);
        const netBalance = income - expense;

        await sql`
          UPDATE public.accounts
          SET balance = ${netBalance}
          WHERE id = ${acc.id};
        `;
      }
      console.log(`  ✅ Recalculated and updated all 5 wallet balances.`);

      // 11. Verify authentication works via Supabase client
      if (supabaseUrl && supabaseAnonKey) {
        const client = createClient(supabaseUrl, supabaseAnonKey);
        const { data: authData, error: authError } = await client.auth.signInWithPassword({
          email: demoConfig.email,
          password: demoConfig.password,
        });

        if (authError) {
          console.warn(`  ⚠️ Sign-in verification warning: ${authError.message}`);
        } else {
          console.log(`  🔑 Supabase Auth verified successfully! (User ID: ${authData.user.id})`);
        }
      }
    }

    console.log('\n======================================================');
    console.log('🎉 Demo account setup and database seeding complete!');
    console.log('======================================================');
    console.log('Ready to log in on /login with either:');
    for (const u of DEMO_USERS) {
      console.log(`  📧 Email:    ${u.email}`);
      console.log(`  🔒 Password: ${u.password}`);
      console.log(`  👤 Name:     ${u.displayName}\n`);
    }
  } catch (error) {
    console.error('\n❌ Seeding demo account failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seedDemo();
