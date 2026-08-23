'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  initDriveAuth,
  signInWithGoogleDrive,
  signOutGoogleDrive,
} from '../../lib/googleDriveAuth';
import {
  listDriveFiles,
  fetchDriveAbout,
  createDriveFolder,
  uploadDriveFile,
  createTextDriveDocument,
  renameDriveFile,
  deleteDriveFile,
  moveDriveFile,
  batchMoveDriveFiles,
  batchDeleteDriveFiles,
  listDriveFolders,
  updateDriveFileMetadata,
  analyzeAudioWithGemini,
  uploadAndAnalyzeDriveAudio,
  downloadDriveFileBlob,
  isAudioFile,
  type DriveFile,
  type DriveAboutInfo,
  type GeminiAudioAnalysis,
} from '../../lib/googleDriveService';
import {
  listRecentRootFiles,
} from '../../lib/googleDriveClient';
import type { User } from 'firebase/auth';

interface BreadcrumbItem {
  id: string;
  name: string;
}

export function GoogleDriveExplorer() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [aboutInfo, setAboutInfo] = useState<DriveAboutInfo | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Navigation & Search
  const [currentFolder, setCurrentFolder] = useState<BreadcrumbItem>({ id: 'root', name: 'My Drive' });
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'My Drive' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileCategory, setFileCategory] = useState<
    'all' | 'folders' | 'docs' | 'sheets' | 'slides' | 'media' | 'pdf' | 'recent-root-media-docs'
  >('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // ==========================================
  // MULTI-SELECTION STATE
  // ==========================================
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [lastSelectedFileId, setLastSelectedFileId] = useState<string | null>(null);

  // ==========================================
  // BATCH OPERATIONS STATE & MODALS
  // ==========================================
  const [isBatchMoveModalOpen, setIsBatchMoveModalOpen] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<DriveFile[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [selectedTargetFolderId, setSelectedTargetFolderId] = useState<string>('root');
  const [isCreatingFolderInMove, setIsCreatingFolderInMove] = useState(false);
  const [newFolderNameInMove, setNewFolderNameInMove] = useState('');
  const [isBatchMoving, setIsBatchMoving] = useState(false);
  const [batchMoveProgress, setBatchMoveProgress] = useState<{ completed: number; total: number } | null>(null);

  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [batchDeleteProgress, setBatchDeleteProgress] = useState<{ completed: number; total: number } | null>(null);

  const [isBatchAnalyzingAudio, setIsBatchAnalyzingAudio] = useState(false);
  const [batchAudioProgress, setBatchAudioProgress] = useState<{
    completed: number;
    total: number;
    currentName: string;
  } | null>(null);

  // Modals state
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');

  const [renameTarget, setRenameTarget] = useState<DriveFile | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Mandatory confirmation for single destructive action
  const [deleteTarget, setDeleteTarget] = useState<DriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // File upload & AI processing state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMessage, setUploadProgressMessage] = useState<string | null>(null);
  const [autoAIAudioProcessing, setAutoAIAudioProcessing] = useState(true);
  const [createCompanionSummaryDoc, setCreateCompanionSummaryDoc] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gemini Audio Analysis Inspector & On-demand Summarization Modal
  const [inspectingAnalysis, setInspectingAnalysis] = useState<{
    file: DriveFile;
    analysis: GeminiAudioAnalysis;
  } | null>(null);
  const [isAnalyzingExistingId, setIsAnalyzingExistingId] = useState<string | null>(null);
  const [recentUploadSummary, setRecentUploadSummary] = useState<{
    filename: string;
    analysis: GeminiAudioAnalysis;
    companionNoteName?: string;
  } | null>(null);

  // 1. Initialize Auth on Mount
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
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Fetch User & Files when Token or Folder Changes
  const loadFiles = useCallback(async () => {
    if (!accessToken) return;
    setIsLoadingFiles(true);
    setFileError(null);
    try {
      if (fileCategory === 'recent-root-media-docs') {
        const [recentRes, aboutRes] = await Promise.allSettled([
          listRecentRootFiles(accessToken, { pageSize: 50 }),
          fetchDriveAbout(accessToken),
        ]);

        if (recentRes.status === 'fulfilled') {
          setFiles(recentRes.value.files || []);
        } else {
          setFileError(recentRes.reason?.message || 'Failed to load recent root files');
        }

        if (aboutRes.status === 'fulfilled') {
          setAboutInfo(aboutRes.value);
        }
      } else {
        const [filesRes, aboutRes] = await Promise.allSettled([
          listDriveFiles(accessToken, {
            parentId: currentFolder.id,
            searchQuery: searchQuery.trim(),
            fileCategory,
          }),
          fetchDriveAbout(accessToken),
        ]);

        if (filesRes.status === 'fulfilled') {
          setFiles(filesRes.value.files || []);
        } else {
          setFileError(filesRes.reason?.message || 'Failed to load Google Drive files');
        }

        if (aboutRes.status === 'fulfilled') {
          setAboutInfo(aboutRes.value);
        }
      }
    } catch (err: any) {
      setFileError(err?.message || 'Failed to sync with Google Drive');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [accessToken, currentFolder.id, searchQuery, fileCategory]);

  useEffect(() => {
    if (accessToken) {
      loadFiles();
    }
  }, [accessToken, loadFiles]);

  // Auth Handlers
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
      setAuthError(err?.message || 'Failed to sign in with Google');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutGoogleDrive();
      setCurrentUser(null);
      setAccessToken(null);
      setFiles([]);
      setAboutInfo(null);
      setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
      setCurrentFolder({ id: 'root', name: 'My Drive' });
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to sign out');
    }
  };

  // Navigation Handlers
  const handleOpenFolder = (folder: DriveFile) => {
    const nextItem: BreadcrumbItem = { id: folder.id, name: folder.name };
    setBreadcrumbs((prev) => [...prev, nextItem]);
    setCurrentFolder(nextItem);
    setSearchQuery('');
  };

  const handleNavigateBreadcrumb = (index: number) => {
    const nextBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(nextBreadcrumbs);
    setCurrentFolder(nextBreadcrumbs[nextBreadcrumbs.length - 1]);
    setSearchQuery('');
  };

  // Creation Handlers
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newFolderName.trim()) return;
    try {
      await createDriveFolder(accessToken, newFolderName.trim(), currentFolder.id);
      setNewFolderName('');
      setIsNewFolderOpen(false);
      loadFiles();
    } catch (err: any) {
      alert(`Error creating folder: ${err.message}`);
    }
  };

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newDocTitle.trim()) return;
    try {
      await createTextDriveDocument(accessToken, newDocTitle.trim(), newDocContent, currentFolder.id);
      setNewDocTitle('');
      setNewDocContent('');
      setIsNewDocOpen(false);
      loadFiles();
    } catch (err: any) {
      alert(`Error creating document: ${err.message}`);
    }
  };

  // Upload Handlers with Integrated Gemini Audio Pipeline
  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!accessToken || !fileList || fileList.length === 0) return;
    setIsUploading(true);
    setUploadProgressMessage('Initializing upload to Google Drive...');
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const isAudio = isAudioFile(file);

        if (isAudio && autoAIAudioProcessing) {
          setUploadProgressMessage(`Processing audio "${file.name}" with Gemini 3.7 Flash...`);
          const result = await uploadAndAnalyzeDriveAudio(accessToken, file, {
            parentId: currentFolder.id,
            createCompanionNote: createCompanionSummaryDoc,
            autoRename: true,
            onProgress: (status) => setUploadProgressMessage(`[${file.name}] ${status}`),
          });

          setRecentUploadSummary({
            filename: result.file.name,
            analysis: result.analysis,
            companionNoteName: result.companionNote?.name,
          });
        } else {
          setUploadProgressMessage(`Uploading "${file.name}" to Google Drive...`);
          await uploadDriveFile(accessToken, file, currentFolder.id);
        }
      }
      await loadFiles();
    } catch (err: any) {
      alert(`Error uploading file: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgressMessage(null);
    }
  };

  // On-demand Gemini Summarization for existing audio file
  const handleAnalyzeExistingAudio = async (file: DriveFile) => {
    if (!accessToken) return;
    setIsAnalyzingExistingId(file.id);
    try {
      // 1. Download file content from Google Drive
      const blob = await downloadDriveFileBlob(accessToken, file.id);
      // 2. Call Gemini
      const analysis = await analyzeAudioWithGemini(blob, file.name);

      // 3. Update description and descriptive name in Google Drive
      const descriptionBody = [
        `✨ AI Summary (Gemini 3.7 Flash):`,
        analysis.shortSummary,
        ``,
        `🏷️ Key Topics: ${analysis.keyTopics.join(', ')}`,
        `🎙️ Speaker/Tone: ${analysis.speakerOrTone}`,
        analysis.bulletPoints.length > 0 ? `\n📌 Highlights:\n${analysis.bulletPoints.map((b) => `• ${b}`).join('\n')}` : '',
      ].filter(Boolean).join('\n');

      const updated = await updateDriveFileMetadata(accessToken, file.id, {
        name: analysis.suggestedFilename || file.name,
        description: descriptionBody,
      });

      setInspectingAnalysis({
        file: updated,
        analysis,
      });

      loadFiles();
    } catch (err: any) {
      alert(`Failed to analyze audio with Gemini: ${err.message}`);
    } finally {
      setIsAnalyzingExistingId(null);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !renameTarget || !renameValue.trim()) return;
    try {
      await renameDriveFile(accessToken, renameTarget.id, renameValue.trim());
      setRenameTarget(null);
      setRenameValue('');
      loadFiles();
    } catch (err: any) {
      alert(`Error renaming file: ${err.message}`);
    }
  };

  // Destructive Delete with Required Explicit Confirmation Dialog
  const handleConfirmDelete = async () => {
    if (!accessToken || !deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(accessToken, deleteTarget.id);
      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
      loadFiles();
    } catch (err: any) {
      alert(`Error deleting item: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // ==========================================
  // MULTI-SELECTION HANDLERS
  // ==========================================
  const toggleSelectFile = (fileId: string, shiftKey = false) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedFileId) {
        const lastIdx = files.findIndex((f) => f.id === lastSelectedFileId);
        const currIdx = files.findIndex((f) => f.id === fileId);
        if (lastIdx !== -1 && currIdx !== -1) {
          const start = Math.min(lastIdx, currIdx);
          const end = Math.max(lastIdx, currIdx);
          for (let i = start; i <= end; i++) {
            next.add(files[i].id);
          }
          return next;
        }
      }

      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
    setLastSelectedFileId(fileId);
  };

  const selectAll = () => {
    setSelectedFileIds(new Set(files.map((f) => f.id)));
  };

  const selectAudioOnly = () => {
    const audioIds = files
      .filter((f) => isAudioFile({ name: f.name, mimeType: f.mimeType }))
      .map((f) => f.id);
    setSelectedFileIds(new Set(audioIds));
  };

  const clearSelection = () => {
    setSelectedFileIds(new Set());
    setLastSelectedFileId(null);
  };

  const selectedFiles = useMemo(() => {
    return files.filter((f) => selectedFileIds.has(f.id));
  }, [files, selectedFileIds]);

  const selectedAudioFiles = useMemo(() => {
    return selectedFiles.filter((f) => isAudioFile({ name: f.name, mimeType: f.mimeType }));
  }, [selectedFiles]);

  const totalSelectedBytes = useMemo(() => {
    return selectedFiles.reduce((acc, f) => {
      const bytes = typeof f.size === 'string' ? parseInt(f.size, 10) : f.size;
      return acc + (isNaN(bytes as number) ? 0 : (bytes as number));
    }, 0);
  }, [selectedFiles]);

  // ==========================================
  // BATCH MOVE HANDLER
  // ==========================================
  const handleOpenBatchMove = async () => {
    if (!accessToken || selectedFileIds.size === 0) return;
    setIsBatchMoveModalOpen(true);
    setIsLoadingFolders(true);
    setSelectedTargetFolderId(currentFolder.id === 'root' ? 'root' : currentFolder.id);
    try {
      const folders = await listDriveFolders(accessToken);
      setAvailableFolders(folders);
    } catch (err: any) {
      console.error('Failed to list folders:', err);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const handleCreateFolderInMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newFolderNameInMove.trim()) return;
    try {
      const parentId = selectedTargetFolderId || 'root';
      const created = await createDriveFolder(accessToken, newFolderNameInMove.trim(), parentId);
      setAvailableFolders((prev) => [...prev, created]);
      setSelectedTargetFolderId(created.id);
      setNewFolderNameInMove('');
      setIsCreatingFolderInMove(false);
    } catch (err: any) {
      alert(`Error creating folder: ${err.message}`);
    }
  };

  const handleExecuteBatchMove = async () => {
    if (!accessToken || selectedFileIds.size === 0 || !selectedTargetFolderId) return;
    setIsBatchMoving(true);
    const targetFolder = availableFolders.find((f) => f.id === selectedTargetFolderId);
    const targetName = selectedTargetFolderId === 'root' ? 'My Drive (Root)' : targetFolder?.name || 'Folder';
    setBatchMoveProgress({ completed: 0, total: selectedFileIds.size });

    try {
      const fileIdArray = Array.from(selectedFileIds);
      const res = await batchMoveDriveFiles(
        accessToken,
        fileIdArray,
        selectedTargetFolderId,
        currentFolder.id,
        (completed, total) => {
          setBatchMoveProgress({ completed, total });
        }
      );

      if (res.failed.length > 0) {
        alert(`Moved ${res.success.length} items to "${targetName}". ${res.failed.length} items encountered errors.`);
      }
      setIsBatchMoveModalOpen(false);
      clearSelection();
      loadFiles();
    } catch (err: any) {
      alert(`Error during batch move: ${err.message}`);
    } finally {
      setIsBatchMoving(false);
      setBatchMoveProgress(null);
    }
  };

  // ==========================================
  // BATCH DELETE HANDLER
  // ==========================================
  const handleOpenBatchDelete = () => {
    if (selectedFileIds.size === 0) return;
    setIsBatchDeleteModalOpen(true);
  };

  const handleExecuteBatchDelete = async () => {
    if (!accessToken || selectedFileIds.size === 0) return;
    setIsBatchDeleting(true);
    setBatchDeleteProgress({ completed: 0, total: selectedFileIds.size });

    try {
      const fileIdArray = Array.from(selectedFileIds);
      const res = await batchDeleteDriveFiles(accessToken, fileIdArray, (completed, total) => {
        setBatchDeleteProgress({ completed, total });
      });

      if (res.failed.length > 0) {
        alert(`Deleted ${res.success.length} items. ${res.failed.length} items could not be deleted.`);
      }
      setIsBatchDeleteModalOpen(false);
      clearSelection();
      loadFiles();
    } catch (err: any) {
      alert(`Error during batch deletion: ${err.message}`);
    } finally {
      setIsBatchDeleting(false);
      setBatchDeleteProgress(null);
    }
  };

  // ==========================================
  // BATCH GEMINI AUDIO SUMMARIZATION
  // ==========================================
  const handleBatchAnalyzeAudio = async () => {
    if (!accessToken || selectedAudioFiles.length === 0) return;
    setIsBatchAnalyzingAudio(true);
    setBatchAudioProgress({
      completed: 0,
      total: selectedAudioFiles.length,
      currentName: selectedAudioFiles[0].name,
    });

    try {
      for (let i = 0; i < selectedAudioFiles.length; i++) {
        const audioFile = selectedAudioFiles[i];
        setBatchAudioProgress({
          completed: i,
          total: selectedAudioFiles.length,
          currentName: audioFile.name,
        });

        try {
          const blob = await downloadDriveFileBlob(accessToken, audioFile.id);
          const analysis = await analyzeAudioWithGemini(blob, audioFile.name);

          const descriptionBody = [
            `✨ AI Summary (Gemini 3.7 Flash):`,
            analysis.shortSummary,
            ``,
            `🏷️ Key Topics: ${analysis.keyTopics.join(', ')}`,
            `🎙️ Speaker/Tone: ${analysis.speakerOrTone}`,
            analysis.bulletPoints.length > 0
              ? `\n📌 Highlights:\n${analysis.bulletPoints.map((b) => `• ${b}`).join('\n')}`
              : '',
          ]
            .filter(Boolean)
            .join('\n');

          await updateDriveFileMetadata(accessToken, audioFile.id, {
            name: analysis.suggestedFilename || audioFile.name,
            description: descriptionBody,
          });
        } catch (singleErr) {
          console.warn(`Failed to analyze audio ${audioFile.name}:`, singleErr);
        }
      }
      await loadFiles();
    } catch (err: any) {
      alert(`Batch audio analysis error: ${err.message}`);
    } finally {
      setIsBatchAnalyzingAudio(false);
      setBatchAudioProgress(null);
    }
  };

  const formatBytes = (bytes?: string | number) => {
    if (!bytes) return '—';
    const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(num) || num === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string, name = '') => {
    if (mimeType === 'application/vnd.google-apps.folder') return '📁';
    if (isAudioFile({ name, mimeType })) return '🎵';
    if (mimeType.includes('document')) return '📄';
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎬';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('typescript')) return '📜';
    return '📄';
  };

  // ==========================================
  // VIEW: Unauthenticated / Sign-In Required
  // ==========================================
  if (!accessToken || !currentUser) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center rounded-2xl border border-gold/20 bg-smoke-900/90 p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md my-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#4285F4]/30 bg-[#4285F4]/10 text-3xl shadow-[0_0_20px_rgba(66,133,244,0.3)]">
          <svg className="h-9 w-9" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
            <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44C.4 50 0 51.55 0 53.1h27.5z" fill="#00ac47"/>
            <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15z" fill="#ea4335"/>
            <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
            <path d="M59.8 53.1H87.3c0-1.55-.4-3.1-1.2-4.5l-22.5-39-19.95 34.5z" fill="#2684fc"/>
            <path d="M73.4 76.8H27.5L13.75 53.1h59.65c-1.35 1.35-2.2 3.1-2.2 5.05.05 1.95 1.1 3.7 2.2 5.05z" fill="#ffba00"/>
          </svg>
        </div>

        <h2 className="font-display text-2xl font-bold tracking-tight text-white mb-2">
          Connect Google Drive to Camelot OS
        </h2>
        <p className="max-w-lg text-sm text-white/60 mb-6">
          Access, organize, view, upload, and manage your Google Drive files with integrated Gemini 3.7 Flash AI audio auto-naming & summarization.
        </p>

        {authError && (
          <div className="mb-6 w-full rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {authError}
          </div>
        )}

        {/* Official GSI Styled Button */}
        <button
          type="button"
          onClick={handleSignIn}
          disabled={isAuthenticating}
          className="group relative inline-flex items-center gap-3 rounded-full border border-white/20 bg-white px-6 py-3 font-sans text-sm font-medium text-gray-800 shadow-md transition-all hover:bg-gray-50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4]/50 disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          <span className="font-medium text-gray-700">
            {isAuthenticating ? 'Connecting to Google...' : 'Sign in with Google'}
          </span>
        </button>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left w-full border-t border-white/10 pt-6">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="text-base">✨</span>
            <h4 className="font-bold text-xs text-white mt-1">Gemini 3.7 Audio AI</h4>
            <p className="text-[11px] text-white/50">Automatic descriptive naming & rich audio summarization upon upload.</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="text-base">📁</span>
            <h4 className="font-bold text-xs text-white mt-1">Sovereign Cloud Sync</h4>
            <p className="text-[11px] text-white/50">Browse files, folders, and real-time Google Docs inside Camelot OS.</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="text-base">🛡️</span>
            <h4 className="font-bold text-xs text-white mt-1">Gated Destruction</h4>
            <p className="text-[11px] text-white/50">Deletions require explicit confirmation dialogues to safeguard data.</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: Authenticated Google Drive Cockpit
  // ==========================================
  const storageLimit = aboutInfo?.storageQuota?.limit ? parseInt(aboutInfo.storageQuota.limit, 10) : 0;
  const storageUsage = aboutInfo?.storageQuota?.usage ? parseInt(aboutInfo.storageQuota.usage, 10) : 0;
  const storagePercent = storageLimit > 0 ? Math.min(100, Math.round((storageUsage / storageLimit) * 100)) : 0;

  return (
    <div
      className="flex flex-col h-full w-full max-w-7xl mx-auto space-y-4"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files) {
          handleUploadFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* 1. Header Bar: Profile & Quota Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/20 bg-smoke-900/90 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#4285F4]/40 bg-[#4285F4]/10 text-xl shadow-[0_0_12px_rgba(66,133,244,0.3)] overflow-hidden">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt={currentUser.displayName || 'User'} className="h-full w-full object-cover" />
            ) : (
              <span>☁️</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold text-white">
                {currentUser.displayName || aboutInfo?.user.displayName || 'Google Drive User'}
              </h3>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
                CONNECTED
              </span>
            </div>
            <p className="font-mono text-[10px] text-white/50">
              {currentUser.email || aboutInfo?.user.emailAddress}
            </p>
          </div>
        </div>

        {/* Storage Quota & Disconnect */}
        <div className="flex items-center gap-4">
          {storageLimit > 0 && (
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-2 font-mono text-[10px] text-white/60">
                <span>Storage:</span>
                <span className="text-gold font-bold">{formatBytes(storageUsage)}</span>
                <span>/</span>
                <span>{formatBytes(storageLimit)}</span>
              </div>
              <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#00F0FF] to-gold transition-all duration-500"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-xs text-red-300 hover:bg-red-500/20 transition-colors"
          >
            <span>🚪</span>
            <span>Disconnect</span>
          </button>
        </div>
      </div>

      {/* 2. Controls Bar: Breadcrumbs, Search, Categories, Actions */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumb Navigation */}
          <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                {idx > 0 && <span className="text-white/30">/</span>}
                <button
                  type="button"
                  onClick={() => handleNavigateBreadcrumb(idx)}
                  className={`rounded px-1.5 py-0.5 transition-colors ${
                    idx === breadcrumbs.length - 1
                      ? 'bg-gold/20 text-gold font-bold'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={(e) => handleUploadFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-3 py-1.5 font-mono text-xs font-bold text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)] disabled:opacity-50"
            >
              <span>{isUploading ? '⏳' : '⬆️'}</span>
              <span>{isUploading ? 'Uploading...' : 'Upload to Drive'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewFolderOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/80 hover:bg-white/10 transition-colors"
            >
              <span>📁</span>
              <span>New Folder</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewDocOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/10 px-3 py-1.5 font-mono text-xs text-gold-light hover:bg-gold/20 transition-colors"
            >
              <span>📄</span>
              <span>New Note</span>
            </button>

            <button
              type="button"
              onClick={loadFiles}
              disabled={isLoadingFiles}
              className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-white/60 hover:text-white transition-colors"
              title="Refresh files"
            >
              <span className={isLoadingFiles ? 'animate-spin inline-block' : ''}>🔄</span>
            </button>

            <div className="h-5 w-px bg-white/10 mx-1" />

            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-white/60 hover:text-white transition-colors"
              title="Toggle View Mode"
            >
              {viewMode === 'grid' ? '📑' : '🔲'}
            </button>
          </div>
        </div>

        {/* Gemini AI Auto-Processing Toggle Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#00F0FF]/20 bg-[#00F0FF]/[0.03] px-3 py-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-white/80">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#00F0FF]/20 text-xs">✨</span>
            <span className="font-bold text-[#00F0FF]">Gemini 3.7 Flash Pipeline:</span>
            <span className="text-[11px] text-white/60 hidden sm:inline">
              Auto-generate descriptive filenames & summaries when uploading audio files
            </span>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={autoAIAudioProcessing}
                onChange={(e) => setAutoAIAudioProcessing(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-gold focus:ring-0"
              />
              <span>Auto-Name & Summarize Audio</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={createCompanionSummaryDoc}
                onChange={(e) => setCreateCompanionSummaryDoc(e.target.checked)}
                disabled={!autoAIAudioProcessing}
                className="rounded border-white/20 bg-black/40 text-gold focus:ring-0 disabled:opacity-40"
              />
              <span>Generate .summary.md Note</span>
            </label>
          </div>
        </div>

        {/* Search & Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search files and folders in Google Drive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/60 py-1.5 pl-8 pr-3 font-mono text-xs text-white placeholder-white/40 focus:border-[#00F0FF] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Files' },
              { id: 'media', label: '🎵 Audio & Media' },
              { id: 'recent-root-media-docs', label: '⚡ Root Media & Docs' },
              { id: 'folders', label: 'Folders' },
              { id: 'docs', label: 'Docs' },
              { id: 'sheets', label: '📊 Sheets' },
              { id: 'slides', label: 'Slides' },
              { id: 'pdf', label: 'PDFs' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFileCategory(cat.id as any)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-all ${
                  fileCategory === cat.id
                    ? 'border border-gold bg-gold/20 text-gold-light font-bold'
                    : 'border border-white/10 bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sheets Enclave Quick Launch Banner when Sheets category selected */}
      {fileCategory === 'sheets' && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 font-mono text-xs text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <span className="font-bold text-white">Google Sheets Enclave Ready:</span>
            <span className="text-white/70">Edit cell data, append rows, and run Gemini AI Data Scientist analysis directly.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('koa:navigate_tab', { detail: 'sheets' }));
            }}
            className="rounded-lg border border-emerald-500 bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-500 transition-colors shrink-0"
          >
            Open Interactive Sheets Editor 📊
          </button>
        </div>
      )}

      {/* Upload Progress Notification */}
      {uploadProgressMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/10 p-3 text-xs font-mono text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.15)] animate-pulse">
          <span className="text-base animate-spin">🌀</span>
          <span className="font-bold">{uploadProgressMessage}</span>
        </div>
      )}

      {/* Recent AI Analysis Notification banner */}
      {recentUploadSummary && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 font-mono text-xs text-emerald-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base">✨</span>
              <span className="font-bold text-white">Gemini 3.7 Flash Audio Processed:</span>
              <span className="rounded bg-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-300 font-bold">
                {recentUploadSummary.filename}
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/80 max-w-2xl">
              &quot;{recentUploadSummary.analysis.shortSummary}&quot;
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-white/40">Topics:</span>
              {recentUploadSummary.analysis.keyTopics.map((t) => (
                <span key={t} className="rounded bg-black/40 px-1.5 py-0.5 text-[9px] text-emerald-300 border border-emerald-500/20">
                  #{t}
                </span>
              ))}
              {recentUploadSummary.companionNoteName && (
                <span className="text-[10px] text-gold-light ml-2">
                  📝 Generated: {recentUploadSummary.companionNoteName}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setRecentUploadSummary(null)}
              className="rounded-lg border border-emerald-500/30 bg-black/40 px-2.5 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/20"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 3. Drag and Drop Zone Overlay indicator */}
      {isDragOver && (
        <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-[#00F0FF] bg-[#00F0FF]/10 p-8 text-center animate-pulse">
          <p className="font-mono text-sm font-bold text-[#00F0FF]">
            ⚡ Drop files here to upload directly to &quot;{currentFolder.name}&quot;
            {autoAIAudioProcessing && ' (Audio files will be analyzed by Gemini 3.7 Flash)'}
          </p>
        </div>
      )}

      {/* Error state */}
      {fileError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-center justify-between">
          <span>⚠️ {fileError}</span>
          <button type="button" onClick={loadFiles} className="underline hover:text-white">Retry</button>
        </div>
      )}

      {/* 4. Files List / Grid Container */}
      <div className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 min-h-[350px]">
        {isLoadingFiles ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <span className="text-3xl animate-spin">🌀</span>
            <p className="font-mono text-xs text-white/50">Syncing files from Google Drive...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <span className="text-4xl opacity-40">📂</span>
            <h4 className="font-display text-base font-bold text-white/80">No files found</h4>
            <p className="max-w-xs text-xs text-white/40">
              {searchQuery ? `No files matching "${searchQuery}"` : 'This folder is currently empty. Upload audio or documents to get started.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {files.map((file) => {
              const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
              const isAudio = isAudioFile({ name: file.name, mimeType: file.mimeType });
              const hasDescription = Boolean(file.description && file.description.trim());
              const isAnalyzingThis = isAnalyzingExistingId === file.id;

              return (
                <div
                  key={file.id}
                  className={`group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all shadow-sm ${
                    isAudio
                      ? 'border-[#00F0FF]/30 bg-smoke-900/80 hover:border-[#00F0FF]/60 hover:bg-smoke-800'
                      : 'border-white/10 bg-smoke-900/60 hover:border-gold/40 hover:bg-smoke-800'
                  }`}
                >
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => {
                      if (isFolder) {
                        handleOpenFolder(file);
                      } else if (file.webViewLink) {
                        window.open(file.webViewLink, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xl ${
                      isAudio
                        ? 'border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF]'
                        : 'border-white/10 bg-black/40'
                    }`}>
                      {getFileIcon(file.mimeType, file.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-mono text-xs font-bold text-white truncate group-hover:text-gold transition-colors" title={file.name}>
                          {file.name}
                        </h4>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-white/40 truncate">
                        {isFolder ? 'Folder' : formatBytes(file.size)}
                        {file.modifiedTime && ` • ${new Date(file.modifiedTime).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>

                  {/* Summary / Description Preview for Audio or Docs */}
                  {hasDescription && (
                    <div className="mt-2.5 rounded-lg border border-white/5 bg-black/40 p-2 font-mono text-[10px] text-white/70 line-clamp-2">
                      {file.description}
                    </div>
                  )}

                  {/* Audio Specific Actions (Gemini Summarize / Inspection) */}
                  {isAudio && (
                    <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-white/5 pt-2">
                      <button
                        type="button"
                        onClick={() => handleAnalyzeExistingAudio(file)}
                        disabled={isAnalyzingThis}
                        className="flex items-center gap-1 rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-2 py-1 font-mono text-[9px] font-bold text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-all disabled:opacity-50"
                        title="Re-analyze audio content with Gemini 3.7 Flash"
                      >
                        <span>{isAnalyzingThis ? '🌀' : '✨'}</span>
                        <span>{isAnalyzingThis ? 'Analyzing...' : hasDescription ? 'Re-Summarize' : 'Gemini AI Name'}</span>
                      </button>

                      {hasDescription && (
                        <button
                          type="button"
                          onClick={() => {
                            // Synthesize analysis object from description
                            setInspectingAnalysis({
                              file,
                              analysis: {
                                suggestedFilename: file.name,
                                shortSummary: file.description || '',
                                keyTopics: ['Audio Note'],
                                speakerOrTone: 'Recorded Audio',
                                bulletPoints: [],
                              },
                            });
                          }}
                          className="font-mono text-[9px] text-gold-light hover:underline"
                        >
                          View Details 🔍
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions footer */}
                  <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2">
                    {file.webViewLink ? (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[10px] text-[#00F0FF] hover:underline flex items-center gap-1"
                      >
                        <span>Open Drive</span>
                        <span>↗</span>
                      </a>
                    ) : <div />}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRenameTarget(file);
                          setRenameValue(file.name);
                        }}
                        className="rounded p-1 text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xs"
                        title="Rename"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(file)}
                        className="rounded p-1 text-red-400/60 hover:text-red-300 hover:bg-red-500/10 transition-colors text-xs"
                        title="Delete (Confirmation required)"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] text-white/40 uppercase tracking-wider">
                  <th className="pb-2 pl-2">Name</th>
                  <th className="pb-2">AI Summary / Description</th>
                  <th className="pb-2">Size</th>
                  <th className="pb-2">Modified</th>
                  <th className="pb-2 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {files.map((file) => {
                  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                  const isAudio = isAudioFile({ name: file.name, mimeType: file.mimeType });
                  const isAnalyzingThis = isAnalyzingExistingId === file.id;

                  return (
                    <tr key={file.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-2.5 pl-2">
                        <div
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => {
                            if (isFolder) {
                              handleOpenFolder(file);
                            } else if (file.webViewLink) {
                              window.open(file.webViewLink, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        >
                          <span className="text-base">{getFileIcon(file.mimeType, file.name)}</span>
                          <span className="font-bold text-white group-hover:text-gold truncate max-w-xs sm:max-w-sm">
                            {file.name}
                          </span>
                          {isAudio && (
                            <span className="rounded bg-[#00F0FF]/20 px-1.5 py-0.2 text-[8px] text-[#00F0FF] border border-[#00F0FF]/30">
                              AUDIO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 text-[10px] text-white/60 max-w-xs truncate">
                        {file.description ? (
                          <span className="text-white/80" title={file.description}>
                            ✨ {file.description.replace(/^✨ AI Summary \(Gemini 3.7 Flash\):\s*/i, '').slice(0, 80)}...
                          </span>
                        ) : isAudio ? (
                          <button
                            type="button"
                            onClick={() => handleAnalyzeExistingAudio(file)}
                            disabled={isAnalyzingThis}
                            className="rounded border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-2 py-0.5 text-[9px] text-[#00F0FF] hover:bg-[#00F0FF]/20"
                          >
                            {isAnalyzingThis ? '🌀 Analyzing...' : '✨ Generate AI Summary'}
                          </button>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-[10px] text-white/60">
                        {isFolder ? '—' : formatBytes(file.size)}
                      </td>
                      <td className="py-2.5 text-[10px] text-white/40">
                        {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAudio && (
                            <button
                              type="button"
                              onClick={() => handleAnalyzeExistingAudio(file)}
                              disabled={isAnalyzingThis}
                              className="rounded p-1 text-[#00F0FF] hover:bg-[#00F0FF]/10 text-xs"
                              title="Analyze Audio with Gemini 3.7 Flash"
                            >
                              ✨
                            </button>
                          )}
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded p-1 text-[#00F0FF] hover:bg-[#00F0FF]/10 text-xs"
                              title="Open in Google Drive"
                            >
                              ↗
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setRenameTarget(file);
                              setRenameValue(file.name);
                            }}
                            className="rounded p-1 text-white/40 hover:text-white hover:bg-white/10 text-xs"
                            title="Rename"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(file)}
                            className="rounded p-1 text-red-400/60 hover:text-red-300 hover:bg-red-500/10 text-xs"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* GEMINI AUDIO ANALYSIS INSPECTOR MODAL */}
      {/* ======================================================== */}
      {inspectingAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#00F0FF]/40 bg-smoke-900 p-6 shadow-[0_10px_50px_rgba(0,240,255,0.2)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <div>
                  <h3 className="font-display text-base font-bold text-white">Gemini 3.7 Audio Intelligence</h3>
                  <p className="font-mono text-[10px] text-[#00F0FF]">Sovereign Semantic Cataloging</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingAnalysis(null)}
                className="rounded p-1 text-white/40 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40">Suggested Filename</label>
                <div className="mt-1 rounded-xl border border-white/10 bg-black/60 p-2.5 text-gold font-bold">
                  {inspectingAnalysis.analysis.suggestedFilename}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40">Short Summary</label>
                <div className="mt-1 rounded-xl border border-white/10 bg-black/60 p-3 text-white/90 leading-relaxed">
                  {inspectingAnalysis.analysis.shortSummary}
                </div>
              </div>

              {inspectingAnalysis.analysis.keyTopics?.length > 0 && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/40">Key Topics</label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {inspectingAnalysis.analysis.keyTopics.map((t) => (
                      <span key={t} className="rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-2 py-0.5 text-[10px] text-[#00F0FF]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {inspectingAnalysis.analysis.speakerOrTone && (
                <div className="flex justify-between items-center rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <span className="text-white/40">Speaker & Tone:</span>
                  <span className="font-bold text-white">{inspectingAnalysis.analysis.speakerOrTone}</span>
                </div>
              )}

              {inspectingAnalysis.analysis.bulletPoints?.length > 0 && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/40">Highlights</label>
                  <ul className="mt-1 space-y-1 text-[11px] text-white/70">
                    {inspectingAnalysis.analysis.bulletPoints.map((b, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-gold">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setInspectingAnalysis(null)}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 font-mono text-xs text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MANDATORY DESTRUCTIVE CONFIRMATION MODAL (Workspace Mandate) */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-smoke-900 p-6 shadow-[0_10px_50px_rgba(239,68,68,0.3)]">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-display text-lg font-bold text-white">
                Confirm Deletion from Google Drive
              </h3>
            </div>

            <p className="text-xs text-white/70 mb-4">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white font-mono underline">{deleteTarget.name}</strong> from your Google Drive? This operation cannot be undone.
            </p>

            <div className="rounded-xl border border-white/10 bg-black/50 p-3 mb-6 font-mono text-[11px] space-y-1">
              <div className="flex justify-between text-white/50">
                <span>Item ID:</span>
                <span className="text-white/80">{deleteTarget.id}</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Type:</span>
                <span className="text-white/80">{deleteTarget.mimeType}</span>
              </div>
              {deleteTarget.size && (
                <div className="flex justify-between text-white/50">
                  <span>Size:</span>
                  <span className="text-white/80">{formatBytes(deleteTarget.size)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="rounded-xl border border-white/20 px-4 py-2 font-mono text-xs text-white/70 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-xl border border-red-500 bg-red-600 px-4 py-2 font-mono text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-50"
              >
                <span>{isDeleting ? '⏳' : '🗑️'}</span>
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Folder */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateFolder} className="w-full max-w-md rounded-2xl border border-gold/30 bg-smoke-900 p-6 shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
            <h3 className="font-display text-lg font-bold text-white mb-2">Create New Folder</h3>
            <p className="text-xs text-white/50 mb-4">Inside: {currentFolder.name}</p>

            <input
              type="text"
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 font-mono text-xs text-white placeholder-white/30 focus:border-gold focus:outline-none mb-6"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNewFolderOpen(false)}
                className="rounded-xl border border-white/20 px-4 py-2 font-mono text-xs text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="rounded-xl border border-gold bg-gold px-4 py-2 font-mono text-xs font-bold text-black hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                Create Folder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Text Doc */}
      {isNewDocOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateDoc} className="w-full max-w-lg rounded-2xl border border-gold/30 bg-smoke-900 p-6 shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
            <h3 className="font-display text-lg font-bold text-white mb-2">Create New Text Document</h3>
            <p className="text-xs text-white/50 mb-4">Saved directly to Google Drive in {currentFolder.name}</p>

            <div className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="Document name (e.g. camelot_notes.md)..."
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 font-mono text-xs text-white placeholder-white/30 focus:border-gold focus:outline-none"
              />

              <textarea
                placeholder="Write document text or markdown content here..."
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-white/20 bg-black/60 p-3 font-mono text-xs text-white placeholder-white/30 focus:border-gold focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNewDocOpen(false)}
                className="rounded-xl border border-white/20 px-4 py-2 font-mono text-xs text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newDocTitle.trim()}
                className="rounded-xl border border-gold bg-gold px-4 py-2 font-mono text-xs font-bold text-black hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                Save to Drive
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Rename */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form onSubmit={handleRename} className="w-full max-w-md rounded-2xl border border-white/20 bg-smoke-900 p-6 shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
            <h3 className="font-display text-lg font-bold text-white mb-2">Rename Item</h3>
            <p className="text-xs text-white/50 mb-4">Original: {renameTarget.name}</p>

            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 font-mono text-xs text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none mb-6"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="rounded-xl border border-white/20 px-4 py-2 font-mono text-xs text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!renameValue.trim()}
                className="rounded-xl border border-[#00F0FF] bg-[#00F0FF] px-4 py-2 font-mono text-xs font-bold text-black hover:bg-[#00F0FF]/80 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
