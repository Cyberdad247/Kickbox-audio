export interface GeminiAudioAnalysis {
  suggestedFilename: string;
  shortSummary: string;
  keyTopics: string[];
  speakerOrTone: string;
  bulletPoints: string[];
  modelUsed?: string;
  warning?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  description?: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  owners?: Array<{ displayName: string; emailAddress: string; photoLink?: string }>;
  shared?: boolean;
  trashed?: boolean;
  parents?: string[];
  aiAnalysis?: GeminiAudioAnalysis;
}

export interface DriveAboutInfo {
  user: {
    displayName: string;
    emailAddress: string;
    photoLink?: string;
  };
  storageQuota: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
    usageInDriveTrash?: string;
  };
}

/**
 * Checks if a filename or MIME type corresponds to an audio track
 */
export function isAudioFile(file: { name: string; mimeType?: string }): boolean {
  const mime = (file.mimeType || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  if (mime.includes('audio/') || mime === 'application/ogg') return true;
  return /\.(mp3|wav|m4a|ogg|flac|aac|webm|opus|wma|aiff)$/i.test(name);
}

/**
 * Calls the server-side Gemini 3.7 Flash API to analyze audio and generate descriptive filename & summary
 */
export async function analyzeAudioWithGemini(
  audioBlobOrFile: Blob | File,
  originalFilename?: string
): Promise<GeminiAudioAnalysis> {
  const filename = originalFilename || (audioBlobOrFile instanceof File ? audioBlobOrFile.name : 'audio_recording.mp3');
  const formData = new FormData();
  formData.append('audio', audioBlobOrFile, filename);
  formData.append('originalFilename', filename);
  formData.append('mimeType', audioBlobOrFile.type || 'audio/mp3');

  const res = await fetch('/api/gemini/describe-audio', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Gemini audio analysis failed (${res.status})`);
  }

  return res.json();
}

/**
 * Downloads a binary file from Google Drive
 */
export async function downloadDriveFileBlob(accessToken: string, fileId: string): Promise<Blob> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to download file from Google Drive (${res.status})`);
  }
  return res.blob();
}

export async function fetchDriveAbout(accessToken: string): Promise<DriveAboutInfo> {
  const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch Google Drive user details (${res.status})`);
  }
  return res.json();
}

export async function listDriveFiles(
  accessToken: string,
  options?: {
    parentId?: string;
    searchQuery?: string;
    fileCategory?: 'all' | 'folders' | 'docs' | 'sheets' | 'slides' | 'media' | 'pdf';
    pageSize?: number;
    pageToken?: string;
  }
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const { parentId = 'root', searchQuery = '', fileCategory = 'all', pageSize = 50, pageToken } = options || {};

  const clauses: string[] = ['trashed = false'];

  if (searchQuery.trim()) {
    const escaped = searchQuery.replace(/'/g, "\\'");
    clauses.push(`name contains '${escaped}'`);
  } else if (parentId) {
    clauses.push(`'${parentId}' in parents`);
  }

  if (fileCategory === 'folders') {
    clauses.push("mimeType = 'application/vnd.google-apps.folder'");
  } else if (fileCategory === 'docs') {
    clauses.push("mimeType = 'application/vnd.google-apps.document'");
  } else if (fileCategory === 'sheets') {
    clauses.push("mimeType = 'application/vnd.google-apps.spreadsheet'");
  } else if (fileCategory === 'slides') {
    clauses.push("mimeType = 'application/vnd.google-apps.presentation'");
  } else if (fileCategory === 'pdf') {
    clauses.push("mimeType = 'application/pdf'");
  } else if (fileCategory === 'media') {
    clauses.push("(mimeType contains 'image/' or mimeType contains 'video/' or mimeType contains 'audio/')");
  }

  const q = clauses.join(' and ');
  const fields = 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, description, iconLink, thumbnailLink, webViewLink, webContentLink, owners, shared, trashed, parents)';
  const params = new URLSearchParams({
    q,
    pageSize: pageSize.toString(),
    fields,
    orderBy: 'folder,modifiedTime desc',
  });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to query Google Drive files (${res.status})`);
  }

  return res.json();
}

