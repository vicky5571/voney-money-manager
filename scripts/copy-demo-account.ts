import postgres from 'postgres';

async function copyDemoAccount() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 15,
  });

  const SOURCE_EMAIL = 'demo@voney.app';
  const TARGET_EMAIL = 'voney.demo@gmail.com';

  console.log(`🔄 Copying data from [${SOURCE_EMAIL}] to [${TARGET_EMAIL}]...`);

  try {
    const sourceUsers = await sql<{ id: string; email: string; display_name: string }[]>`
      SELECT id, email, display_name FROM public.users WHERE email = ${SOURCE_EMAIL};
    `;
    if (sourceUsers.length === 0) {
      throw new Error(`Source user ${SOURCE_EMAIL} not found.`);
    }
    const sourceUser = sourceUsers[0];

    const targetUsers = await sql<{ id: string; email: string; display_name: string }[]>`
      SELECT id, email, display_name FROM public.users WHERE email = ${TARGET_EMAIL};
    `;
    if (targetUsers.length === 0) {
      throw new Error(`Target user ${TARGET_EMAIL} not found.`);
    }
    const targetUser = targetUsers[0];

    console.log(`👤 Source User: ${sourceUser.display_name} (${sourceUser.id})`);
    console.log(`👤 Target User: ${targetUser.display_name} (${targetUser.id})`);

    // 1. Reset target user data completely
    console.log(`\n🧹 Resetting alternative demo account (${TARGET_EMAIL})...`);
    await sql`DELETE FROM public.transactions WHERE user_id = ${targetUser.id};`;
    await sql`DELETE FROM public.budgets WHERE user_id = ${targetUser.id};`;
    await sql`DELETE FROM public.recurring_bills WHERE user_id = ${targetUser.id};`;
    await sql`DELETE FROM public.accounts WHERE user_id = ${targetUser.id};`;
    console.log(`✅ Alternative demo account cleared.`);

    // 2. Fetch source accounts and recreate for target user
    const sourceAccounts = await sql<{
      id: string;
      name: string;
      type: string;
      icon: string;
      balance: string;
      sort_order: number;
    }[]>`
      SELECT id, name, type, icon, balance, sort_order 
      FROM public.accounts 
      WHERE user_id = ${sourceUser.id}
      ORDER BY sort_order ASC;
    `;

    const accountMap = new Map<string, string>(); // oldId -> newId

    for (const acc of sourceAccounts) {
      const inserted = await sql<{ id: string }[]>`
        INSERT INTO public.accounts (user_id, name, type, icon, balance, sort_order)
        VALUES (${targetUser.id}, ${acc.name}, ${acc.type}, ${acc.icon}, ${acc.balance}, ${acc.sort_order})
        RETURNING id;
      `;
      accountMap.set(acc.id, inserted[0].id);
    }
    console.log(`✅ Copied ${sourceAccounts.length} accounts/wallets.`);

    // 3. Fetch source budgets and recreate for target user
    const sourceBudgets = await sql<{
      category_id: string;
      amount: string;
      start_date: string;
      end_date: string;
      month: number;
      year: number;
    }[]>`
      SELECT category_id, amount, start_date, end_date, month, year
      FROM public.budgets
      WHERE user_id = ${sourceUser.id} AND deleted_at IS NULL;
    `;

    for (const b of sourceBudgets) {
      await sql`
        INSERT INTO public.budgets (user_id, category_id, amount, start_date, end_date, month, year)
        VALUES (${targetUser.id}, ${b.category_id}, ${b.amount}, ${b.start_date}, ${b.end_date}, ${b.month}, ${b.year});
      `;
    }
    console.log(`✅ Copied ${sourceBudgets.length} budgets.`);

    // 4. Fetch source recurring bills and recreate for target user
    const sourceRecurring = await sql<{
      account_id: string;
      category_id: string;
      name: string;
      amount: string;
      frequency: string;
      due_day: number;
      next_due_date: string;
      last_paid_date: string | null;
      is_active: boolean;
      note: string | null;
    }[]>`
      SELECT account_id, category_id, name, amount, frequency, due_day, next_due_date, last_paid_date, is_active, note
      FROM public.recurring_bills
      WHERE user_id = ${sourceUser.id} AND deleted_at IS NULL;
    `;

    for (const r of sourceRecurring) {
      const newAccId = accountMap.get(r.account_id);
      if (!newAccId) continue;
      await sql`
        INSERT INTO public.recurring_bills (
          user_id, account_id, category_id, name, amount, frequency, due_day, next_due_date, last_paid_date, is_active, note
        )
        VALUES (
          ${targetUser.id}, ${newAccId}, ${r.category_id}, ${r.name}, ${r.amount}, ${r.frequency}, ${r.due_day}, ${r.next_due_date}, ${r.last_paid_date}, ${r.is_active}, ${r.note}
        );
      `;
    }
    console.log(`✅ Copied ${sourceRecurring.length} recurring bills.`);

    // 5. Fetch source transactions and recreate for target user
    const sourceTransactions = await sql<{
      account_id: string;
      category_id: string;
      type: string;
      amount: string;
      note: string | null;
      transaction_date: string;
      is_settled: boolean;
      created_at: string;
    }[]>`
      SELECT account_id, category_id, type, amount, note, transaction_date, is_settled, created_at
      FROM public.transactions
      WHERE user_id = ${sourceUser.id} AND deleted_at IS NULL
      ORDER BY transaction_date ASC, created_at ASC;
    `;

    for (const tx of sourceTransactions) {
      const newAccId = accountMap.get(tx.account_id);
      if (!newAccId) {
        throw new Error(`Account mapping not found for account ${tx.account_id}`);
      }
      await sql`
        INSERT INTO public.transactions (
          user_id, account_id, category_id, type, amount, note, transaction_date, is_settled, created_at
        )
        VALUES (
          ${targetUser.id}, ${newAccId}, ${tx.category_id}, ${tx.type}, ${tx.amount}, ${tx.note}, ${tx.transaction_date}, ${tx.is_settled}, ${tx.created_at}
        );
      `;
    }
    console.log(`✅ Copied ${sourceTransactions.length} transactions.`);

    // 6. Recalculate and sync account balances for target user
    for (const [, targetAccId] of accountMap.entries()) {
      const result = await sql<{ income: string; expense: string }[]>`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
        FROM public.transactions
        WHERE user_id = ${targetUser.id} AND account_id = ${targetAccId} AND deleted_at IS NULL;
      `;

      const income = Number(result[0]?.income ?? 0);
      const expense = Number(result[0]?.expense ?? 0);
      const netBalance = income - expense;

      await sql`
        UPDATE public.accounts
        SET balance = ${netBalance}
        WHERE id = ${targetAccId};
      `;
    }
    console.log(`✅ Verified and synced all wallet balances.`);

    console.log(`\n🎉 Successfully cloned all demo transactions & data into ${TARGET_EMAIL}!`);
  } catch (error) {
    console.error('❌ Error during copy:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

copyDemoAccount();
