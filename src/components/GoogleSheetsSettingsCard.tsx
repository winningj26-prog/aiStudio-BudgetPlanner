/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  HardDrive,
  Link as LinkIcon,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Unlink,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  GoogleSheetConfig,
  SyncPayload,
  createBudgetSpreadsheet,
  extractSpreadsheetId,
  pullAllDataFromGoogleSheet,
  pushAllDataToGoogleSheet,
  verifySpreadsheet,
  PulledData,
} from '../services/googleSheetsService';
import { googleSignIn, googleSignOut } from '../services/googleAuth';

interface GoogleSheetsSettingsCardProps {
  googleUser: User | null;
  googleToken: string | null;
  onGoogleAuthSuccess: (user: User, token: string) => void;
  onGoogleSignOut: () => void;
  sheetConfig: GoogleSheetConfig | null;
  onUpdateSheetConfig: (config: GoogleSheetConfig | null) => void;
  workbookData: SyncPayload;
  onDataPulled: (data: PulledData) => void;
}

export const GoogleSheetsSettingsCard: React.FC<GoogleSheetsSettingsCardProps> = ({
  googleUser,
  googleToken,
  onGoogleAuthSuccess,
  onGoogleSignOut,
  sheetConfig,
  onUpdateSheetConfig,
  workbookData,
  onDataPulled,
}) => {
  const [existingInput, setExistingInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Confirmation modal states for mutating operations
  const [confirmPushOpen, setConfirmPushOpen] = useState(false);
  const [confirmPullOpen, setConfirmPullOpen] = useState(false);

  const showStatus = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  // Recovery only: the normal path authorizes Sheets during the main Google login.
  // This is used when a browser refresh has discarded the short-lived OAuth access token.
  const handleReconnectGoogle = async () => {
    setIsLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        onGoogleAuthSuccess(res.user, res.accessToken);
        showStatus('success', `Connected as ${res.user.email || 'Google User'}`);
      }
    } catch (err: any) {
      console.error('Google connect error:', err);
      showStatus('error', err.message || 'Failed to authenticate with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (
      window.confirm(
        'Disconnect Google Account? This will pause spreadsheet synchronization until you reconnect.'
      )
    ) {
      await googleSignOut();
      onGoogleSignOut();
      showStatus('info', 'Google account disconnected');
    }
  };

  // One-click create in user's Drive
  const handleCreateInDrive = async () => {
    if (!googleToken) {
      showStatus('error', 'Please connect your Google Account first');
      return;
    }

    setIsLoading(true);
    try {
      const title = `Personal Monthly Budget Planner - ${workbookData.settings.year}`;
      const created = await createBudgetSpreadsheet(googleToken, title);

      // Push current workbook data to initialize the new sheet
      await pushAllDataToGoogleSheet(googleToken, created.spreadsheetId, workbookData);

      const newConfig: GoogleSheetConfig = {
        spreadsheetId: created.spreadsheetId,
        spreadsheetTitle: created.title,
        spreadsheetUrl: created.spreadsheetUrl,
        autoSync: true,
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      onUpdateSheetConfig(newConfig);
      showStatus('success', 'Created & synced new Budget spreadsheet in your Google Drive!');
    } catch (err: any) {
      console.error('Create spreadsheet error:', err);
      showStatus('error', err.message || 'Failed to create spreadsheet');
    } finally {
      setIsLoading(false);
    }
  };

  // Link existing spreadsheet
  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleToken) {
      showStatus('error', 'Please connect your Google Account first');
      return;
    }

    const id = extractSpreadsheetId(existingInput);
    if (!id) {
      showStatus('error', 'Please enter a valid Google Spreadsheet ID or URL');
      return;
    }

    setIsLoading(true);
    try {
      const check = await verifySpreadsheet(googleToken, id);
      const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;

      const newConfig: GoogleSheetConfig = {
        spreadsheetId: id,
        spreadsheetTitle: check.title,
        spreadsheetUrl: url,
        autoSync: true,
        lastSyncedAt: null,
      };

      onUpdateSheetConfig(newConfig);
      setExistingInput('');
      showStatus('success', `Linked spreadsheet: "${check.title}"`);
    } catch (err: any) {
      console.error('Link spreadsheet error:', err);
      showStatus('error', err.message || 'Could not access spreadsheet. Check permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  // Unlink spreadsheet
  const handleUnlink = () => {
    if (window.confirm('Unlink this Google Spreadsheet from the app? Your spreadsheet will remain intact in Google Drive.')) {
      onUpdateSheetConfig(null);
      showStatus('info', 'Spreadsheet unlinked');
    }
  };

  // Push local changes to Google Sheet (mutating operation with user confirmation)
  const executePushToSheet = async () => {
    if (!googleToken || !sheetConfig) return;
    setConfirmPushOpen(false);
    setIsLoading(true);
    try {
      await pushAllDataToGoogleSheet(googleToken, sheetConfig.spreadsheetId, workbookData);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      onUpdateSheetConfig({ ...sheetConfig, lastSyncedAt: now });
      showStatus('success', `Pushed ${workbookData.incomeTransactions.length} income and ${workbookData.expenseTransactions.length} expense rows to Google Sheet!`);
    } catch (err: any) {
      console.error('Push error:', err);
      showStatus('error', err.message || 'Failed to push data to Google Sheet');
    } finally {
      setIsLoading(false);
    }
  };

  // Pull remote changes from Google Sheet (mutating operation with user confirmation)
  const executePullFromSheet = async () => {
    if (!googleToken || !sheetConfig) return;
    setConfirmPullOpen(false);
    setIsLoading(true);
    try {
      const pulled = await pullAllDataFromGoogleSheet(googleToken, sheetConfig.spreadsheetId);
      onDataPulled(pulled);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      onUpdateSheetConfig({ ...sheetConfig, lastSyncedAt: now });
      showStatus('success', 'Successfully imported latest budget records from Google Sheet!');
    } catch (err: any) {
      console.error('Pull error:', err);
      showStatus('error', err.message || 'Failed to pull data from Google Sheet');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 lg:p-6 shadow-xs">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3.5 gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Google Sheets & Drive Database
              </h3>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                Live DB
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure each user's personal Google Spreadsheet to store budget transactions & settings
            </p>
          </div>
        </div>

        {/* Google Authentication Pill */}
        <div className="w-full sm:w-auto shrink-0">
          {googleUser ? (
            <div className="flex items-center justify-between sm:justify-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs text-emerald-900">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </div>
                <span className="font-semibold truncate max-w-[170px] sm:max-w-[200px]">{googleUser.email}</span>
              </div>
              <button
                type="button"
                onClick={handleDisconnectGoogle}
                className="ml-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1 rounded-md"
                title="Disconnect Google Account"
              >
                <Unlink className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleReconnectGoogle}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 sm:py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.57 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>Reconnect Google Sheets access</span>
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          ) : (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Body */}
      {!googleUser ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5 sm:p-6 text-center">
          <HardDrive className="mx-auto h-10 w-10 text-slate-400 mb-2" />
          <h4 className="text-sm font-bold text-slate-800">
            Google Sheets access is not currently available
          </h4>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 leading-relaxed">
            Your Google account is already the app login. Google Sheets access is normally authorized during sign-in; reconnect only if the temporary API authorization has expired.
          </p>
          <button
            type="button"
            onClick={handleReconnectGoogle}
            disabled={isLoading}
            className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            <span>Reconnect Google Sheets</span>
          </button>
        </div>
      ) : sheetConfig ? (
        /* Connected Spreadsheet Panel */
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Active Connected Spreadsheet
                  </span>
                  {sheetConfig.lastSyncedAt && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      • Last synced at {sheetConfig.lastSyncedAt}
                    </span>
                  )}
                </div>
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 break-words">
                  {sheetConfig.spreadsheetTitle}
                </h4>
                <p className="font-mono text-[11px] sm:text-xs text-slate-500 break-all">
                  ID: {sheetConfig.spreadsheetId}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
                <a
                  href={sheetConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                </a>

                <button
                  type="button"
                  onClick={handleUnlink}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
                  title="Unlink spreadsheet"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  <span>Unlink</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sync Actions Grid */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            {/* Push to Sheet */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <ArrowUpFromLine className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Push Local Data to Google Sheet</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Overwrites the connected Google Spreadsheet with your app’s current {workbookData.incomeTransactions.length} income transactions, {workbookData.expenseTransactions.length} expenses, and settings.
              </p>
              <button
                type="button"
                onClick={() => setConfirmPushOpen(true)}
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2.5 sm:py-2 text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpFromLine className="h-3.5 w-3.5" />}
                <span>Push to Google Sheet</span>
              </button>
            </div>

            {/* Pull from Sheet */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <ArrowDownToLine className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Pull Data from Google Sheet</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Reads all rows from your Google Spreadsheet (`tbl_Income`, `tbl_Expenses`, `tbl_Settings`) and updates your local application view.
              </p>
              <button
                type="button"
                onClick={() => setConfirmPullOpen(true)}
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 sm:py-2 text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
                <span>Pull from Google Sheet</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Not linked yet: Choice of Create or Link */
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          {/* Option A: One-click Create */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold shrink-0">
                1
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Create New Sheet in Google Drive
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Instantly provisions a formatted spreadsheet in your Google Drive with all 5 ledger tabs (`tbl_Settings`, `tbl_Income`, `tbl_Expenses`, `tbl_MonthlyBudget`, `tbl_Categories`).
            </p>
            <button
              type="button"
              onClick={handleCreateInDrive}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Create Spreadsheet in My Drive</span>
            </button>
          </div>

          {/* Option B: Link Existing */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-700 text-white text-xs font-bold shrink-0">
                2
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Link Existing Google Spreadsheet
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Already have a Google Sheet? Paste the full Google Sheet link or spreadsheet ID to connect it.
            </p>
            <form onSubmit={handleLinkExisting} className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={existingInput}
                  onChange={(e) => setExistingInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !existingInput.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LinkIcon className="h-3.5 w-3.5" />}
                <span>Verify & Link Spreadsheet</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Push (Workspace Integration Policy Requirement) */}
      {confirmPushOpen && sheetConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <ArrowUpFromLine className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Update Google Spreadsheet?
                </h4>
                <p className="text-xs text-slate-500">
                  Confirmation required for mutating external spreadsheet data
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1.5">
              <p>
                Target Spreadsheet: <strong>{sheetConfig.spreadsheetTitle}</strong>
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                <li>{workbookData.incomeTransactions.length} Income transaction rows</li>
                <li>{workbookData.expenseTransactions.length} Expense transaction rows</li>
                <li>Settings: {workbookData.settings.currency}, {workbookData.settings.month} {workbookData.settings.year}</li>
              </ul>
              <p className="text-amber-700 font-medium pt-1">
                Existing rows in the spreadsheet's budget tabs will be updated with your current application workbook data.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPushOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePushToSheet}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                Confirm & Push Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Pull (Workspace Integration Policy Requirement) */}
      {confirmPullOpen && sheetConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <ArrowDownToLine className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Import from Google Spreadsheet?
                </h4>
                <p className="text-xs text-slate-500">
                  Confirmation required before replacing active workbook
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1.5">
              <p>
                Source Spreadsheet: <strong>{sheetConfig.spreadsheetTitle}</strong>
              </p>
              <p className="text-slate-600">
                This will read all records from <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">tbl_Income</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">tbl_Expenses</code>, and <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">tbl_Settings</code> from the spreadsheet and overwrite your local app session.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPullOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePullFromSheet}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                Confirm & Import Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