export async function createDriveFolder(
  accessToken: string,
  name: string,
  parentId = 'root'
): Promise<DriveFile> {
  const body = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  };

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create folder on Google Drive (${res.status})`);
  }

  return res.json();
}

export async function uploadDriveFile(
  accessToken: string,
  file: File,
  parentId = 'root',
  customMetadata?: { name?: string; description?: string }
): Promise<DriveFile> {
  const metadata = {
    name: customMetadata?.name || file.name,
    description: customMetadata?.description,
    mimeType: file.type || 'application/octet-stream',
    parents: [parentId],
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,description,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to upload file to Google Drive (${res.status})`);
  }

  return res.json();
}

/**
 * High-level orchestration: Uploads audio file to Google Drive, analyzes it via Gemini,
 * sets the descriptive filename & description summary, and optionally writes a companion .summary.md
 */
export async function uploadAndAnalyzeDriveAudio(
  accessToken: string,
  file: File,
  options?: {
    parentId?: string;
    createCompanionNote?: boolean;
    autoRename?: boolean;
    onProgress?: (status: string) => void;
  }
): Promise<{ file: DriveFile; companionNote?: DriveFile; analysis: GeminiAudioAnalysis }> {
  const {
    parentId = 'root',
    createCompanionNote = true,
    autoRename = true,
    onProgress,
  } = options || {};

  onProgress?.('Uploading audio to Google Drive...');
  const uploadedFile = await uploadDriveFile(accessToken, file, parentId);

  onProgress?.('✨ Gemini 3.7 Flash analyzing audio track & generating summary...');
  let analysis: GeminiAudioAnalysis;
  try {
    analysis = await analyzeAudioWithGemini(file, file.name);
  } catch (err: any) {
    console.error('Gemini audio analysis error:', err);
    analysis = {
      suggestedFilename: file.name,
      shortSummary: `Audio file uploaded to Google Drive. (Analysis pending: ${err?.message || 'timeout'})`,
      keyTopics: ['Audio', 'Recording'],
      speakerOrTone: 'Standard Recording',
      bulletPoints: ['File uploaded to sovereign enclave'],
    };
  }

  // Format description for Google Drive metadata
  const descriptionBody = [
    `✨ AI Summary (Gemini 3.7 Flash):`,
    analysis.shortSummary,
    ``,
    `🏷️ Key Topics: ${analysis.keyTopics.join(', ')}`,
    `🎙️ Speaker/Tone: ${analysis.speakerOrTone}`,
    analysis.bulletPoints.length > 0 ? `\n📌 Highlights:\n${analysis.bulletPoints.map((b) => `• ${b}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');

  const finalName = autoRename && analysis.suggestedFilename ? analysis.suggestedFilename : file.name;

  onProgress?.('Updating Google Drive metadata & descriptive name...');
  const updatedFile = await updateDriveFileMetadata(accessToken, uploadedFile.id, {
    name: finalName,
    description: descriptionBody,
  });
  updatedFile.aiAnalysis = analysis;

  let companionNote: DriveFile | undefined;
  if (createCompanionNote) {
    try {
      onProgress?.('Generating companion summary markdown document...');
      const markdownContent = `# ${finalName} — Audio Analysis & Summary\n\n` +
        `**Generated by:** Gemini 3.7 Flash • Sovereign Audio Enclave\n` +
        `**Date:** ${new Date().toLocaleString()}\n` +
        `**Original File:** \`${file.name}\` (${(file.size / 1024 / 1024).toFixed(2)} MB)\n\n` +
        `---\n\n` +
        `## 📝 Summary\n` +
        `${analysis.shortSummary}\n\n` +
        `## 🏷️ Key Topics\n` +
        analysis.keyTopics.map((t) => `- \`${t}\``).join('\n') + `\n\n` +
        `## 🎙️ Tone & Format\n` +
        `${analysis.speakerOrTone}\n\n` +
        `## 📌 Key Highlights\n` +
        analysis.bulletPoints.map((b) => `- ${b}`).join('\n') + `\n\n` +
        `---\n` +
        `*Synced via Camelot OS Google Drive Integration.*`;

      const noteName = `${finalName.replace(/\.[^/.]+$/, '')}.summary.md`;
      companionNote = await createTextDriveDocument(accessToken, noteName, markdownContent, parentId);
    } catch (noteErr) {
      console.warn('Failed to create companion note:', noteErr);
    }
  }

  onProgress?.('Complete!');
  return { file: updatedFile, companionNote, analysis };
}

export async function createTextDriveDocument(
  accessToken: string,
  name: string,
  content: string,
  parentId = 'root'
): Promise<DriveFile> {
  const metadata = {
    name: name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.json') ? name : `${name}.txt`,
    mimeType: 'text/plain',
    parents: [parentId],
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', new Blob([content], { type: 'text/plain' }));

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create text document on Google Drive (${res.status})`);
  }

  return res.json();
}

export async function updateDriveFileMetadata(
  accessToken: string,
  fileId: string,
  metadata: { name?: string; description?: string }
): Promise<DriveFile> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,description,webViewLink,modifiedTime`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to update Google Drive file metadata (${res.status})`);
  }

  return res.json();
}

export async function renameDriveFile(
  accessToken: string,
  fileId: string,
  newName: string
): Promise<DriveFile> {
  return updateDriveFileMetadata(accessToken, fileId, { name: newName });
}

export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to delete file from Google Drive (${res.status})`);
  }
}

