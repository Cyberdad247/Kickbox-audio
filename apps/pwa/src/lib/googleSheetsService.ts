'use client';

export interface GoogleSpreadsheetSheet {
  sheetId: number;
  title: string;
  index: number;
  sheetType: string;
  gridProperties?: {
    rowCount: number;
    columnCount: number;
  };
}

export interface GoogleSpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: GoogleSpreadsheetSheet[];
}

export interface GoogleValueRange {
  range: string;
  majorDimension?: 'ROWS' | 'COLUMNS';
  values?: any[][];
}

export interface GeminiSheetAnalysis {
  summary: string;
  columnStats: { column: string; type: string; keyInsight: string }[];
  keyHighlights: string[];
  suggestedActionItems: string[];
}

/**
 * List spreadsheets from Google Drive
 */
export async function listGoogleSpreadsheets(accessToken: string): Promise<any[]> {
  const q = "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
  const params = new URLSearchParams({
    q,
    pageSize: '50',
    fields: 'files(id, name, mimeType, size, modifiedTime, createdTime, description, webViewLink, iconLink)',
    orderBy: 'modifiedTime desc',
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to list spreadsheets (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Fetch Google Spreadsheet structure & sheets metadata
 */
export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<GoogleSpreadsheetMetadata> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,spreadsheetUrl,sheets.properties`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch spreadsheet structure (${res.status})`);
  }

  const raw = await res.json();
  return {
    spreadsheetId: raw.spreadsheetId,
    title: raw.properties?.title || 'Untitled Spreadsheet',
    spreadsheetUrl: raw.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheets: (raw.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title || 'Sheet1',
      index: s.properties?.index || 0,
      sheetType: s.properties?.sheetType || 'GRID',
      gridProperties: s.properties?.gridProperties,
    })),
  };
}

/**
 * Fetch values for a sheet range (e.g. 'Sheet1!A1:Z100')
 */
export async function getSpreadsheetValues(
  accessToken: string,
  spreadsheetId: string,
  range = 'Sheet1!A1:Z100'
): Promise<GoogleValueRange> {
  const encodedRange = encodeURIComponent(range);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch spreadsheet range ${range} (${res.status})`);
  }

  return res.json();
}

/**
 * Update cell values in a range
 */
export async function updateSpreadsheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> {
  const encodedRange = encodeURIComponent(range);
  const body = {
    range,
    majorDimension: 'ROWS',
    values,
  };

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to update spreadsheet range (${res.status})`);
  }

  return res.json();
}

/**
 * Append row(s) to a spreadsheet table
 */
export async function appendSpreadsheetRow(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  rowValues: any[]
): Promise<any> {
  const encodedRange = encodeURIComponent(range);
  const body = {
    range,
    majorDimension: 'ROWS',
    values: [rowValues],
  };

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to append row to spreadsheet (${res.status})`);
  }

  return res.json();
}

/**
 * Create a new empty or pre-populated Google Spreadsheet
 */
export async function createNewSpreadsheet(
  accessToken: string,
  title: string,
  initialHeaders?: string[],
  initialRows?: any[][]
): Promise<GoogleSpreadsheetMetadata> {
  const sheets: any[] = [
    {
      properties: {
        title: 'Sheet1',
      },
    },
  ];

  if (initialHeaders && initialHeaders.length > 0) {
    const rows = [initialHeaders, ...(initialRows || [])];
    sheets[0].data = [
      {
        startRow: 0,
        startColumn: 0,
        rowData: rows.map((r) => ({
          values: r.map((cell) => ({
            userEnteredValue: { stringValue: String(cell) },
          })),
        })),
      },
    ];
  }

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create new Google Spreadsheet (${res.status})`);
  }

  const raw = await res.json();
  return {
    spreadsheetId: raw.spreadsheetId,
    title: raw.properties?.title || title,
    spreadsheetUrl: raw.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${raw.spreadsheetId}/edit`,
    sheets: (raw.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title || 'Sheet1',
      index: s.properties?.index || 0,
      sheetType: s.properties?.sheetType || 'GRID',
      gridProperties: s.properties?.gridProperties,
    })),
  };
}

/**
 * Perform AI analysis on spreadsheet data using Gemini
 */
export async function analyzeSpreadsheetWithGemini(
  spreadsheetTitle: string,
  headers: string[],
  rows: any[][]
): Promise<GeminiSheetAnalysis> {
  const sampledRows = rows.slice(0, 30);
  const prompt = `You are a Senior Data Analyst AI in Camelot OS. Analyze the following Google Spreadsheet dataset:
Spreadsheet Title: "${spreadsheetTitle}"
Headers: ${JSON.stringify(headers)}
Data Rows (Sample of ${sampledRows.length} rows):
${JSON.stringify(sampledRows, null, 2)}

Provide a structured analysis JSON object with:
1. "summary": A 2-3 sentence high-level summary of what this dataset contains and key trends.
2. "columnStats": Array of objects for key columns with { "column": name, "type": data type, "keyInsight": key statistical or qualitative observation }.
3. "keyHighlights": Array of 3-5 bullet point highlights/outliers/patterns.
4. "suggestedActionItems": Array of 2-3 recommended actions or formulas to improve or analyze this data further.

Return ONLY valid JSON matching this schema with no markdown formatting surrounding it.`;

  try {
    const res = await fetch('/api/gemini/analyze-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, spreadsheetTitle }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback client-side analysis
  }

  // Fallback client-side analysis if backend endpoint is unavailable
  return {
    summary: `Dataset "${spreadsheetTitle}" contains ${headers.length} columns and ${rows.length} rows of records.`,
    columnStats: headers.map((h, i) => {
      const sampleVals = rows.map((r) => r[i]).filter(Boolean);
      const isNum = sampleVals.every((v) => !isNaN(Number(v)));
      return {
        column: h,
        type: isNum ? 'Numeric' : 'Text/Categorical',
        keyInsight: isNum
          ? `Contains numeric values across ${sampleVals.length} non-empty cells.`
          : `Categorical data with ${new Set(sampleVals).size} distinct values.`,
      };
    }),
    keyHighlights: [
      `Total records: ${rows.length}`,
      `Total attributes: ${headers.length}`,
      `Data structure verified and ready for formulas or chart visualizations.`,
    ],
    suggestedActionItems: [
      `Add summary row with SUM or AVERAGE formulas for numeric columns.`,
      `Export clean data to CSV or connect to automated workflow.`,
    ],
  };
}
