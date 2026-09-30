/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CategoryItem,
  Debt,
  ExpenseTransaction,
  IncomeTransaction,
  MonthSummary,
  RecurringTransaction,
  SavingsGoal,
  SettingsState,
  WorksheetTab,
} from './types/budget';
import {
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_EXPENSE_TRANSACTIONS,
  INITIAL_INCOME_CATEGORIES,
  INITIAL_INCOME_TRANSACTIONS,
  INITIAL_PLANNED_EXPENSES,
  INITIAL_PLANNED_INCOME,
  INITIAL_RECURRING_TRANSACTIONS,
  INITIAL_SAVINGS_GOALS,
  INITIAL_DEBTS,
  INITIAL_SETTINGS,
  PAYMENT_METHODS,
} from './data/initialData';
import { formatCurrency } from './utils/formatters';
import { sumIncomeTransactions, sumExpenseTransactions, buildAnnualSummary } from './utils/formulas';
import {
  STORAGE_KEYS,
  loadFromStorage,
  clearLegacyV1Storage,
  loadFromAccountStorage,
  migrateLegacyV2StorageToAccount,
} from './utils/storage';
import { createLocalWorkbookRepository } from './services/workbookRepository';
import { User } from 'firebase/auth';
import { initAuth, googleSignOut } from './services/googleAuth';
import { loadToolkitAccountSession } from './services/toolkitAccount';
import { hasToolkitFeature } from './types/toolkit';
import type { ToolkitEntitlementResponse } from './types/toolkit';
import {
  GoogleSheetConfig,
  PulledData,
} from './services/googleSheetsService';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { FormulaBar } from './components/FormulaBar';
import { ExportWorkbookModal } from './components/ExportWorkbookModal';
import { StartHereSheet } from './components/worksheets/StartHereSheet';
import { SettingsSheet } from './components/worksheets/SettingsSheet';
import { IncomeSheet } from './components/worksheets/IncomeSheet';
import { ExpensesSheet } from './components/worksheets/ExpensesSheet';
import { MonthlyBudgetSheet } from './components/worksheets/MonthlyBudgetSheet';
import { DashboardSheet } from './components/worksheets/DashboardSheet';
import { DebtPayoffSheet } from './components/worksheets/DebtPayoffSheet';
import { NetWorthForecaster } from './components/worksheets/NetWorthForecaster';
import { AnnualSummarySheet } from './components/worksheets/AnnualSummarySheet';
import { CalendarViewSheet } from './components/worksheets/CalendarViewSheet';
import { TechSpecsSheet } from './components/worksheets/TechSpecsSheet';