/**
 * Moves a file or folder to a new destination folder in Google Drive
 */
export async function moveDriveFile(
  accessToken: string,
  fileId: string,
  newParentId: string,
  oldParentId?: string
): Promise<DriveFile> {
  // If oldParentId is not provided, fetch current parents first
  let removeParents = oldParentId;
  if (!removeParents) {
    try {
      const infoRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (infoRes.ok) {
        const info = await infoRes.json();
        if (info.parents && info.parents.length > 0) {
          removeParents = info.parents.join(',');
        }
      }
    } catch {
      // ignore, proceed with addParents
    }
  }

  const queryParams = new URLSearchParams({
    addParents: newParentId,
    fields: 'id,name,mimeType,parents,size,webViewLink,modifiedTime,description',
  });
  if (removeParents) {
    queryParams.set('removeParents', removeParents);
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?${queryParams.toString()}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to move file to folder in Google Drive (${res.status})`);
  }

  return res.json();
}

/**
 * Batch Move multiple files or audio tracks to a destination folder
 */
export async function batchMoveDriveFiles(
  accessToken: string,
  fileIds: string[],
  newParentId: string,
  oldParentId?: string,
  onProgress?: (completed: number, total: number, currentName?: string) => void
): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
  const success: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (let i = 0; i < fileIds.length; i++) {
    const fileId = fileIds[i];
    try {
      onProgress?.(i, fileIds.length);
      await moveDriveFile(accessToken, fileId, newParentId, oldParentId);
      success.push(fileId);
    } catch (err: any) {
      failed.push({ id: fileId, error: err.message || 'Move failed' });
    }
  }
  onProgress?.(fileIds.length, fileIds.length);

  return { success, failed };
}

/**
 * Batch Delete multiple files or audio tracks with progress tracking
 */
export async function batchDeleteDriveFiles(
  accessToken: string,
  fileIds: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
  const success: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (let i = 0; i < fileIds.length; i++) {
    const fileId = fileIds[i];
    try {
      onProgress?.(i, fileIds.length);
      await deleteDriveFile(accessToken, fileId);
      success.push(fileId);
    } catch (err: any) {
      failed.push({ id: fileId, error: err.message || 'Deletion failed' });
    }
  }
  onProgress?.(fileIds.length, fileIds.length);

  return { success, failed };
}

/**
 * Lists available folders in Google Drive for the Move destination selector
 */
export async function listDriveFolders(
  accessToken: string,
  parentId?: string
): Promise<DriveFile[]> {
  const queryParts = [
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
  ];
  if (parentId) {
    queryParts.push(`'${parentId}' in parents`);
  }

  const queryParams = new URLSearchParams({
    q: queryParts.join(' and '),
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink, parents)',
    pageSize: '100',
    orderBy: 'folder,name',
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch Google Drive folders (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}


