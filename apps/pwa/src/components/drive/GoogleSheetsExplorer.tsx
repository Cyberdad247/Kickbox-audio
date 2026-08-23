'use client';

import type { User } from 'firebase/auth';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  initDriveAuth,
  signInWithGoogleDrive,
  signOutGoogleDrive,
} from '../../lib/googleDriveAuth';
import {
  type GeminiSheetAnalysis,
  type GoogleSpreadsheetMetadata,
  type GoogleSpreadsheetSheet,
  type GoogleValueRange,
  analyzeSpreadsheetWithGemini,
  appendSpreadsheetRow,
  createNewSpreadsheet,
  getSpreadsheetMetadata,
  getSpreadsheetValues,
  listGoogleSpreadsheets,
  updateSpreadsheetValues,
} from '../../lib/googleSheetsService';

export function GoogleSheetsExplorer() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Spreadsheets List
  const [spreadsheets, setSpreadsheets] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Active Selected Spreadsheet
  const [activeSpreadsheet, setActiveSpreadsheet] = useState<GoogleSpreadsheetMetadata | null>(
    null,
  );
  const [activeSheetName, setActiveSheetName] = useState<string>('Sheet1');
  const [sheetValues, setSheetValues] = useState<any[][]>([]);
  const [isLoadingValues, setIsLoadingValues] = useState(false);
  const [isSavingValues, setIsSavingValues] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Editing State
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [cellEditValue, setCellEditValue] = useState('');

  // Modals & New Spreadsheet State
  const [isNewSheetModalOpen, setIsNewSheetModalOpen] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState('');
  const [newSheetHeaderInput, setNewSheetHeaderInput] = useState(
    'Date, Category, Description, Amount, Status',
  );
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);

  // New Row Form
  const [isAddRowOpen, setIsAddRowOpen] = useState(false);
  const [newRowData, setNewRowData] = useState<string[]>([]);

  // Gemini AI Analysis State
  const [isAnalyzingSheet, setIsAnalyzingSheet] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<GeminiSheetAnalysis | null>(null);

  // View Mode: Grid Editor vs Embedded Docs View
  const [activeViewMode, setActiveViewMode] = useState<'grid' | 'embedded'>('grid');

  // Initialize Auth Listener
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        setAuthError(null);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      },
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Load Spreadsheets when token is ready
  const loadSpreadsheets = useCallback(async () => {
    if (!accessToken) return;
    setIsLoadingList(true);
    try {
      const files = await listGoogleSpreadsheets(accessToken);
      setSpreadsheets(files);
      if (files.length > 0 && !activeSpreadsheet) {
        // Auto-select first spreadsheet
        handleSelectSpreadsheet(files[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load spreadsheets:', err);
    } finally {
      setIsLoadingList(false);
    }
  }, [accessToken, activeSpreadsheet]);

  useEffect(() => {
    if (accessToken) {
      loadSpreadsheets();
    }
  }, [accessToken, loadSpreadsheets]);

  // Handle Google Sign-In
  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Google authentication failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    await signOutGoogleDrive();
    setCurrentUser(null);
    setAccessToken(null);
    setActiveSpreadsheet(null);
  };

  // Select Spreadsheet & Load Structure
  const handleSelectSpreadsheet = async (spreadsheetId: string) => {
    if (!accessToken) return;
    setIsLoadingValues(true);
    setAiAnalysis(null);
    try {
      const meta = await getSpreadsheetMetadata(accessToken, spreadsheetId);
      setActiveSpreadsheet(meta);
      const defaultSheet = meta.sheets[0]?.title || 'Sheet1';
      setActiveSheetName(defaultSheet);
      await loadSheetValues(spreadsheetId, defaultSheet);
    } catch (err: any) {
      alert(`Error loading spreadsheet: ${err.message}`);
    } finally {
      setIsLoadingValues(false);
    }
  };

  // Load Sheet Grid Values
  const loadSheetValues = async (spreadsheetId: string, sheetTitle: string) => {
    if (!accessToken) return;
    setIsLoadingValues(true);
    try {
      const range = `'${sheetTitle}'!A1:Z100`;
      const valRange = await getSpreadsheetValues(accessToken, spreadsheetId, range);
      const rows = valRange.values || [];
      setSheetValues(rows);
    } catch (err: any) {
      console.error('Failed to load sheet values:', err);
      setSheetValues([]);
    } finally {
      setIsLoadingValues(false);
    }
  };

  // Switch Sheet Tab inside active spreadsheet
  const handleSwitchSheetTab = (sheetTitle: string) => {
    if (!activeSpreadsheet) return;
    setActiveSheetName(sheetTitle);
    loadSheetValues(activeSpreadsheet.spreadsheetId, sheetTitle);
  };

  // Create New Spreadsheet
  const handleCreateSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newSheetTitle.trim()) return;
    setIsCreatingSheet(true);
    try {
      const headers = newSheetHeaderInput
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean);

      const created = await createNewSpreadsheet(accessToken, newSheetTitle.trim(), headers);
      setIsNewSheetModalOpen(false);
      setNewSheetTitle('');
      await loadSpreadsheets();
      await handleSelectSpreadsheet(created.spreadsheetId);
    } catch (err: any) {
      alert(`Failed to create spreadsheet: ${err.message}`);
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Commit Cell Edit
  const handleSaveCellEdit = () => {
    if (!editingCell) return;
    const { row, col } = editingCell;
    setSheetValues((prev) => {
      const next = prev.map((r) => [...r]);
      while (next.length <= row) next.push([]);
      while (next[row].length <= col) next[row].push('');
      next[row][col] = cellEditValue;
      return next;
    });
    setEditingCell(null);
    setCellEditValue('');
  };

  // Save Grid Values Back to Google Sheets
  const handleSaveChangesToGoogle = async () => {
    if (!accessToken || !activeSpreadsheet || !activeSheetName) return;
    setIsSavingValues(true);
    setSaveSuccessMsg(null);
    try {
      const range = `'${activeSheetName}'!A1`;
      await updateSpreadsheetValues(
        accessToken,
        activeSpreadsheet.spreadsheetId,
        range,
        sheetValues,
      );
      setSaveSuccessMsg('✨ All spreadsheet updates saved to Google Sheets!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Error saving to Google Sheets: ${err.message}`);
    } finally {
      setIsSavingValues(false);
    }
  };

  // Add New Row
  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !activeSpreadsheet) return;
    try {
      await appendSpreadsheetRow(
        accessToken,
        activeSpreadsheet.spreadsheetId,
        `'${activeSheetName}'!A1`,
        newRowData,
      );
      setIsAddRowOpen(false);
      setNewRowData([]);
      await loadSheetValues(activeSpreadsheet.spreadsheetId, activeSheetName);
    } catch (err: any) {
      alert(`Error appending row: ${err.message}`);
    }
  };

  // Run Gemini AI Analysis on Data
  const handleRunAIAnalysis = async () => {
    if (sheetValues.length === 0) return;
    setIsAnalyzingSheet(true);
    try {
      const headers = sheetValues[0] || [];
      const dataRows = sheetValues.slice(1);
      const title = activeSpreadsheet?.title || 'Spreadsheet Data';
      const result = await analyzeSpreadsheetWithGemini(title, headers, dataRows);
      setAiAnalysis(result);
    } catch (err: any) {
      alert(`Gemini analysis error: ${err.message}`);
    } finally {
      setIsAnalyzingSheet(false);
    }
  };

  // Filtered Spreadsheets List for Search
  const filteredSpreadsheets = useMemo(() => {
    if (!searchFilter.trim()) return spreadsheets;
    const term = searchFilter.toLowerCase();
    return spreadsheets.filter((s) => s.name?.toLowerCase().includes(term));
  }, [spreadsheets, searchFilter]);

  // Headers & Rows Split
  const headers = useMemo(() => sheetValues[0] || [], [sheetValues]);
  const dataRows = useMemo(() => sheetValues.slice(1), [sheetValues]);

  if (!accessToken || !currentUser) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-smoke-900/90 p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md my-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-3xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          📊
        </div>

        <h2 className="font-display text-2xl font-bold tracking-tight text-white mb-2">
          Google Sheets Cockpit — Camelot OS
        </h2>
        <p className="max-w-lg text-sm text-white/60 mb-6">
          Access, view, edit, create, and analyze Google Spreadsheets with integrated Gemini 3.7 AI
          Data Scientist capabilities.
        </p>

        {authError && (
          <div className="mb-6 w-full rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {authError}
          </div>
        )}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={isAuthenticating}
          className="group relative inline-flex items-center gap-3 rounded-full border border-white/20 bg-white px-6 py-3 font-sans text-sm font-medium text-gray-800 shadow-md transition-all hover:bg-gray-50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
          <span className="font-medium text-gray-700">
            {isAuthenticating ? 'Connecting...' : 'Connect Google Sheets'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-smoke-900/90 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xl text-emerald-400">
            📊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold text-white">Google Sheets Enclave</h3>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="font-mono text-[10px] text-white/50">{currentUser.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsNewSheetModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500 bg-emerald-600 px-3.5 py-1.5 font-mono text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            <span>➕</span>
            <span>New Spreadsheet</span>
          </button>

          <button
            type="button"
            onClick={loadSpreadsheets}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 hover:text-white"
            title="Refresh List"
          >
            🔄
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-xs text-red-300 hover:bg-red-500/20"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-[550px]">
        {/* Left Sidebar: Spreadsheets Selector */}
        <div className="lg:col-span-1 flex flex-col rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-mono text-xs font-bold text-white/80 uppercase tracking-wider">
              Your Spreadsheets
            </h4>
            <span className="font-mono text-[10px] text-emerald-400 font-bold">
              {spreadsheets.length}
            </span>
          </div>

          <input
            type="text"
            placeholder="Search sheets..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 font-mono text-xs text-white placeholder-white/30 focus:border-emerald-500 focus:outline-none"
          />

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[450px]">
            {isLoadingList ? (
              <div className="p-4 text-center font-mono text-xs text-white/40">
                Loading sheets...
              </div>
            ) : filteredSpreadsheets.length === 0 ? (
              <div className="p-4 text-center font-mono text-xs text-white/40">
                No spreadsheets found
              </div>
            ) : (
              filteredSpreadsheets.map((sheet) => {
                const isSelected = activeSpreadsheet?.spreadsheetId === sheet.id;
                return (
                  <button
                    key={sheet.id}
                    type="button"
                    onClick={() => handleSelectSpreadsheet(sheet.id)}
                    className={`w-full text-left rounded-xl p-3 font-mono text-xs transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'border border-emerald-500 bg-emerald-500/15 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] font-bold'
                        : 'border border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="text-base text-emerald-400">📊</span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-bold">{sheet.name}</div>
                      <div className="text-[9px] text-white/40 mt-0.5">
                        {sheet.modifiedTime
                          ? new Date(sheet.modifiedTime).toLocaleDateString()
                          : 'Updated recently'}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Panel: Editor / Interactive Grid */}
        <div className="lg:col-span-3 flex flex-col rounded-2xl border border-white/10 bg-smoke-900/90 p-4 space-y-3 min-h-[500px]">
          {activeSpreadsheet ? (
            <>
              {/* Active Spreadsheet Header & Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl">📊</span>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-white truncate">
                      {activeSpreadsheet.title}
                    </h3>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-white/50">
                      <span>ID: {activeSpreadsheet.spreadsheetId.slice(0, 12)}...</span>
                      <a
                        href={activeSpreadsheet.spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span>Open in Google Drive</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunAIAnalysis}
                    disabled={isAnalyzingSheet || sheetValues.length === 0}
                    className="flex items-center gap-1.5 rounded-xl border border-gold bg-gold/20 px-3 py-1.5 font-mono text-xs font-bold text-gold-light hover:bg-gold/30 transition-all shadow-[0_0_12px_rgba(255,215,0,0.2)] disabled:opacity-50"
                  >
                    <span>{isAnalyzingSheet ? '🌀' : '✨'}</span>
                    <span>{isAnalyzingSheet ? 'Analyzing...' : 'Gemini AI Data Scientist'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveChangesToGoogle}
                    disabled={isSavingValues}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-500 bg-emerald-600 px-3 py-1.5 font-mono text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-[0_0_10px_rgba(16,185,129,0.3)] disabled:opacity-50"
                  >
                    <span>{isSavingValues ? '⏳' : '💾'}</span>
                    <span>{isSavingValues ? 'Saving...' : 'Save Changes'}</span>
                  </button>

                  <div className="h-5 w-px bg-white/10 mx-1" />

                  <button
                    type="button"
                    onClick={() =>
                      setActiveViewMode(activeViewMode === 'grid' ? 'embedded' : 'grid')
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-white/70 hover:text-white"
                  >
                    {activeViewMode === 'grid' ? '🖥️ Desktop Web View' : '🔲 Grid Editor'}
                  </button>
                </div>
              </div>

              {saveSuccessMsg && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 font-mono text-xs text-emerald-300 animate-pulse">
                  {saveSuccessMsg}
                </div>
              )}

              {/* Sheets Tab Bar */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {activeSpreadsheet.sheets.map((sheet) => (
                    <button
                      key={sheet.sheetId}
                      type="button"
                      onClick={() => handleSwitchSheetTab(sheet.title)}
                      className={`rounded-lg px-3 py-1 font-mono text-xs transition-all ${
                        activeSheetName === sheet.title
                          ? 'border border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'border border-white/10 bg-white/5 text-white/50 hover:text-white'
                      }`}
                    >
                      {sheet.title}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (headers.length > 0) {
                        setNewRowData(new Array(headers.length).fill(''));
                        setIsAddRowOpen(true);
                      }
                    }}
                    className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/80 hover:bg-white/10"
                  >
                    ➕ Add Row
                  </button>
                </div>
              </div>

              {/* Gemini AI Analysis Banner */}
              {aiAnalysis && (
                <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4 font-mono text-xs text-gold-light space-y-3">
                  <div className="flex items-center justify-between border-b border-gold/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">✨</span>
                      <span className="font-bold text-white text-sm">
                        Gemini 3.7 AI Data Intelligence
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiAnalysis(null)}
                      className="text-gold hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-white/90 leading-relaxed text-[11px]">{aiAnalysis.summary}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="rounded-xl border border-white/10 bg-black/50 p-3 space-y-1.5">
                      <h5 className="font-bold text-white text-[10px] uppercase tracking-wider text-emerald-400">
                        📌 Key Insights & Highlights
                      </h5>
                      <ul className="space-y-1 text-[11px] text-white/70">
                        {aiAnalysis.keyHighlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-gold">•</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/50 p-3 space-y-1.5">
                      <h5 className="font-bold text-white text-[10px] uppercase tracking-wider text-[#00F0FF]">
                        💡 Recommended Actions
                      </h5>
                      <ul className="space-y-1 text-[11px] text-white/70">
                        {aiAnalysis.suggestedActionItems.map((a, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-[#00F0FF]">•</span>
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive View Area */}
              {activeViewMode === 'embedded' ? (
                <div className="flex-1 rounded-xl border border-white/10 overflow-hidden bg-white min-h-[450px]">
                  <iframe
                    src={`https://docs.google.com/spreadsheets/d/${activeSpreadsheet.spreadsheetId}/edit?rm=minimal`}
                    className="w-full h-full min-h-[450px] border-0"
                    title={activeSpreadsheet.title}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-black/60 p-2 min-h-[350px]">
                  {isLoadingValues ? (
                    <div className="flex h-64 flex-col items-center justify-center gap-2 font-mono text-xs text-white/50">
                      <span className="text-3xl animate-spin">🌀</span>
                      <span>Loading sheet values...</span>
                    </div>
                  ) : sheetValues.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center gap-2 font-mono text-xs text-white/40">
                      <span>Empty sheet or range</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSheetValues([
                            ['Header 1', 'Header 2', 'Header 3'],
                            ['Data 1', '100', 'Active'],
                          ]);
                        }}
                        className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-300"
                      >
                        Initialize Table Template
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse font-mono text-xs text-left">
                        <thead>
                          <tr className="border-b border-white/20 bg-white/5 text-emerald-400 font-bold">
                            <th className="p-2 w-10 text-center border-r border-white/10 text-[10px] text-white/30">
                              #
                            </th>
                            {headers.map((h, colIdx) => (
                              <th
                                key={colIdx}
                                className="p-2 border-r border-white/10 min-w-[120px]"
                              >
                                {h || `Column ${colIdx + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {dataRows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-white/[0.02] transition-colors">
                              <td className="p-2 text-center border-r border-white/10 text-[10px] text-white/30 font-bold">
                                {rowIdx + 2}
                              </td>
                              {headers.map((_, colIdx) => {
                                const isEditing =
                                  editingCell?.row === rowIdx + 1 && editingCell?.col === colIdx;
                                const cellVal = row[colIdx] || '';

                                return (
                                  <td
                                    key={colIdx}
                                    onClick={() => {
                                      setEditingCell({ row: rowIdx + 1, col: colIdx });
                                      setCellEditValue(String(cellVal));
                                    }}
                                    className="p-2 border-r border-white/10 min-w-[120px] cursor-pointer hover:bg-emerald-500/10 transition-colors"
                                  >
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={cellEditValue}
                                        onChange={(e) => setCellEditValue(e.target.value)}
                                        onBlur={handleSaveCellEdit}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveCellEdit();
                                        }}
                                        autoFocus
                                        className="w-full bg-black border border-emerald-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                                      />
                                    ) : (
                                      <span
                                        className={
                                          cellVal ? 'text-white/90' : 'text-white/20 italic'
                                        }
                                      >
                                        {cellVal || 'empty'}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full min-h-[450px] flex-col items-center justify-center text-center p-8 text-white/50">
              <span className="text-5xl mb-3 opacity-40">📊</span>
              <h3 className="font-display text-lg font-bold text-white mb-1">
                No Spreadsheet Selected
              </h3>
              <p className="max-w-md text-xs text-white/50 mb-6">
                Select a Google Spreadsheet from the left sidebar or create a new one to begin
                editing and analyzing data.
              </p>
              <button
                type="button"
                onClick={() => setIsNewSheetModalOpen(true)}
                className="rounded-xl border border-emerald-500 bg-emerald-600 px-4 py-2 font-mono text-xs font-bold text-white hover:bg-emerald-500"
              >
                Create New Google Spreadsheet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Spreadsheet */}
      {isNewSheetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateSpreadsheet}
            className="w-full max-w-md rounded-2xl border border-emerald-500/40 bg-smoke-900 p-6 shadow-[0_10px_50px_rgba(16,185,129,0.3)]"
          >
            <h3 className="font-display text-lg font-bold text-white mb-2">
              Create Google Spreadsheet
            </h3>
            <p className="text-xs text-white/50 mb-4">Saved directly to your Google Drive root</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="font-mono text-[10px] text-white/60 uppercase">
                  Spreadsheet Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Financial Ledger..."
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  autoFocus
                  className="w-full mt-1 rounded-xl border border-white/20 bg-black/60 px-3 py-2 font-mono text-xs text-white placeholder-white/30 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-white/60 uppercase">
                  Header Columns (Comma-separated)
                </label>
                <input
                  type="text"
                  value={newSheetHeaderInput}
                  onChange={(e) => setNewSheetHeaderInput(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-white/20 bg-black/60 px-3 py-2 font-mono text-xs text-white placeholder-white/30 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNewSheetModalOpen(false)}
                className="rounded-xl border border-white/20 px-4 py-2 font-mono text-xs text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newSheetTitle.trim() || isCreatingSheet}
                className="rounded-xl border border-emerald-500 bg-emerald-600 px-4 py-2 font-mono text-xs font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {isCreatingSheet ? 'Creating...' : 'Create Spreadsheet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Row */}
      {isAddRowOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddRow}
            className="w-full max-w-lg rounded-2xl border border-emerald-500/40 bg-smoke-900 p-6 shadow-[0_10px_50px_rgba(0,0,0,0.8)]"
          >
            <h3 className="font-display text-lg font-bold text-white mb-2">Append New Row</h3>
            <p className="text-xs text-white/50 mb-4">Adding to sheet: {activeSheetName}</p>

            <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-1">
              {headers.map((h, i) => (
                <div key={i}>
                  <label className="font-mono text-[10px] text-emerald-400 font-bold uppercase">
                    {h}
                  </label>
                  <input
                    type="text"
                    value={newRowData[i] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewRowData((prev) => {
                        const next = [...prev];
                        next[i] = val;
                        return next;
                      });
                    }}
                    className="w-full mt-0.5 rounded-xl border border-white/20 bg-black/60 px-3 py-1.5 font-mono text-xs text-white placeholder-white/30 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddRowOpen(false)}
                className="rounded-xl border border-white/20 px-4 py-2 font-mono text-xs text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl border border-emerald-500 bg-emerald-600 px-4 py-2 font-mono text-xs font-bold text-white hover:bg-emerald-500 transition-colors"
              >
                Append Row
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
