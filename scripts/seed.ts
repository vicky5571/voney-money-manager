import postgres from 'postgres';

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  console.log('🔄 Connecting to database for seeding...');
  const sql = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 15,
  });

  try {
    // 1. Fetch users
    const users = await sql<{ id: string; email: string; display_name: string }[]>`
      SELECT id, email, display_name FROM public.users;
    `;

    if (users.length === 0) {
      console.log('⚠️  No users found in public.users table. Please sign up an account first or create a user.');
      process.exit(0);
    }

    console.log(`👤 Found ${users.length} user(s) to seed.`);

    // 2. Fetch categories
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

    for (const user of users) {
      console.log(`\n🌱 Seeding data for user: ${user.display_name} (${user.email})...`);

      // Clear existing transactions & budgets first
      await sql`DELETE FROM public.transactions WHERE user_id = ${user.id};`;
      await sql`DELETE FROM public.budgets WHERE user_id = ${user.id};`;

      // Clean up duplicate accounts for user
      await sql`DELETE FROM public.accounts WHERE user_id = ${user.id};`;

      // 3. Create fresh standard 5 wallets
      const defaultAccounts = [
        { name: 'Cash', type: 'cash', icon: 'wallet', sortOrder: 0 },
        { name: 'Bank BCA', type: 'bank', icon: 'building-2', sortOrder: 1 },
        { name: 'Dana', type: 'e-wallet', icon: 'smartphone', sortOrder: 2 },
        { name: 'GoPay', type: 'e-wallet', icon: 'smartphone', sortOrder: 3 },
        { name: 'OVO', type: 'e-wallet', icon: 'smartphone', sortOrder: 4 },
      ];

      for (const acc of defaultAccounts) {
        await sql`
          INSERT INTO public.accounts (user_id, name, type, icon, balance, sort_order)
          VALUES (${user.id}, ${acc.name}, ${acc.type}, ${acc.icon}, 0, ${acc.sortOrder});
        `;
      }

      const userAccounts = await sql<{ id: string; name: string }[]>`
        SELECT id, name FROM public.accounts WHERE user_id = ${user.id} ORDER BY sort_order ASC;
      `;
      const accountMap = new Map(userAccounts.map((a) => [a.name.toLowerCase(), a.id]));

      const getAccId = (name: string) => {
        const id = accountMap.get(name.toLowerCase());
        if (!id) throw new Error(`Account "${name}" not found for user.`);
        return id;
      };

      // 4. Generate dates relative to current date
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-indexed

      const formatDt = (daysAgo: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
      };

      // 5. Seed Sample Transactions (with healthy cash flows)
      const transactionsToSeed = [
        // Income
        {
          account: 'Bank BCA',
          category: 'Salary',
          type: 'income',
          amount: 15000000,
          note: 'Monthly salary from Acme Corp',
          date: formatDt(18),
        },
        {
          account: 'Bank BCA',
          category: 'Freelance',
          type: 'income',
          amount: 4500000,
          note: 'Mobile app UI redesign milestone',
          date: formatDt(10),
        },
        {
          account: 'Cash',
          category: 'Salary',
          type: 'income',
          amount: 2000000,
          note: 'ATM cash withdrawal / petty cash',
          date: formatDt(17),
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
          account: 'GoPay',
          category: 'Other Income',
          type: 'income',
          amount: 1200000,
          note: 'Top up & investment payout',
          date: formatDt(16),
        },
        {
          account: 'OVO',
          category: 'Other Income',
          type: 'income',
          amount: 800000,
          note: 'E-wallet top-up',
          date: formatDt(15),
        },

        // Expenses - Bills & Utilities
        {
          account: 'Bank BCA',
          category: 'Bills',
          type: 'expense',
          amount: 750000,
          note: 'Home internet & electricity bill',
          date: formatDt(16),
        },
        {
          account: 'Dana',
          category: 'Bills',
          type: 'expense',
          amount: 125000,
          note: 'Mobile data 50GB package',
          date: formatDt(15),
        },

        // Expenses - Food & Dining
        {
          account: 'Bank BCA',
          category: 'Food',
          type: 'expense',
          amount: 680000,
          note: 'Weekly groceries at Super Indo',
          date: formatDt(12),
        },
        {
          account: 'Cash',
          category: 'Food',
          type: 'expense',
          amount: 85000,
          note: 'Lunch with team at Nasi Padang',
          date: formatDt(9),
        },
        {
          account: 'GoPay',
          category: 'Food',
          type: 'expense',
          amount: 145000,
          note: 'Dinner delivery (GoFood Pizza)',
          date: formatDt(7),
        },
        {
          account: 'Dana',
          category: 'Food',
          type: 'expense',
          amount: 48000,
          note: 'Iced Americano at Fore Coffee',
          date: formatDt(3),
        },
        {
          account: 'Cash',
          category: 'Food',
          type: 'expense',
          amount: 65000,
          note: 'Street food snacks',
          date: formatDt(1),
        },

        // Expenses - Shopping
        {
          account: 'Bank BCA',
          category: 'Shopping',
          type: 'expense',
          amount: 450000,
          note: 'Uniqlo basic t-shirts',
          date: formatDt(11),
        },
        {
          account: 'OVO',
          category: 'Shopping',
          type: 'expense',
          amount: 199000,
          note: 'Ergonomic desk accessories',
          date: formatDt(6),
        },

        // Expenses - Transport
        {
          account: 'GoPay',
          category: 'Transport',
          type: 'expense',
          amount: 38000,
          note: 'GoRide to client office',
          date: formatDt(8),
        },
        {
          account: 'GoPay',
          category: 'Transport',
          type: 'expense',
          amount: 42000,
          note: 'GoRide back home',
          date: formatDt(8),
        },
        {
          account: 'Bank BCA',
          category: 'Transport',
          type: 'expense',
          amount: 250000,
          note: 'Pertamax fuel refill',
          date: formatDt(4),
        },

        // Expenses - Entertainment, Education & Health
        {
          account: 'OVO',
          category: 'Entertainment',
          type: 'expense',
          amount: 120000,
          note: 'Cinema IMAX ticket + popcorn',
          date: formatDt(13),
        },
        {
          account: 'Cash',
          category: 'Health',
          type: 'expense',
          amount: 150000,
          note: 'Vitamins & skincare pharmacy',
          date: formatDt(2),
        },
        {
          account: 'Bank BCA',
          category: 'Education',
          type: 'expense',
          amount: 299000,
          note: 'Frontend Masters course bundle',
          date: formatDt(17),
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
            transaction_date
          )
          VALUES (
            ${user.id},
            ${getAccId(t.account)},
            ${getCatId(t.category)},
            ${t.type},
            ${t.amount},
            ${t.note},
            ${t.date}
          );
        `;
      }
      console.log(`  ✅ Inserted ${transactionsToSeed.length} sample transactions.`);

      // 6. Seed Monthly Budgets
      const budgetsToSeed = [
        { category: 'Food', amount: 2500000 },
        { category: 'Shopping', amount: 1500000 },
        { category: 'Transport', amount: 800000 },
        { category: 'Bills', amount: 1200000 },
        { category: 'Entertainment', amount: 600000 },
        { category: 'Health', amount: 500000 },
      ];

      for (const b of budgetsToSeed) {
        await sql`
          INSERT INTO public.budgets (
            user_id,
            category_id,
            amount,
            month,
            year
          )
          VALUES (
            ${user.id},
            ${getCatId(b.category)},
            ${b.amount},
            ${currentMonth},
            ${currentYear}
          );
        `;
      }
      console.log(`  ✅ Inserted ${budgetsToSeed.length} monthly budgets for ${currentMonth}/${currentYear}.`);

      // 7. Update Account Balances based on transactions
      for (const acc of userAccounts) {
        const result = await sql<{ income: string; expense: string }[]>`
          SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
          FROM public.transactions
          WHERE user_id = ${user.id} AND account_id = ${acc.id};
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
      console.log(`  ✅ Recalculated and updated all account balances.`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed with error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seed();
