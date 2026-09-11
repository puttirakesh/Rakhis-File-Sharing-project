import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAward,
  faCalculator,
  faChartLine,
  faCheckCircle,
  faCloudArrowUp,
  faCloudUploadAlt,
  faDownload,
  faExclamationCircle,
  faFileAlt,
  faFileExcel,
  faFilePdf,
  faFilePowerpoint,
  faFileWord,
  faFlask,
  faFolderOpen,
  faGraduationCap,
  faLanguage,
  faLightbulb,
  faLock,
  faPlus,
  faSearch,
  faSignInAlt,
  faSignOutAlt,
  faSpinner,
  faTimes,
  faTrash,
  faUniversity,
  faUpload,
  faUser,
  faUserPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import image from './assets/chandan-kumar.jpg';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const MAX_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_FILE_SIZE_MB || 25);
const MAX_FILES_PER_UPLOAD = Number(import.meta.env.VITE_MAX_FILES_PER_UPLOAD || 10);

const getToken = () => localStorage.getItem('token');

const apiFetch = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  const token = getToken();

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let payload = null;

  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null);
  } else {
    payload = await response.text().catch(() => '');
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && payload.message) ||
      (typeof payload === 'string' && payload) ||
      `Request failed (${response.status})`;

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
};

const fileTypeInfo = (fileType = '', fileName = '') => {
  const value = `${fileType} ${fileName}`.toLowerCase();

  if (value.includes('pdf')) return { icon: faFilePdf, tone: 'rose', label: 'PDF' };
  if (value.includes('word') || value.includes('.doc')) return { icon: faFileWord, tone: 'blue', label: 'DOC' };
  if (value.includes('powerpoint') || value.includes('presentation') || value.includes('.ppt')) {
    return { icon: faFilePowerpoint, tone: 'orange', label: 'PPT' };
  }
  if (value.includes('excel') || value.includes('spreadsheet') || value.includes('.xls')) {
    return { icon: faFileExcel, tone: 'emerald', label: 'XLS' };
  }
  return { icon: faFileAlt, tone: 'slate', label: 'FILE' };
};

const toneClasses = {
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
  orange: 'bg-orange-50 text-orange-600 ring-orange-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const topicIcon = (title = '') => {
  const value = title.toLowerCase();
  if (value.includes('math')) return faCalculator;
  if (value.includes('science') || value.includes('physics') || value.includes('chemistry')) return faFlask;
  if (value.includes('language') || value.includes('english')) return faLanguage;
  return faFolderOpen;
};

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