export default function App() {
  // Authentication is owned by Firebase. Local storage is only used for workbook
  // preferences/data and must never be treated as proof of identity.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [storageUserId, setStorageUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>(() =>
    loadFromStorage<string>(STORAGE_KEYS.USER_EMAIL, '')
  );

  // Navigation state (initial route after login is 'start_here', the home landing page)
  const [activeTab, setActiveTab] = useState<WorksheetTab>(() =>
    loadFromStorage<WorksheetTab>(STORAGE_KEYS.ACTIVE_TAB, 'start_here')
  );

  // Global persistent settings (Currency, Month, Year, Date Format)
  const [settings, setSettings] = useState<SettingsState>(() =>
    loadFromStorage<SettingsState>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)
  );

  // Category configurations (persistent)
  const [incomeCategories, setIncomeCategories] = useState<CategoryItem[]>(() =>
    loadFromStorage<CategoryItem[]>(STORAGE_KEYS.INCOME_CATEGORIES, INITIAL_INCOME_CATEGORIES)
  );
  const [expenseCategories, setExpenseCategories] = useState<CategoryItem[]>(() =>
    loadFromStorage<CategoryItem[]>(STORAGE_KEYS.EXPENSE_CATEGORIES, INITIAL_EXPENSE_CATEGORIES)
  );
  const [paymentMethods, setPaymentMethods] = useState<string[]>(() =>
    loadFromStorage<string[]>(STORAGE_KEYS.PAYMENT_METHODS, PAYMENT_METHODS)
  );

  // Double-entry transaction ledgers (persistent)
  const [incomeTransactions, setIncomeTransactions] = useState<IncomeTransaction[]>(() =>
    loadFromStorage<IncomeTransaction[]>(STORAGE_KEYS.INCOME_TRANSACTIONS, INITIAL_INCOME_TRANSACTIONS)
  );
  const [expenseTransactions, setExpenseTransactions] = useState<ExpenseTransaction[]>(() =>
    loadFromStorage<ExpenseTransaction[]>(STORAGE_KEYS.EXPENSE_TRANSACTIONS, INITIAL_EXPENSE_TRANSACTIONS)
  );

  // Monthly Planned Budgets (persistent)
  const [plannedIncome, setPlannedIncome] = useState<Record<string, number>>(() =>
    loadFromStorage<Record<string, number>>(STORAGE_KEYS.PLANNED_INCOME, INITIAL_PLANNED_INCOME)
  );
  const [plannedExpenses, setPlannedExpenses] = useState<Record<string, number>>(() =>
    loadFromStorage<Record<string, number>>(STORAGE_KEYS.PLANNED_EXPENSES, INITIAL_PLANNED_EXPENSES)
  );

  // Annual summary is derived from the transaction ledgers so it always reflects current data.
  const annualData = buildAnnualSummary(incomeTransactions, expenseTransactions, settings.year);

  // Savings Goals & Targets tracking (persistent)
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() =>
    loadFromStorage<SavingsGoal[]>(STORAGE_KEYS.SAVINGS_GOALS, INITIAL_SAVINGS_GOALS)
  );

  // Outstanding Debts tracking (persistent)
  const [debts, setDebts] = useState<Debt[]>(() =>
    loadFromStorage<Debt[]>(STORAGE_KEYS.DEBTS, INITIAL_DEBTS)
  );

  // Recurring transactions automation rules (persistent)
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>(() =>
    loadFromStorage<RecurringTransaction[]>(STORAGE_KEYS.RECURRING_TRANSACTIONS, INITIAL_RECURRING_TRANSACTIONS)
  );

  // Formula Bar & Cell inspector state
  const [selectedCell, setSelectedCell] = useState<{
    reference: string;
    value: string;
    formula?: string;
    isCalculated: boolean;
  }>({
    reference: 'StartHere!A1',
    value: 'Personal Monthly Budget Planner',
    isCalculated: false,
  });

  const [highlightInputs, setHighlightInputs] = useState<boolean>(false);

  // The UI persists through a repository boundary. Today this repository is
  // localStorage; a future cloud repository can implement the same contract
  // without changing worksheet components.
  useEffect(() => {
    if (!storageUserId) return;

    const repository = createLocalWorkbookRepository(storageUserId, {
      settings: INITIAL_SETTINGS,
      incomeCategories: INITIAL_INCOME_CATEGORIES,
      expenseCategories: INITIAL_EXPENSE_CATEGORIES,
      paymentMethods: PAYMENT_METHODS,
      incomeTransactions: INITIAL_INCOME_TRANSACTIONS,
      expenseTransactions: INITIAL_EXPENSE_TRANSACTIONS,
      plannedIncome: INITIAL_PLANNED_INCOME,
      plannedExpenses: INITIAL_PLANNED_EXPENSES,
      savingsGoals: INITIAL_SAVINGS_GOALS,
      debts: INITIAL_DEBTS,
      recurringTransactions: INITIAL_RECURRING_TRANSACTIONS,
      userEmail: '',
      activeTab: 'start_here',
      sheetConfig: null,
    });

    repository.save({
      settings,
      incomeCategories,
      expenseCategories,
      paymentMethods,
      incomeTransactions,
      expenseTransactions,
      plannedIncome,
      plannedExpenses,
      savingsGoals,
      debts,
      recurringTransactions,
      userEmail,
      activeTab,
      sheetConfig,
    });
  }, [
    storageUserId,
    settings,
    incomeCategories,
    expenseCategories,
    paymentMethods,
    incomeTransactions,
    expenseTransactions,
    plannedIncome,
    plannedExpenses,
    savingsGoals,
    debts,
    recurringTransactions,
    userEmail,
    activeTab,
    sheetConfig,
  ]);

  // Google OAuth and Google Sheets state (token held in-memory only per security guidelines)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [toolkitSession, setToolkitSession] = useState<ToolkitEntitlementResponse | null>(null);

  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig | null>(() =>
    loadFromStorage<GoogleSheetConfig | null>(STORAGE_KEYS.GOOGLE_SHEET_CONFIG, null)
  );

  useEffect(() => {
    if (storageUserId) saveToAccountStorage(STORAGE_KEYS.GOOGLE_SHEET_CONFIG, storageUserId, sheetConfig);
  }, [sheetConfig, storageUserId]);

  // Listen to Firebase/Google Auth state changes
  useEffect(() => {
    clearLegacyV1Storage();
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        setIsLoggedIn(true);
        setAuthReady(true);
        if (user.email) {
          setUserEmail(user.email);
        }
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
        setToolkitSession(null);
        setIsLoggedIn(false);
        setAuthReady(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load the authenticated user's local workbook namespace before enabling
  // persistence. This prevents one Google account's browser data from being
  // reused by another account on the same browser.
  useEffect(() => {
    if (!googleUser) {
      setStorageUserId(null);
      return;
    }

    const userId = googleUser.uid;
    migrateLegacyV2StorageToAccount(userId);

    setSettings(loadFromAccountStorage(STORAGE_KEYS.SETTINGS, userId, INITIAL_SETTINGS));
    setIncomeCategories(
      loadFromAccountStorage(STORAGE_KEYS.INCOME_CATEGORIES, userId, INITIAL_INCOME_CATEGORIES),
    );
    setExpenseCategories(
      loadFromAccountStorage(STORAGE_KEYS.EXPENSE_CATEGORIES, userId, INITIAL_EXPENSE_CATEGORIES),
    );
    setPaymentMethods(
      loadFromAccountStorage(STORAGE_KEYS.PAYMENT_METHODS, userId, PAYMENT_METHODS),
    );
    setIncomeTransactions(
      loadFromAccountStorage(
        STORAGE_KEYS.INCOME_TRANSACTIONS,
        userId,
        INITIAL_INCOME_TRANSACTIONS,
      ),
    );
    setExpenseTransactions(
      loadFromAccountStorage(
        STORAGE_KEYS.EXPENSE_TRANSACTIONS,
        userId,
        INITIAL_EXPENSE_TRANSACTIONS,
      ),
    );
    setPlannedIncome(
      loadFromAccountStorage(STORAGE_KEYS.PLANNED_INCOME, userId, INITIAL_PLANNED_INCOME),
    );
    setPlannedExpenses(
      loadFromAccountStorage(STORAGE_KEYS.PLANNED_EXPENSES, userId, INITIAL_PLANNED_EXPENSES),
    );
    setSavingsGoals(
      loadFromAccountStorage(STORAGE_KEYS.SAVINGS_GOALS, userId, INITIAL_SAVINGS_GOALS),
    );
    setDebts(loadFromAccountStorage(STORAGE_KEYS.DEBTS, userId, INITIAL_DEBTS));
    setRecurringTransactions(
      loadFromAccountStorage(
        STORAGE_KEYS.RECURRING_TRANSACTIONS,
        userId,
        INITIAL_RECURRING_TRANSACTIONS,
      ),
    );
    setUserEmail(
      loadFromAccountStorage(STORAGE_KEYS.USER_EMAIL, userId, googleUser.email ?? ''),
    );
    setActiveTab(
      loadFromAccountStorage<WorksheetTab>(STORAGE_KEYS.ACTIVE_TAB, userId, 'start_here'),
    );
    setSheetConfig(
      loadFromAccountStorage<GoogleSheetConfig | null>(
        STORAGE_KEYS.GOOGLE_SHEET_CONFIG,
        userId,
        null,
      ),
    );

    setStorageUserId(userId);
  }, [googleUser]);

  // Load the central toolkit account after Firebase restores authentication.
  // If Supabase is unavailable, the budgeting app remains usable locally.
  useEffect(() => {
    if (!googleUser) {
      setToolkitSession(null);
      return;
    }

    let cancelled = false;
    void loadToolkitAccountSession(googleUser).then((session) => {
      if (!cancelled) setToolkitSession(session);
    });

    return () => {
      cancelled = true;
    };
  }, [googleUser]);

  // Handle data pulled from Google Sheet
  const handleDataPulled = (data: PulledData) => {
    if (data.settings) {
      setSettings((prev) => ({ ...prev, ...data.settings }));
    }
    if (data.incomeCategories && data.incomeCategories.length > 0) {
      setIncomeCategories(data.incomeCategories);
    }
    if (data.expenseCategories && data.expenseCategories.length > 0) {
      setExpenseCategories(data.expenseCategories);
    }
    if (data.paymentMethods && data.paymentMethods.length > 0) {
      setPaymentMethods(data.paymentMethods);
    }
    if (data.incomeTransactions) {
      setIncomeTransactions(data.incomeTransactions);
    }
    if (data.expenseTransactions) {
      setExpenseTransactions(data.expenseTransactions);
    }
    if (data.plannedIncome) {
      setPlannedIncome(data.plannedIncome);
    }
    if (data.plannedExpenses) {
      setPlannedExpenses(data.plannedExpenses);
    }
  };

  // Google Sign-In handler
  const handleGoogleLogin = (user: User, token: string) => {
    setGoogleUser(user);
    setGoogleToken(token);
    if (user.email) {
      setUserEmail(user.email);
    }
    setIsLoggedIn(true);
    setActiveTab('start_here');
  };

  // Update settings handler
  const handleUpdateSettings = (newSettings: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Reset settings only to template defaults
  const handleResetSettings = () => {
    setSettings(INITIAL_SETTINGS);
    setIncomeCategories(INITIAL_INCOME_CATEGORIES);
    setExpenseCategories(INITIAL_EXPENSE_CATEGORIES);
    setPaymentMethods(PAYMENT_METHODS);
  };

  // Logout handler
  const handleLogout = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setGoogleToken(null);
    setToolkitSession(null);
    setIsLoggedIn(false);
  };

  // Export workbook modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Export workbook data trigger (opens modal with Excel, CSV, JSON choices)
  const handleExportData = () => {
    setIsExportModalOpen(true);
  };

  // Summary stats for bottom spreadsheet status bar
  const currentTotalIncome = sumIncomeTransactions(incomeTransactions);
  const currentTotalExpenses = sumExpenseTransactions(expenseTransactions);
  const statusStats = {
    count: incomeTransactions.length + expenseTransactions.length,
    sum: formatCurrency(currentTotalIncome - currentTotalExpenses, settings.currency),
  };

  // Helper to change worksheet and persist the current worksheet across refreshes
  const handleSelectTab = (tab: WorksheetTab) => {
    setActiveTab(tab);
    setSelectedCell({
      reference: `${tab.toUpperCase()}!A1`,
      value: `Active Worksheet: ${tab}`,
      isCalculated: false,
    });
  };

  // 1. Wait for Firebase to restore/check the durable Google session before
  // rendering either the login screen or the workbook.
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          <p className="text-sm font-semibold text-slate-800">Restoring your workspace…</p>
          <p className="mt-1 text-xs text-slate-500">Checking your Google account session.</p>
        </div>
      </div>
    );
  }

  // 2. If not logged in, render the Login Screen
  if (!isLoggedIn) {
    return (
      <LoginView onGoogleLogin={handleGoogleLogin} />
    );
  }

  // 3. If activeTab is 'start_here', render the dedicated Home Landing Page
  // (Completely outside the Excel dashboard shell and dashboard header)
  if (activeTab === 'start_here') {
    return (
      <StartHereSheet
        onNavigate={handleSelectTab}
        onSelectCell={setSelectedCell}
        userEmail={userEmail}
        onLogout={handleLogout}
      />
    );
  }

  // 4. Otherwise, the user is inside the Dashboard / Workbook worksheets
  // (Renders the Sidebar Menu, Formula Bar, and Active Worksheet Viewport)
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-slate-100 font-sans text-slate-900 antialiased selection:bg-blue-200">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        userEmail={userEmail}
        onLogout={handleLogout}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Excel Formula Bar with fx, cell reference, highlighter, and Return Home shortcut */}
        <FormulaBar
          selectedCell={selectedCell}
          highlightInputs={highlightInputs}
          onToggleHighlight={() => setHighlightInputs(!highlightInputs)}
          onExportData={handleExportData}
          activeTab={activeTab}
          onGoHome={() => handleSelectTab('start_here')}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          incomeTransactions={incomeTransactions}
          expenseTransactions={expenseTransactions}
        />

        {/* Main Worksheet Viewport */}
        <main className="flex-1 overflow-y-auto p-1.5 sm:p-3">
        {activeTab === 'dashboard' && (
          <DashboardSheet
            incomeTransactions={incomeTransactions}
            expenseTransactions={expenseTransactions}
            categories={expenseCategories}
            incomeCategories={incomeCategories}
            paymentMethods={paymentMethods}
            plannedExpenses={plannedExpenses}
            plannedIncome={plannedIncome}
            annualData={annualData}
            settings={settings}
            onSelectCell={setSelectedCell}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            savingsGoals={savingsGoals}
            onUpdateSavingsGoals={setSavingsGoals}
            debts={debts}
            recurringTransactions={recurringTransactions}
            onUpdateIncomeTransactions={setIncomeTransactions}
            onUpdateExpenseTransactions={setExpenseTransactions}
          />
        )}

        {activeTab === 'calendar_view' && (
          <CalendarViewSheet
            incomeTransactions={incomeTransactions}
            expenseTransactions={expenseTransactions}
            settings={settings}
            recurringTransactions={recurringTransactions}
            onSelectCell={setSelectedCell}
          />
        )}

        {activeTab === 'income' && (
          <IncomeSheet
            transactions={incomeTransactions}
            onUpdateTransactions={setIncomeTransactions}
            categories={incomeCategories}
            settings={settings}
            highlightInputs={highlightInputs}
            onSelectCell={setSelectedCell}
            recurringTransactions={recurringTransactions}
            onUpdateRecurringTransactions={setRecurringTransactions}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesSheet
            transactions={expenseTransactions}
            onUpdateTransactions={setExpenseTransactions}
            categories={expenseCategories}
            paymentMethods={paymentMethods}
            settings={settings}
            highlightInputs={highlightInputs}
            onSelectCell={setSelectedCell}
            recurringTransactions={recurringTransactions}
            onUpdateRecurringTransactions={setRecurringTransactions}
          />
        )}

        {activeTab === 'monthly_budget' && (
          <MonthlyBudgetSheet
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            incomeTransactions={incomeTransactions}
            expenseTransactions={expenseTransactions}
            plannedIncome={plannedIncome}
            onUpdatePlannedIncome={setPlannedIncome}
            plannedExpenses={plannedExpenses}
            onUpdatePlannedExpenses={setPlannedExpenses}
            settings={settings}
            highlightInputs={highlightInputs}
            onSelectCell={setSelectedCell}
            onUpdateIncomeCategories={setIncomeCategories}
            onUpdateExpenseCategories={setExpenseCategories}
          />
        )}

        {activeTab === 'debt_payoff' && (
          <DebtPayoffSheet
            debts={debts}
            onUpdateDebts={setDebts}
            settings={settings}
            highlightInputs={highlightInputs}
            onSelectCell={setSelectedCell}
          />
        )}

        {activeTab === 'net_worth' && (
          <NetWorthForecaster
            debts={debts}
            settings={settings}
            currentMonthlySavings={
              incomeTransactions.reduce((sum, t) => sum + t.amount, 0) -
              expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
            }
            currentMonthlyExpenses={
              expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
            }
            onSelectCell={setSelectedCell}
          />
        )}

        {activeTab === 'annual_summary' && (
          <AnnualSummarySheet
            data={annualData}
            expenseTransactions={expenseTransactions}
            settings={settings}
            onSelectCell={setSelectedCell}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsSheet
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            incomeCategories={incomeCategories}
            onUpdateIncomeCategories={setIncomeCategories}
            expenseCategories={expenseCategories}
            onUpdateExpenseCategories={setExpenseCategories}
            paymentMethods={paymentMethods}
            onUpdatePaymentMethods={setPaymentMethods}
            highlightInputs={highlightInputs}
            onSelectCell={setSelectedCell}
            onResetSettingsToDefaults={handleResetSettings}
            googleSheetsEnabled={
              toolkitSession === null ||
              hasToolkitFeature(toolkitSession.session.entitlements, 'budget.googleSheets')
            }
            googleUser={googleUser}
            googleToken={googleToken}
            onGoogleAuthSuccess={(user, token) => {
              setGoogleUser(user);
              setGoogleToken(token);
              if (user.email) setUserEmail(user.email);
            }}
            onGoogleSignOut={() => {
              setGoogleUser(null);
              setGoogleToken(null);
            }}
            sheetConfig={sheetConfig}
            onUpdateSheetConfig={setSheetConfig}
            workbookData={{
              settings,
              incomeCategories,
              expenseCategories,
              paymentMethods,
              incomeTransactions,
              expenseTransactions,
              plannedIncome,
              plannedExpenses,
            }}
            onDataPulled={handleDataPulled}
          />
        )}

        {activeTab === 'tech_specs' && (
          <TechSpecsSheet
            incomeTransactions={incomeTransactions}
            expenseTransactions={expenseTransactions}
            annualData={annualData}
            settings={settings}
          />
        )}
        </main>
      </div>

      {/* Global Offline Backup Export Modal */}
      <ExportWorkbookModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        workbookData={{
          settings,
          incomeCategories,
          expenseCategories,
          paymentMethods,
          incomeTransactions,
          expenseTransactions,
          plannedIncome,
          plannedExpenses,
          annualData,
        }}
      />
    </div>
  );
}
