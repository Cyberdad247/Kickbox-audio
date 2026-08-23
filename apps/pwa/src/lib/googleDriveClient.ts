/**
 * Google Drive API Client & Service Utility
 * Initialized with OAuth Client ID and credentials from firebase-applet-config.json
 */

import firebaseAppletConfig from '../../../../firebase-applet-config.json';
import {
  signInWithGoogleDrive,
  getDriveAccessToken,
  signOutGoogleDrive,
  DRIVE_SCOPES,
} from './googleDriveAuth';
import type { DriveFile } from './googleDriveService';

export interface GoogleDriveConfig {
  clientId: string;
  projectId: string;
  apiKey: string;
  authDomain: string;
  scopes: string[];
}

export interface RecentRootMediaFile extends DriveFile {
  category: 'audio' | 'text' | 'markdown' | 'mp4' | 'other';
  formattedSize: string;
  formattedDate: string;
}

export interface ListRecentRootFilesOptions {
  pageSize?: number;
  pageToken?: string;
  categoryFilter?: 'all' | 'audio' | 'text' | 'markdown' | 'mp4';
}

export interface ListRecentRootFilesResult {
  files: RecentRootMediaFile[];
  nextPageToken?: string;
  totalCount: number;
}

/**
 * Retrieves the Google Drive OAuth configuration loaded from firebase-applet-config.json
 */
export function getGoogleDriveClientConfig(): GoogleDriveConfig {
  const { oAuthClientId, projectId, apiKey, authDomain } = firebaseAppletConfig;

  if (!oAuthClientId) {
    console.warn(
      '[GoogleDriveClient] Warning: oAuthClientId is not set in firebase-applet-config.json'
    );
  }

  return {
    clientId: oAuthClientId,
    projectId,
    apiKey,
    authDomain,
    scopes: DRIVE_SCOPES,
  };
}

/**
 * Initializes the Google Drive API Client using the OAuth client ID.
 * Returns the client configuration and authentication status.
 */
export function initGoogleDriveApi(): {
  config: GoogleDriveConfig;
  getAccessToken: () => string | null;
  signIn: typeof signInWithGoogleDrive;
  signOut: typeof signOutGoogleDrive;
} {
  const config = getGoogleDriveClientConfig();

  return {
    config,
    getAccessToken: getDriveAccessToken,
    signIn: signInWithGoogleDrive,
    signOut: signOutGoogleDrive,
  };
}

/**
 * Formats byte size into human readable string
 */
