import { formatCurrency } from '@/lib/utils';

export interface FinancialHealthResult {
  score: number; // 0 - 100
  rating: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  ratingColor: string;
  savingsRate: number; // % of income saved
  netSavings: number; // income - expense
  runwayDays: number; // days balance can sustain current daily spend
  dailySpendAverage: number;
  factors: {
    savingsScore: number; // out of 35
    budgetScore: number; // out of 35
    runwayScore: number; // out of 15
    punctualityScore: number; // out of 15
  };
  recommendations: string[];
  forecast: {
    daysPassed: number;
    totalDaysInMonth: number;
    daysRemaining: number;
    dailyVelocity: number;
    projectedMonthEndSpend: number;
    projectedDiffVsBudget: number | null;
    isProjectedOverBudget: boolean;
    forecastMessage: string;
  };
}

export function calculateFinancialHealth({
  income,
  expense,
  totalBalance,
  totalBudget,
  totalBudgetSpent,
  hasOverdueBills = false,
}: {
  income: number;
  expense: number;
  totalBalance: number;
  totalBudget: number;
  totalBudgetSpent: number;
  hasOverdueBills?: boolean;
}): FinancialHealthResult {
  const now = new Date();
  const currentDay = Math.max(1, now.getDate());
  const year = now.getFullYear();
  const month = now.getMonth();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const daysRemaining = totalDaysInMonth - currentDay;

  // 1. Savings Rate Factor (max 35 pts)
  const netSavings = income - expense;
  const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;
  let savingsScore = 0;
  if (savingsRate >= 30) savingsScore = 35;
  else if (savingsRate >= 20) savingsScore = 30;
  else if (savingsRate >= 10) savingsScore = 22;
  else if (savingsRate > 0) savingsScore = 15;
  else if (savingsRate === 0) savingsScore = 8;
  else savingsScore = 0; // deficit

  // 2. Budget Adherence Factor (max 35 pts)
  let budgetScore = 25; // default neutral if no budget
  if (totalBudget > 0) {
    const budgetUsedRatio = totalBudgetSpent / totalBudget;
    const monthProgressRatio = currentDay / totalDaysInMonth;

    if (budgetUsedRatio <= monthProgressRatio) {
      budgetScore = 35; // under pacing
    } else if (budgetUsedRatio <= 1.0) {
      budgetScore = 25; // within limit but spending faster than month
    } else if (budgetUsedRatio <= 1.15) {
      budgetScore = 12; // slightly over budget
    } else {
      budgetScore = 0; // heavily over budget
    }
  }

  // 3. Runway & Buffer Factor (max 15 pts)
  const dailySpendAverage = currentDay > 0 ? expense / currentDay : 0;
  const runwayDays =
    dailySpendAverage > 0 ? Math.round(totalBalance / dailySpendAverage) : 90;

  let runwayScore = 0;
  if (runwayDays >= 60) runwayScore = 15;
  else if (runwayDays >= 30) runwayScore = 12;
  else if (runwayDays >= 14) runwayScore = 8;
  else if (runwayDays > 0) runwayScore = 4;
  else runwayScore = 0;

  // 4. Bills & Punctuality Factor (max 15 pts)
  const punctualityScore = hasOverdueBills ? 5 : 15;

  // Total Score (0 - 100)
  const totalScore = Math.min(
    100,
    Math.max(0, savingsScore + budgetScore + runwayScore + punctualityScore)
  );

  let rating: FinancialHealthResult['rating'] = 'Fair';
  let ratingColor = '#F59E0B'; // amber

  if (totalScore >= 85) {
    rating = 'Excellent';
    ratingColor = '#10B981'; // emerald
  } else if (totalScore >= 70) {
    rating = 'Good';
    ratingColor = '#3B82F6'; // blue
  } else if (totalScore >= 50) {
    rating = 'Fair';
    ratingColor = '#F59E0B'; // amber
  } else {
    rating = 'Needs Attention';
    ratingColor = '#EF4444'; // rose/red
  }

  // Actionable tips & recommendations
  const recommendations: string[] = [];
  if (savingsRate < 20 && income > 0) {
    recommendations.push(
      `Aim to save at least 20% of income (${formatCurrency(income * 0.2)}). Current savings rate is ${savingsRate}%.`
    );
  } else if (income === 0 && expense > 0) {
    recommendations.push(
      'Log your monthly income to unlock accurate savings rate insights.'
    );
  }

  if (totalBudget > 0 && totalBudgetSpent > totalBudget) {
    recommendations.push(
      `You have exceeded your total monthly budget by ${formatCurrency(
        totalBudgetSpent - totalBudget
      )}. Slow down discretionary spending.`
    );
  } else if (totalBudget === 0) {
    recommendations.push(
      'Set up category budgets to boost your financial discipline score.'
    );
  }

  if (runwayDays < 30 && totalBalance > 0) {
    recommendations.push(
      `Current wallet balance sustains ${runwayDays} days at your average daily spend of ${formatCurrency(
        dailySpendAverage
      )}/day.`
    );
  }

  if (hasOverdueBills) {
    recommendations.push(
      'You have overdue subscription bills! Pay them to prevent late penalties.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Great financial discipline! You are on pace to hit your monthly savings target.'
    );
  }

  // 5. Spending Velocity & Month-End Forecast
  const projectedMonthEndSpend = Math.round(dailySpendAverage * totalDaysInMonth);
  let isProjectedOverBudget = false;
  let projectedDiffVsBudget: number | null = null;
  let forecastMessage = `Pacing ~${formatCurrency(dailySpendAverage)}/day. Projected month-end spend: ${formatCurrency(
    projectedMonthEndSpend
  )}.`;

  if (totalBudget > 0) {
    projectedDiffVsBudget = projectedMonthEndSpend - totalBudget;
    isProjectedOverBudget = projectedMonthEndSpend > totalBudget;
    if (isProjectedOverBudget) {
      forecastMessage = `⚠️ At current velocity (${formatCurrency(
        dailySpendAverage
      )}/day), projected spend is ${formatCurrency(
        projectedMonthEndSpend
      )} — will exceed budget by ${formatCurrency(projectedDiffVsBudget)}.`;
    } else {
      forecastMessage = `✅ Projected spend is ${formatCurrency(
        projectedMonthEndSpend
      )} — safely ${formatCurrency(
        Math.abs(projectedDiffVsBudget)
      )} under your budget limit!`;
    }
  }

  return {
    score: totalScore,
    rating,
    ratingColor,
    savingsRate,
    netSavings,
    runwayDays,
    dailySpendAverage,
    factors: {
      savingsScore,
      budgetScore,
      runwayScore,
      punctualityScore,
    },
    recommendations,
    forecast: {
      daysPassed: currentDay,
      totalDaysInMonth,
      daysRemaining,
      dailyVelocity: dailySpendAverage,
      projectedMonthEndSpend,
      projectedDiffVsBudget,
      isProjectedOverBudget,
      forecastMessage,
    },
  };
}
