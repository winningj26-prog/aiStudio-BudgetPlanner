import { BudgetItem, BudgetStatus, ExpenseTransaction, IncomeTransaction, MonthSummary, TestResultItem } from '../types/budget';

const safeAmount = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
};

export function sumIncomeTransactions(transactions: IncomeTransaction[]): number {
  return transactions.reduce((acc, curr) => acc + safeAmount(curr.amount), 0);
}

export function sumExpenseTransactions(transactions: ExpenseTransaction[]): number {
  return transactions.reduce((acc, curr) => acc + safeAmount(curr.amount), 0);
}

export function sumIncomeByCategory(transactions: IncomeTransaction[], category: string): number {
  return transactions
    .filter((tx) => tx.category.toLowerCase().trim() === category.toLowerCase().trim())
    .reduce((acc, curr) => acc + safeAmount(curr.amount), 0);
}

export function sumExpensesByCategory(transactions: ExpenseTransaction[], category: string): number {
  return transactions
    .filter((tx) => tx.category.toLowerCase().trim() === category.toLowerCase().trim())
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
}

export function calculateBudgetStatus(percentUsed: number): BudgetStatus {
  const safePercent = Number.isFinite(percentUsed) && percentUsed >= 0 ? percentUsed : 0;
  if (safePercent <= 80) return 'On Track';
  if (safePercent <= 100) return 'Near Limit';
  return 'Over Budget';
}

export function buildAnnualSummary(
  incomeTransactions: IncomeTransaction[],
  expenseTransactions: ExpenseTransaction[],
  year: number
): MonthSummary[] {
  const months = [
    { month: 'Jan', fullName: 'January' },
    { month: 'Feb', fullName: 'February' },
    { month: 'Mar', fullName: 'March' },
    { month: 'Apr', fullName: 'April' },
    { month: 'May', fullName: 'May' },
    { month: 'Jun', fullName: 'June' },
    { month: 'Jul', fullName: 'July' },
    { month: 'Aug', fullName: 'August' },
    { month: 'Sep', fullName: 'September' },
    { month: 'Oct', fullName: 'October' },
    { month: 'Nov', fullName: 'November' },
    { month: 'Dec', fullName: 'December' },
  ];

  return months.map((month, index) => {
    const monthNumber = String(index + 1).padStart(2, '0');
    const prefix = `${year}-${monthNumber}-`;

    const income = sumIncomeTransactions(
      incomeTransactions.filter((tx) => tx.date.startsWith(prefix))
    );
    const expenses = sumExpenseTransactions(
      expenseTransactions.filter((tx) => tx.date.startsWith(prefix))
    );
    const savings = income - expenses;

    return {
      ...month,
      income,
      expenses,
      savings,
      savingsRate: income > 0 ? (savings / income) * 100 : 0,
    };
  });
}

export function calculateBudgetItem(
  category: string,
  type: 'income' | 'expense',
  planned: number,
  actual: number
): BudgetItem {
  const safePlanned = safeAmount(planned);
  const safeActual = safeAmount(actual);
  const diff = type === 'expense' ? safePlanned - safeActual : safeActual - safePlanned;
  const percentUsed = safePlanned > 0 ? Number(((safeActual / safePlanned) * 100).toFixed(2)) : safeActual > 0 ? 100 : 0;

  let status: BudgetStatus = 'On Track';
  if (type === 'expense') {
    status = calculateBudgetStatus(percentUsed);
  } else {
    // Income is a target: below 80% is not an "over budget" condition.
    status = percentUsed >= 100 ? 'On Track' : percentUsed >= 80 ? 'Near Target' : 'Below Target';
  }

  return {
    category,
    type,
    planned: safePlanned,
    actual: safeActual,
    difference: diff,
    percentUsed,
    status,
  };
}