function Modal({ title, icon, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/55 p-0 sm:p-4 backdrop-blur-sm">
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5 animate-modal-in`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <FontAwesomeIcon icon={icon || faCloudUploadAlt} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-slate-900">{title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function App() {
  const [topics, setTopics] = useState([]);
  const [files, setFiles] = useState([]);
  const [topicCounts, setTopicCounts] = useState({});
  const [selectedTopic, setSelectedTopic] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [busyAction, setBusyAction] = useState('');

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTopicId, setUploadTopicId] = useState('');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');

  const [editTopicId, setEditTopicId] = useState('');
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [editTopicDesc, setEditTopicDesc] = useState('');

  const [editNameId, setEditNameId] = useState('');
  const [editName, setEditName] = useState('');

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isTeacherKeyLogin, setIsTeacherKeyLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [teacherLoginKey, setTeacherLoginKey] = useState('');

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('student');
  const [teacherKey, setTeacherKey] = useState('');

  const [isDownloading, setIsDownloading] = useState({});

  const showMessage = useCallback((text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
  }, []);

  const selectedTopicObject = useMemo(
    () => topics.find((topic) => topic._id === selectedTopic),
    [topics, selectedTopic],
  );

  const filteredFiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return files.filter((file) => {
      const belongsToSelectedTopic = !selectedTopic || String(file.topic?._id || file.topic) === selectedTopic;
      if (!belongsToSelectedTopic) return false;
      if (!query) return true;

      return `${file.originalName || ''} ${file.fileType || ''}`.toLowerCase().includes(query);
    });
  }, [files, searchQuery, selectedTopic]);

  const totalFiles = useMemo(
    () => Object.values(topicCounts).reduce((sum, count) => sum + count, 0),
    [topicCounts],
  );

  const refreshTopics = useCallback(async () => {
    try {
      const data = await apiFetch('/api/topics');
      const nextTopics = Array.isArray(data) ? data : [];
      setTopics(nextTopics);

      setSelectedTopic((current) => {
        if (current && nextTopics.some((topic) => topic._id === current)) return current;
        return nextTopics[0]?._id || '';
      });

      const countResults = await Promise.allSettled(
        nextTopics.map(async (topic) => {
          const topicFiles = await apiFetch(`/api/topics/${topic._id}/files`);
          return [topic._id, Array.isArray(topicFiles) ? topicFiles.length : 0];
        }),
      );

      const nextCounts = {};
      countResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const [id, count] = result.value;
          nextCounts[id] = count;
        }
      });
      setTopicCounts(nextCounts);
    } catch (error) {
      console.error(error);
      showMessage('Unable to load folders right now. Please check your backend.', 'error');
    }
  }, [showMessage]);

  const refreshFiles = useCallback(
    async (topicId) => {
      if (!topicId) {
        setFiles([]);
        return;
      }

      try {
        const data = await apiFetch(`/api/topics/${topicId}/files`);
        setFiles(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        showMessage('Unable to load files for this folder.', 'error');
      }
    },
    [showMessage],
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    refreshTopics();
  }, [refreshTopics]);

  useEffect(() => {
    if (!selectedTopic) return;
    setUploadTopicId(selectedTopic);
    refreshFiles(selectedTopic);
  }, [selectedTopic, refreshFiles]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 4500);
    return () => clearTimeout(timer);
  }, [message]);

  const openUpload = () => {
    if (!topics.length) {
      showMessage('Create a folder before uploading files.', 'error');
      return;
    }

    setUploadTopicId(selectedTopic || topics[0]._id);
    setUploadFiles([]);
    setIsUploadOpen(true);
  };

  const validateFiles = (incomingFiles) => {
    const incoming = Array.from(incomingFiles || []);
    const valid = [];
    const rejected = [];

    incoming.forEach((file) => {
      const sizeMb = file.size / (1024 * 1024);

      if (sizeMb > MAX_FILE_SIZE_MB) {
        rejected.push(`${file.name} is larger than ${MAX_FILE_SIZE_MB} MB`);
        return;
      }

      valid.push(file);
    });

    if (valid.length > MAX_FILES_PER_UPLOAD) {
      rejected.push(`Only ${MAX_FILES_PER_UPLOAD} files can be uploaded at once.`);
      valid.splice(MAX_FILES_PER_UPLOAD);
    }

    setUploadFiles((current) => {
      const merged = [...current, ...valid];
      const unique = merged.filter(
        (file, index, array) =>
          array.findIndex((item) => `${item.name}-${item.size}-${item.lastModified}` === `${file.name}-${file.size}-${file.lastModified}`) === index,
      );
      return unique.slice(0, MAX_FILES_PER_UPLOAD);
    });

    if (rejected.length) showMessage(rejected[0], 'error');
  };

  const handleFileUpload = async (event) => {
    event.preventDefault();

    if (!uploadTopicId) {
      showMessage('Choose the destination folder first.', 'error');
      return;
    }

    if (!uploadFiles.length) {
      showMessage('Select at least one file to upload.', 'error');
      return;
    }

    setBusyAction('upload');

    try {
      const formData = new FormData();
      uploadFiles.forEach((file) => formData.append('files', file));
      formData.append('topicId', uploadTopicId);

      await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setIsUploadOpen(false);
      setUploadFiles([]);
      await refreshFiles(selectedTopic);
      await refreshTopics();
      showMessage(`${uploadFiles.length} file${uploadFiles.length > 1 ? 's' : ''} uploaded successfully.`);
    } catch (error) {
      console.error(error);
      showMessage(error.status === 401 || error.status === 403 ? 'Teacher access is required to upload files.' : error.message, 'error');
    } finally {
      setBusyAction('');
    }
  };

  const handleCreateTopic = async (event) => {
    event.preventDefault();
    if (!newTopicTitle.trim()) {
      showMessage('Folder name is required.', 'error');
      return;
    }

    setBusyAction('create-topic');

    try {
      const data = await apiFetch('/api/topics', {
        method: 'POST',
        body: JSON.stringify({
          title: newTopicTitle.trim(),
          description: newTopicDesc.trim(),
        }),
      });

      setIsCreateTopicOpen(false);
      setNewTopicTitle('');
      setNewTopicDesc('');
      await refreshTopics();
      setSelectedTopic(data._id);
      showMessage('Folder created successfully.');
    } catch (error) {
      console.error(error);
      showMessage(error.message || 'Unable to create folder.', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const handleTopicDelete = async (topicId) => {
    const topic = topics.find((item) => item._id === topicId);
    const confirmed = window.confirm(`Delete "${topic?.title || 'this folder'}" and all of its files?`);
    if (!confirmed) return;

    setBusyAction(`delete-topic-${topicId}`);

    try {
      await apiFetch(`/api/topics/${topicId}`, { method: 'DELETE' });
      const remaining = topics.filter((item) => item._id !== topicId);
      setTopics(remaining);
      setTopicCounts((current) => {
        const next = { ...current };
        delete next[topicId];
        return next;
      });
      const nextTopicId = selectedTopic === topicId ? remaining[0]?._id || '' : selectedTopic;
      setSelectedTopic(nextTopicId);
      showMessage('Folder and its files were deleted.');
    } catch (error) {
      console.error(error);
      showMessage(error.message || 'Unable to delete folder.', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const handleTopicEditSubmit = async (event) => {
    event.preventDefault();
    if (!editTopicTitle.trim()) {
      showMessage('Folder name is required.', 'error');
      return;
    }

    setBusyAction('edit-topic');

    try {
      const updated = await apiFetch(`/api/topics/${editTopicId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTopicTitle.trim(),
          description: editTopicDesc.trim(),
        }),
      });

      setTopics((current) => current.map((topic) => (topic._id === editTopicId ? updated : topic)));
      setEditTopicId('');
      showMessage('Folder updated.');
    } catch (error) {
      console.error(error);
      showMessage(error.message || 'Unable to update folder.', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const handleFileDelete = async (fileId) => {
    if (!window.confirm('Delete this file permanently?')) return;

    setBusyAction(`delete-file-${fileId}`);

    try {
      await apiFetch(`/api/files/${fileId}`, { method: 'DELETE' });
      setFiles((current) => current.filter((file) => file._id !== fileId));
      setTopicCounts((current) => ({
        ...current,
        [selectedTopic]: Math.max((current[selectedTopic] || 1) - 1, 0),
      }));
      showMessage('File deleted successfully.');
    } catch (error) {
      console.error(error);
      showMessage(error.message || 'Unable to delete file.', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const handleFileEditSubmit = async (event) => {
    event.preventDefault();

    if (!editName.trim()) {
      showMessage('File name is required.', 'error');
      return;
    }

    setBusyAction('edit-file');

    try {
      const updated = await apiFetch(`/api/files/${editNameId}`, {
        method: 'PUT',
        body: JSON.stringify({ newName: editName.trim() }),
      });

      setFiles((current) => current.map((file) => (file._id === editNameId ? updated : file)));
      setEditNameId('');
      setEditName('');
      showMessage('File renamed successfully.');
    } catch (error) {
      console.error(error);
      showMessage(error.message || 'Unable to rename file.', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const handleDownload = async (fileId, fileName) => {
    setIsDownloading((current) => ({ ...current, [fileId]: true }));

    try {
      const response = await fetch(`${API_URL}/api/download/${fileId}`, {
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json')
          ? await response.json().catch(() => null)
          : null;
        throw new Error(payload?.message || 'Unable to download this file.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showMessage('Download started.');
    } catch (error) {
      console.error(error);
      showMessage(error.message || 'Unable to download file.', 'error');
    } finally {
      setIsDownloading((current) => ({ ...current, [fileId]: false }));
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setBusyAction('login');

    try {
      const payload = isTeacherKeyLogin
        ? { teacherKey: teacherLoginKey }
        : { email: loginEmail.trim(), password: loginPassword };

      const data = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!data?.token) throw new Error(data?.message || 'Login failed.');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setIsLoginOpen(false);
      setLoginEmail('');
      setLoginPassword('');
      setTeacherLoginKey('');
      showMessage(`Welcome back, ${data.user?.name || 'User'}!`);
    } catch (error) {
      console.error(error);
      showMessage(error.message || 'Login failed.', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setBusyAction('register');

    try {
      const body = {
        name: registerName.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
        role: registerRole,
      };

      if (registerRole === 'teacher') body.teacherKey = teacherKey;

      const data = await apiFetch('/api/register', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!data?.token) throw new Error(data?.message || 'Registration failed.');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setIsRegisterOpen(false);
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setTeacherKey('');
      showMessage('Account created successfully.');
    } catch (error) {
      console.error(error);
      showMessage(error.message || 'Registration failed.', 'error');
    } finally {
      setBusyAction('');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setFiles([]);
    setSelectedTopic('');
    showMessage('You have been signed out.');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 text-white shadow-xl shadow-slate-900/10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/30">
              <FontAwesomeIcon icon={faCloudArrowUp} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight sm:text-base">Educational Resource Hub</p>
              <p className="hidden text-[11px] text-slate-400 sm:block">Organized learning, one folder at a time.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 sm:flex">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10">
                    <FontAwesomeIcon icon={faUser} className="text-[11px]" />
                  </span>
                  <span className="max-w-32 truncate">{user.name}</span>
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 capitalize text-indigo-200">{user.role}</span>
                </div>
                {user.role === 'teacher' && (
                  <button onClick={openUpload} className="action-primary">
                    <FontAwesomeIcon icon={faUpload} />
                    <span className="hidden sm:inline">Upload</span>
                  </button>
                )}
                <button onClick={logout} className="action-ghost">
                  <FontAwesomeIcon icon={faSignOutAlt} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsLoginOpen(true)} className="action-ghost">
                  <FontAwesomeIcon icon={faSignInAlt} />
                  <span className="hidden sm:inline">Login</span>
                </button>
                <button onClick={() => setIsRegisterOpen(true)} className="action-primary">
                  <FontAwesomeIcon icon={faUserPlus} />
                  <span className="hidden sm:inline">Create account</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="hero-shell relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-25" />
        <div className="orb orb-a" />
        <div className="orb orb-b" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:pb-24 lg:pt-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
              Digital learning workspace
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Keep every resource
              <span className="gradient-text"> exactly where it belongs.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-7 text-indigo-100/90 sm:text-base">
              A clean, responsive resource hub for students and teachers to discover, organize, upload, rename,
              download, and manage course material without the clutter.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {user?.role === 'teacher' ? (
                <>
                  <button onClick={openUpload} className="hero-button">
                    <FontAwesomeIcon icon={faCloudUploadAlt} />
                    Upload to selected folder
                  </button>
                  <button onClick={() => setIsCreateTopicOpen(true)} className="hero-button-secondary">
                    <FontAwesomeIcon icon={faPlus} />
                    Create folder
                  </button>
                </>
              ) : (
                <button onClick={() => setIsLoginOpen(true)} className="hero-button">
                  <FontAwesomeIcon icon={faSignInAlt} />
                  Sign in to get started
                </button>
              )}
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="stat-card">
                <span>{topics.length}</span>
                <small>Folders</small>
              </div>
              <div className="stat-card">
                <span>{totalFiles}</span>
                <small>Resources</small>
              </div>
              <div className="stat-card hidden sm:block">
                <span>{user ? 'Active' : 'Open'}</span>
                <small>Workspace</small>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="profile-glass">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="absolute -inset-2 rounded-[30%] bg-indigo-400/25 blur-xl" />
                  <img
                    src={image}
                    alt="Prof. Chandan Kumar"
                    className="relative h-24 w-24 rounded-3xl object-cover shadow-2xl ring-4 ring-white/10 sm:h-28 sm:w-28"
                  />
                </div>
                <div className="min-w-0">
                  <span className="eyebrow">Professor & HOD</span>
                  <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Prof. Chandan Kumar</h2>
                  <p className="mt-1 text-sm text-indigo-100/80">Civil Engineering · GNA University</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="profile-stat">
                  <FontAwesomeIcon icon={faGraduationCap} />
                  <div><strong>Geotechnical</strong><span>Specialization</span></div>
                </div>
                <div className="profile-stat">
                  <FontAwesomeIcon icon={faAward} />
                  <div><strong>Autodesk</strong><span>Certification</span></div>
                </div>
                <div className="profile-stat">
                  <FontAwesomeIcon icon={faUniversity} />
                  <div><strong>GNA</strong><span>University</span></div>
                </div>
                <div className="profile-stat">
                  <FontAwesomeIcon icon={faChartLine} />
                  <div><strong>4+ Years</strong><span>Experience</span></div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <FontAwesomeIcon icon={faLightbulb} className="text-amber-300" />
                  Built for focus
                </div>
                <p className="mt-2 text-xs leading-6 text-indigo-100/70">
                  Select a folder once, then upload directly into it. Your students see the same structure instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto -mt-8 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {message && (
          <div className={`mb-6 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${
            messageType === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}>
            <FontAwesomeIcon icon={messageType === 'error' ? faExclamationCircle : faCheckCircle} />
            <span className="min-w-0 flex-1 text-sm font-medium">{message}</span>
            <button onClick={() => setMessage('')} className="grid h-7 w-7 place-items-center rounded-full hover:bg-black/5">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        )}

        <section className="surface-card p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="section-kicker">Resource library</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                  {topics.length} folder{topics.length === 1 ? '' : 's'}
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Course folders</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Pick a folder to open its resources. Teachers can create, edit, delete, and upload into the selected folder.
              </p>
            </div>

            {user?.role === 'teacher' && (
              <button onClick={() => setIsCreateTopicOpen(true)} className="secondary-button">
                <FontAwesomeIcon icon={faPlus} />
                New folder
              </button>
            )}
          </div>

          {topics.length === 0 ? (
            <div className="empty-state mt-8">
              <div className="empty-icon"><FontAwesomeIcon icon={faFolderOpen} /></div>
              <h3>No folders yet</h3>
              <p>{user?.role === 'teacher' ? 'Create your first folder to start organizing files.' : 'Your teacher has not added folders yet.'}</p>
              {user?.role === 'teacher' && (
                <button onClick={() => setIsCreateTopicOpen(true)} className="secondary-button mt-4">
                  <FontAwesomeIcon icon={faPlus} />
                  Create first folder
                </button>
              )}
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {topics.map((topic) => {
                const active = selectedTopic === topic._id;
                return (
                  <div
                    key={topic._id}
                    className={`folder-card group ${active ? 'folder-card-active' : ''}`}
                  >
                    <button type="button" onClick={() => setSelectedTopic(topic._id)} className="w-full text-left">
                      <div className="flex items-start justify-between gap-4">
                        <div className={`grid h-12 w-12 place-items-center rounded-2xl ring-1 ${active ? 'bg-indigo-600 text-white ring-indigo-500/20' : 'bg-indigo-50 text-indigo-600 ring-indigo-100'}`}>
                          <FontAwesomeIcon icon={topicIcon(topic.title)} />
                        </div>
                        {active && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600">Selected</span>}
                      </div>

                      <h3 className="mt-5 line-clamp-2 text-base font-bold text-slate-900">{topic.title}</h3>
                      <p className="mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-slate-500">
                        {topic.description || 'No description added for this folder.'}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-400">
                        <span>{topic.createdAt ? new Date(topic.createdAt).toLocaleDateString() : 'Folder'}</span>
                        <span className={active ? 'text-indigo-600' : 'text-slate-500'}>
                          {topicCounts[topic._id] ?? 0} file{topicCounts[topic._id] === 1 ? '' : 's'}
                        </span>
                      </div>
                    </button>

                    {user?.role === 'teacher' && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => {
                            setEditTopicId(topic._id);
                            setEditTopicTitle(topic.title);
                            setEditTopicDesc(topic.description || '');
                          }}
                          className="mini-button"
                        >
                          Edit
                        </button>
                        <button onClick={() => handleTopicDelete(topic._id)} className="mini-button mini-button-danger">
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="surface-card mt-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <span className="section-kicker">Files</span>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {selectedTopicObject?.title || 'Select a folder'}
                </h2>
                {selectedTopic && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                    {filteredFiles.length} file{filteredFiles.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">Open, rename, download, or manage the resources in the selected folder.</p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <label className="relative flex min-w-0 flex-1 xl:w-72">
                <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search files..."
                  className="input-field pl-10"
                />
              </label>
              {user?.role === 'teacher' && (
                <button onClick={openUpload} disabled={!selectedTopic} className="primary-button whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50">
                  <FontAwesomeIcon icon={faUpload} />
                  Upload files
                </button>
              )}
            </div>
          </div>

          {!selectedTopic ? (
            <div className="empty-state mt-8">
              <div className="empty-icon"><FontAwesomeIcon icon={faFolderOpen} /></div>
              <h3>Select a folder</h3>
              <p>Choose a course folder above to view its resources.</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="empty-state mt-8">
              <div className="empty-icon"><FontAwesomeIcon icon={faFileAlt} /></div>
              <h3>{searchQuery ? 'No matching files' : 'No files in this folder'}</h3>
              <p>{searchQuery ? 'Try another search term.' : user?.role === 'teacher' ? 'Upload the first resource into this folder.' : 'Files will appear here when your teacher uploads them.'}</p>
              {user?.role === 'teacher' && !searchQuery && (
                <button onClick={openUpload} className="primary-button mt-4">
                  <FontAwesomeIcon icon={faCloudUploadAlt} />
                  Upload first file
                </button>
              )}
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredFiles.map((file) => {
                const info = fileTypeInfo(file.fileType, file.originalName);
                const tone = toneClasses[info.tone];

                return (
                  <article key={file._id} className="file-card">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ${tone}`}>
                        <FontAwesomeIcon icon={info.icon} />
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black tracking-wider text-slate-500">{info.label}</span>
                    </div>

                    <h3 className="mt-5 min-h-[44px] break-words text-sm font-bold leading-6 text-slate-900">{file.originalName}</h3>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-400">
                      <span>{formatBytes(file.fileSize)}</span>
                      <span>•</span>
                      <span>{file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Uploaded'}</span>
                    </div>

                    {user?.role === 'teacher' && (
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setEditNameId(file._id);
                            setEditName(file.originalName || '');
                          }}
                          className="secondary-button text-xs"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleFileDelete(file._id)}
                          disabled={busyAction === `delete-file-${file._id}`}
                          className="danger-button text-xs"
                        >
                          {busyAction === `delete-file-${file._id}` ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faTrash} />}
                          Delete
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => handleDownload(file._id, file.originalName)}
                      disabled={isDownloading[file._id]}
                      className="download-button"
                    >
                      <FontAwesomeIcon icon={isDownloading[file._id] ? faSpinner : faDownload} className={isDownloading[file._id] ? 'animate-spin' : ''} />
                      {isDownloading[file._id] ? 'Preparing download…' : 'Download'}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {isUploadOpen && (
        <Modal title="Upload resources" icon={faCloudUploadAlt} onClose={() => !busyAction && setIsUploadOpen(false)} wide>
          <form onSubmit={handleFileUpload} className="p-5 sm:p-6">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Destination folder</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{topics.find((topic) => topic._id === uploadTopicId)?.title || 'Choose a folder'}</p>
                </div>
                <FontAwesomeIcon icon={faFolderOpen} className="text-indigo-500" />
              </div>

              <select
                value={uploadTopicId}
                onChange={(event) => setUploadTopicId(event.target.value)}
                className="input-field mt-4"
                disabled={busyAction === 'upload'}
              >
                <option value="">Choose a folder…</option>
                {topics.map((topic) => <option key={topic._id} value={topic._id}>{topic.title}</option>)}
              </select>
            </div>

            <div
              className={`dropzone mt-5 ${isDragging ? 'dropzone-active' : ''}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                validateFiles(event.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => validateFiles(event.target.files)}
              />
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                <FontAwesomeIcon icon={faCloudArrowUp} className="text-xl" />
              </div>
              <h4 className="mt-4 text-base font-bold text-slate-900">Drop files here</h4>
              <p className="mt-1 text-sm text-slate-500">or choose them from your device</p>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="secondary-button mt-4">
                <FontAwesomeIcon icon={faUpload} />
                Browse files
              </button>
              <p className="mt-3 text-[11px] font-medium text-slate-400">
                Up to {MAX_FILES_PER_UPLOAD} files · {MAX_FILE_SIZE_MB} MB each
              </p>
            </div>

            {uploadFiles.length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">{uploadFiles.length} selected</p>
                  <button type="button" className="text-xs font-bold text-rose-500 hover:text-rose-700" onClick={() => setUploadFiles([])}>Clear all</button>
                </div>

                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {uploadFiles.map((file) => (
                    <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm">
                        <FontAwesomeIcon icon={fileTypeInfo(file.type, file.name).icon} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-800">{file.name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{formatBytes(file.size)}</p>
                      </div>
                      <button type="button" onClick={() => setUploadFiles((current) => current.filter((item) => item !== file))} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-white hover:text-rose-500">
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setIsUploadOpen(false)} className="secondary-button" disabled={busyAction === 'upload'}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={busyAction === 'upload' || !uploadFiles.length || !uploadTopicId}>
                <FontAwesomeIcon icon={busyAction === 'upload' ? faSpinner : faUpload} className={busyAction === 'upload' ? 'animate-spin' : ''} />
                {busyAction === 'upload' ? 'Uploading…' : `Upload ${uploadFiles.length || ''} ${uploadFiles.length === 1 ? 'file' : 'files'}`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isCreateTopicOpen && (
        <Modal title="Create new folder" icon={faFolderOpen} onClose={() => !busyAction && setIsCreateTopicOpen(false)}>
          <form onSubmit={handleCreateTopic} className="p-5 sm:p-6">
            <label className="field-label">Folder name</label>
            <input value={newTopicTitle} onChange={(event) => setNewTopicTitle(event.target.value)} className="input-field" placeholder="e.g. Structural Engineering" autoFocus />

            <label className="field-label mt-4">Description</label>
            <textarea value={newTopicDesc} onChange={(event) => setNewTopicDesc(event.target.value)} className="input-field min-h-28 resize-none" placeholder="Add a short description so students know what belongs here." />

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setIsCreateTopicOpen(false)} className="secondary-button">Cancel</button>
              <button type="submit" disabled={busyAction === 'create-topic'} className="primary-button">
                <FontAwesomeIcon icon={busyAction === 'create-topic' ? faSpinner : faPlus} className={busyAction === 'create-topic' ? 'animate-spin' : ''} />
                {busyAction === 'create-topic' ? 'Creating…' : 'Create folder'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editTopicId && (
        <Modal title="Edit folder" icon={faFolderOpen} onClose={() => !busyAction && setEditTopicId('')}>
          <form onSubmit={handleTopicEditSubmit} className="p-5 sm:p-6">
            <label className="field-label">Folder name</label>
            <input value={editTopicTitle} onChange={(event) => setEditTopicTitle(event.target.value)} className="input-field" autoFocus />

            <label className="field-label mt-4">Description</label>
            <textarea value={editTopicDesc} onChange={(event) => setEditTopicDesc(event.target.value)} className="input-field min-h-28 resize-none" />

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditTopicId('')} className="secondary-button">Cancel</button>
              <button type="submit" disabled={busyAction === 'edit-topic'} className="primary-button">
                <FontAwesomeIcon icon={busyAction === 'edit-topic' ? faSpinner : faCheckCircle} className={busyAction === 'edit-topic' ? 'animate-spin' : ''} />
                {busyAction === 'edit-topic' ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editNameId && (
        <Modal title="Rename file" icon={faFileAlt} onClose={() => !busyAction && setEditNameId('')}>
          <form onSubmit={handleFileEditSubmit} className="p-5 sm:p-6">
            <label className="field-label">New file name</label>
            <input value={editName} onChange={(event) => setEditName(event.target.value)} className="input-field" autoFocus />

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditNameId('')} className="secondary-button">Cancel</button>
              <button type="submit" disabled={busyAction === 'edit-file'} className="primary-button">
                <FontAwesomeIcon icon={busyAction === 'edit-file' ? faSpinner : faCheckCircle} className={busyAction === 'edit-file' ? 'animate-spin' : ''} />
                {busyAction === 'edit-file' ? 'Saving…' : 'Rename file'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isLoginOpen && (
        <Modal title={isTeacherKeyLogin ? 'Teacher access' : 'Welcome back'} icon={isTeacherKeyLogin ? faLock : faSignInAlt} onClose={() => !busyAction && setIsLoginOpen(false)}>
          <form onSubmit={handleLogin} className="p-5 sm:p-6">
            {isTeacherKeyLogin ? (
              <>
                <p className="text-sm leading-6 text-slate-500">Use your teacher access key to open the teacher workspace.</p>
                <label className="field-label mt-5">Teacher access key</label>
                <input type="password" value={teacherLoginKey} onChange={(event) => setTeacherLoginKey(event.target.value)} className="input-field" placeholder="Enter access key" autoFocus required />
              </>
            ) : (
              <>
                <label className="field-label">Email address</label>
                <input type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} className="input-field" placeholder="you@example.com" autoFocus required />

                <label className="field-label mt-4">Password</label>
                <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} className="input-field" placeholder="••••••••" required />
              </>
            )}

            <button type="button" onClick={() => setIsTeacherKeyLogin((current) => !current)} className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800">
              {isTeacherKeyLogin ? 'Use email and password instead' : 'Teacher access with key'}
            </button>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setIsLoginOpen(false)} className="secondary-button">Cancel</button>
              <button type="submit" disabled={busyAction === 'login'} className="primary-button">
                <FontAwesomeIcon icon={busyAction === 'login' ? faSpinner : faSignInAlt} className={busyAction === 'login' ? 'animate-spin' : ''} />
                {busyAction === 'login' ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isRegisterOpen && (
        <Modal title="Create your account" icon={faUserPlus} onClose={() => !busyAction && setIsRegisterOpen(false)}>
          <form onSubmit={handleRegister} className="p-5 sm:p-6">
            <label className="field-label">Full name</label>
            <input value={registerName} onChange={(event) => setRegisterName(event.target.value)} className="input-field" placeholder="Your name" autoFocus required />

            <label className="field-label mt-4">Email address</label>
            <input type="email" value={registerEmail} onChange={(event) => setRegisterEmail(event.target.value)} className="input-field" placeholder="you@example.com" required />

            <label className="field-label mt-4">Password</label>
            <input type="password" minLength={6} value={registerPassword} onChange={(event) => setRegisterPassword(event.target.value)} className="input-field" placeholder="At least 6 characters" required />

            <label className="field-label mt-4">Account type</label>
            <select value={registerRole} onChange={(event) => setRegisterRole(event.target.value)} className="input-field">
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>

            {registerRole === 'teacher' && (
              <>
                <label className="field-label mt-4">Teacher access key</label>
                <input type="password" value={teacherKey} onChange={(event) => setTeacherKey(event.target.value)} className="input-field" placeholder="Required for teacher registration" required />
              </>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setIsRegisterOpen(false)} className="secondary-button">Cancel</button>
              <button type="submit" disabled={busyAction === 'register'} className="primary-button">
                <FontAwesomeIcon icon={busyAction === 'register' ? faSpinner : faUserPlus} className={busyAction === 'register' ? 'animate-spin' : ''} />
                {busyAction === 'register' ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default App;