function formatFileSize(bytes?: string | number): string {
  if (!bytes) return '—';
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(num) || num === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Determines file category from MIME type and filename
 */
function determineFileCategory(
  mimeType: string,
  fileName: string
): 'audio' | 'text' | 'markdown' | 'mp4' | 'other' {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (
    lowerMime.includes('audio/') ||
    lowerName.endsWith('.mp3') ||
    lowerName.endsWith('.wav') ||
    lowerName.endsWith('.m4a') ||
    lowerName.endsWith('.ogg') ||
    lowerName.endsWith('.flac') ||
    lowerName.endsWith('.aac')
  ) {
    return 'audio';
  }

  if (
    lowerMime === 'video/mp4' ||
    lowerName.endsWith('.mp4') ||
    lowerName.endsWith('.m4v')
  ) {
    return 'mp4';
  }

  if (
    lowerMime === 'text/markdown' ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.markdown')
  ) {
    return 'markdown';
  }

  if (
    lowerMime === 'text/plain' ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.log') ||
    lowerName.endsWith('.json') ||
    lowerName.endsWith('.csv')
  ) {
    return 'text';
  }

  return 'other';
}

/**
 * Lists recent audio files, text files, .md files, and .mp4 files directly from the user's root folder.
 *
 * Query construction strictly adheres to Google Drive API v3:
 * - Root folder: `'root' in parents and trashed = false`
 * - Filter: audio files, text/plain, text/markdown, .md, video/mp4, and .mp4 files
 * - Order: `modifiedTime desc` (most recent first)
 */
export async function listRecentRootFiles(
  accessToken?: string,
  options?: ListRecentRootFilesOptions
): Promise<ListRecentRootFilesResult> {
  const token = accessToken || getDriveAccessToken();

  if (!token) {
    throw new Error(
      'Google Drive OAuth token not available. Please sign in with Google first.'
    );
  }

  const { pageSize = 50, pageToken, categoryFilter = 'all' } = options || {};

  // Build query clauses
  const baseClauses = ["'root' in parents", 'trashed = false'];

  let typeFilterQuery = '';

  if (categoryFilter === 'audio') {
    typeFilterQuery = "mimeType contains 'audio/'";
  } else if (categoryFilter === 'text') {
    typeFilterQuery = "(mimeType = 'text/plain' or name contains '.txt')";
  } else if (categoryFilter === 'markdown') {
    typeFilterQuery = "(mimeType = 'text/markdown' or name contains '.md')";
  } else if (categoryFilter === 'mp4') {
    typeFilterQuery = "(mimeType = 'video/mp4' or name contains '.mp4')";
  } else {
    // Default: Audio files, Text files, .md files, and .mp4 files
    typeFilterQuery =
      "(mimeType contains 'audio/' or mimeType = 'text/plain' or mimeType = 'text/markdown' or name contains '.txt' or name contains '.md' or mimeType = 'video/mp4' or name contains '.mp4')";
  }

  const queryParts = [...baseClauses, typeFilterQuery];
  const q = queryParts.join(' and ');

  const fields =
    'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, iconLink, thumbnailLink, webViewLink, webContentLink, owners, shared, trashed, parents)';

  const params = new URLSearchParams({
    q,
    pageSize: pageSize.toString(),
    fields,
    orderBy: 'modifiedTime desc',
  });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage =
      errorBody.error?.message ||
      `Google Drive API error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const rawFiles: DriveFile[] = data.files || [];

  const enhancedFiles: RecentRootMediaFile[] = rawFiles.map((file) => {
    const category = determineFileCategory(file.mimeType, file.name);
    return {
      ...file,
      category,
      formattedSize: formatFileSize(file.size),
      formattedDate: file.modifiedTime
        ? new Date(file.modifiedTime).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—',
    };
  });

  return {
    files: enhancedFiles,
    nextPageToken: data.nextPageToken,
    totalCount: enhancedFiles.length,
  };
}

/**
 * Convenience helper: List recent audio files from root folder
 */
export async function listRecentRootAudioFiles(
  accessToken?: string,
  pageSize = 25
): Promise<ListRecentRootFilesResult> {
  return listRecentRootFiles(accessToken, { pageSize, categoryFilter: 'audio' });
}

/**
 * Convenience helper: List recent text & markdown notes from root folder
 */
export async function listRecentRootTextAndMarkdownFiles(
  accessToken?: string,
  pageSize = 25
): Promise<ListRecentRootFilesResult> {
  const token = accessToken || getDriveAccessToken();
  const [textResult, mdResult] = await Promise.all([
    listRecentRootFiles(token, { pageSize, categoryFilter: 'text' }),
    listRecentRootFiles(token, { pageSize, categoryFilter: 'markdown' }),
  ]);

  const combined = [...textResult.files, ...mdResult.files].sort((a, b) => {
    const dateA = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
    const dateB = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
    return dateB - dateA;
  });

  return {
    files: combined.slice(0, pageSize),
    totalCount: combined.length,
  };
}

/**
 * Convenience helper: List recent MP4 video recordings from root folder
 */
export async function listRecentRootMp4Videos(
  accessToken?: string,
  pageSize = 25
): Promise<ListRecentRootFilesResult> {
  return listRecentRootFiles(accessToken, { pageSize, categoryFilter: 'mp4' });
}