export function runBudgetTestSuite(
  incomeTransactions: IncomeTransaction[],
  expenseTransactions: ExpenseTransaction[],
  annualData: MonthSummary[]
): TestResultItem[] {
  const totalIncome = sumIncomeTransactions(incomeTransactions);
  const totalExpenses = sumExpenseTransactions(expenseTransactions);
  const housingExpense = sumExpensesByCategory(expenseTransactions, 'Housing');
  const groceriesExpense = sumExpensesByCategory(expenseTransactions, 'Groceries');
  const salaryIncome = sumIncomeByCategory(incomeTransactions, 'Salary');
  
  const plannedExpenses = 4450.0;
  const remainingBudget = plannedExpenses - totalExpenses;
  const budgetUtilization = (totalExpenses / plannedExpenses) * 100;
  const savings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  const annualIncome = annualData.reduce((acc, m) => acc + m.income, 0);
  const annualExpenses = annualData.reduce((acc, m) => acc + m.expenses, 0);
  const annualSavings = annualIncome - annualExpenses;
  const avgSavingsRate = annualIncome > 0 ? (annualSavings / annualIncome) * 100 : 0;

  return [
    {
      name: 'Total Income Calculation',
      category: 'Income',
      formula: '=SUM(tbl_Income[Amount])',
      expected: 5600.0,
      actual: totalIncome,
      passed: Math.abs(totalIncome - 5600.0) < 0.01,
    },
    {
      name: 'Salary Category Income',
      category: 'Income',
      formula: '=SUMIF(tbl_Income[Category], "Salary", tbl_Income[Amount])',
      expected: 4000.0,
      actual: salaryIncome,
      passed: Math.abs(salaryIncome - 4000.0) < 0.01,
    },
    {
      name: 'Total Expenses Calculation',
      category: 'Expenses',
      formula: '=SUM(tbl_Expenses[Amount])',
      expected: 2460.0,
      actual: totalExpenses,
      passed: Math.abs(totalExpenses - 2460.0) < 0.01,
    },
    {
      name: 'Housing Expense Total',
      category: 'Expenses',
      formula: '=SUMIF(tbl_Expenses[Category], "Housing", tbl_Expenses[Amount])',
      expected: 1200.0,
      actual: housingExpense,
      passed: Math.abs(housingExpense - 1200.0) < 0.01,
    },
    {
      name: 'Groceries Expense Total',
      category: 'Expenses',
      formula: '=SUMIF(tbl_Expenses[Category], "Groceries", tbl_Expenses[Amount])',
      expected: 120.0,
      actual: groceriesExpense,
      passed: Math.abs(groceriesExpense - 120.0) < 0.01,
    },
    {
      name: 'Net Monthly Savings',
      category: 'Summary',
      formula: '=Total_Income - Total_Expenses',
      expected: 3140.0,
      actual: savings,
      passed: Math.abs(savings - 3140.0) < 0.01,
    },
    {
      name: 'Monthly Savings Rate',
      category: 'Summary',
      formula: '=Net_Savings / Total_Income',
      expected: '56.1%',
      actual: `${savingsRate.toFixed(1)}%`,
      passed: Math.abs(savingsRate - 56.0714) < 0.1,
    },
    {
      name: 'Remaining Budget Variance',
      category: 'Budget',
      formula: '=Planned_Expenses - Actual_Expenses',
      expected: 1990.0,
      actual: remainingBudget,
      passed: Math.abs(remainingBudget - 1990.0) < 0.01,
    },
    {
      name: 'Expense Budget Utilization',
      category: 'Budget',
      formula: '=Actual_Expenses / Planned_Expenses',
      expected: '55.3%',
      actual: `${budgetUtilization.toFixed(1)}%`,
      passed: Math.abs(budgetUtilization - 55.28) < 0.1,
    },
    {
      name: 'Annual Total Income',
      category: 'Annual',
      formula: '=SUM(tbl_AnnualSummary[Income])',
      expected: 64000.0,
      actual: annualIncome,
      passed: Math.abs(annualIncome - 64000.0) < 0.01,
    },
    {
      name: 'Annual Total Expenses',
      category: 'Annual',
      formula: '=SUM(tbl_AnnualSummary[Expenses])',
      expected: 32040.0,
      actual: annualExpenses,
      passed: Math.abs(annualExpenses - 32040.0) < 0.01,
    },
    {
      name: 'Annual Total Savings',
      category: 'Annual',
      formula: '=Annual_Income - Annual_Expenses',
      expected: 31960.0,
      actual: annualSavings,
      passed: Math.abs(annualSavings - 31960.0) < 0.01,
    },
    {
      name: 'Annual Average Savings Rate',
      category: 'Annual',
      formula: '=Annual_Savings / Annual_Income',
      expected: '49.9%',
      actual: `${avgSavingsRate.toFixed(1)}%`,
      passed: Math.abs(avgSavingsRate - 49.9375) < 0.1,
    },
  ];
}
