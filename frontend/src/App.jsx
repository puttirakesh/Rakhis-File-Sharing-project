<<<<<<< HEAD
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
=======
import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudUploadAlt, faCalculator,
  faFlask,
  faLanguage,
  faFilePdf,
  faFileWord,
  faFilePowerpoint,
  faDownload,
  faTimes,
  faEdit,
  faTrash,
  faUser,
  faSignOutAlt,
  faSignInAlt,
  faUserPlus,
  faSpinner,
  faLock,
  faGraduationCap,
  faAward,
  faUniversity,
  faChartLine, faFolderOpen, faCheckCircle, faExclamationCircle, faFileAlt, faLightbulb,
} from '@fortawesome/free-solid-svg-icons';

import image from './assets/chandan-kumar.jpg';

// In your frontend, use environment variables
// const API_URL = 'https://chandan-kumars-educational-resource-hub.onrender.com/api';

const API_URL = 'http://localhost:5000';
const fetchDefaults = {
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include'
};

function App() {
  const [topics, setTopics] = useState([]);
  const [files, setFiles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [uploadTopicId, setUploadTopicId] = useState('');
  const [editNameId, setEditNameId] = useState('');
  const [editName, setEditName] = useState('');
  const [editTopicId, setEditTopicId] = useState('');
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [editTopicDesc, setEditTopicDesc] = useState('');
  const [user, setUser] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('student'); // Default to student
  const [teacherKey, setTeacherKey] = useState('');
  const [isDownloading, setIsDownloading] = useState({}); // Track downloading state per file
  const [teacherLoginKey, setTeacherLoginKey] = useState(''); // For special teacher login with key
  const [isTeacherKeyLogin, setIsTeacherKeyLogin] = useState(false); // Toggle for teacher key login mode

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setUser(JSON.parse(userData));
      setAuthToken(token);
    }

    fetchTopics();
  }, []);

  const setAuthToken = (token) => {
    if (token) {
      fetchDefaults.headers = {
        ...fetchDefaults.headers,
        'Authorization': `Bearer ${token}`
      };
    } else {
      delete fetchDefaults.headers['Authorization'];
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch(`${API_URL}/api/topics`);
      if (!res.ok) throw new Error('Failed to fetch topics');
      const data = await res.json();
      setTopics(data);
      if (data.length > 0 && !selectedTopic) setSelectedTopic(data[0]._id);
    } catch (err) {
      console.error('Error fetching topics:', err);
      setMessage('Failed to load topics');
    }
  };

  const fetchFiles = async (topicId) => {
    try {
      const res = await fetch(`${API_URL}/api/topics/${topicId}/files`);
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      console.error('Error fetching files:', err);
      setMessage('Failed to load files');
    }
  };

  useEffect(() => {
    if (selectedTopic) {
      fetchFiles(selectedTopic);
      setUploadTopicId(selectedTopic);
    }
  }, [selectedTopic]);

  const topicIcons = (name) => {
    if (name.toLowerCase().includes('math')) return faCalculator;
    if (name.toLowerCase().includes('science')) return faFlask;
    if (name.toLowerCase().includes('language')) return faLanguage;
    return faCloudUploadAlt;
  };

  const handleCreateTopic = async () => {
    if (!newTopicTitle) {
      setMessage('Topic title is required');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/topics`, {
        method: "POST",
        headers: fetchDefaults.headers,
        body: JSON.stringify({ title: newTopicTitle, description: newTopicDesc })
      });
      if (res.status === 401 || res.status === 403) {
        setMessage('Please login as a teacher to create topics');
        return;
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to create topic');
      }
      const data = await res.json();
      setTopics([data, ...topics]);
      setNewTopicTitle('');
      setNewTopicDesc('');
      setSelectedTopic(data._id);
      setMessage('Topic created successfully!');
    } catch (err) {
      console.error('Create topic error:', err);
      setMessage(err.message || 'Failed to create topic');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFiles.length || !uploadTopicId) {
      setMessage('Please select files and a topic');
      return;
    }

    const formData = new FormData();
    Array.from(uploadFiles).forEach(file => {
      formData.append('files', file);
    });
    formData.append('topicId', uploadTopicId);

    const { 'Content-Type': _, ...headers } = fetchDefaults.headers;

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (res.status === 401 || res.status === 403) {
        setMessage('Please login as a teacher to upload files');
        return;
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to upload files');
      }
      const uploadedFiles = await res.json();
      setMessage('Files uploaded successfully!');
      setIsModalOpen(false);
      setUploadFiles([]);
      setFiles([...uploadedFiles, ...files]);
    } catch (err) {
      console.error('Upload error:', err);
      setMessage(err.message || 'Failed to upload files');
    }
  };

  const handleFileDownload = async (fileId, fileName) => {
    setIsDownloading(prev => ({ ...prev, [fileId]: true }));
    try {
      const res = await fetch(`${API_URL}/api/download/${fileId}`, {
        headers: fetchDefaults.headers,
        // Ensure response is treated as a blob
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error('Please login to download files');
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to download file');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMessage('File downloaded successfully!');
    } catch (err) {
      console.error('Download error:', err.message);
      setMessage(err.message || 'Failed to download file');
    } finally {
      setIsDownloading(prev => ({ ...prev, [fileId]: false }));
>>>>>>> 8678e181a408c854c1a2f3a6a60ea54319b81b6f
    }
  };

  const handleFileDelete = async (fileId) => {
<<<<<<< HEAD
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
=======
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      const res = await fetch(`${API_URL}/api/files/${fileId}`, {
        method: 'DELETE',
        headers: fetchDefaults.headers
      });
      if (res.status === 401 || res.status === 403) {
        setMessage('Please login as a teacher to delete files');
        return;
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete file');
      }
      await res.json();
      setFiles(files.filter(f => f._id !== fileId));
      setMessage('File deleted successfully!');
    } catch (err) {
      console.error('Download error:', err);
      setMessage(err.message || 'Failed to download file');
    }
  };

  const handleTopicDelete = async (topicId) => {
    if (!window.confirm('Are you sure you want to delete this topic and all its files?')) return;

    try {
      const res = await fetch(`${API_URL}/api/topics/${topicId}`, {
        method: 'DELETE',
        headers: fetchDefaults.headers
      });
      if (res.status === 401 || res.status === 403) {
        setMessage('Please login as a teacher to delete topics');
        return;
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete topic');
      }
      await res.json();
      setTopics(topics.filter(t => t._id !== topicId));
      if (selectedTopic === topicId) {
        setSelectedTopic(topics.length > 1 ? topics[0]._id : '');
        setFiles([]);
      }
      setMessage('Topic and all files deleted successfully!');
    } catch (err) {
      console.error('Delete topic error:', err);
      setMessage(err.message || 'Failed to delete topic');
    }
  };

  const handleFileEditPrompt = (fileId, oldName) => {
    setEditNameId(fileId);
    setEditName(oldName);
  };

  const handleFileEditSubmit = async () => {
    if (!editName) {
      setMessage('File name is required');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/files/${editNameId}`, {
        method: "PUT",
        headers: fetchDefaults.headers,
        body: JSON.stringify({ newName: editName }),
      });
      if (res.status === 401 || res.status === 403) {
        setMessage('Please login as a teacher to edit files');
        return;
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to update file name');
      }
      const updatedFile = await res.json();
      setFiles(files.map(f => f._id === editNameId ? updatedFile : f));
      setEditName('');
      setEditNameId('');
      setMessage('File name updated successfully!');
    } catch (err) {
      console.error('Edit file error:', err);
      setMessage(err.message || 'Failed to update file name');
    }
  };

  const handleTopicEditSubmit = async () => {
    if (!editTopicTitle) {
      setMessage('Topic title is required');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/topics/${editTopicId}`, {
        method: "PUT",
        headers: fetchDefaults.headers,
        body: JSON.stringify({ title: editTopicTitle, description: editTopicDesc }),
      });
      if (res.status === 401 || res.status === 403) {
        setMessage('Please login as a teacher to edit topics');
        return;
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to update topic');
      }
      const updatedTopic = await res.json();
      setTopics(topics.map(t => t._id === editTopicId ? updatedTopic : t));
      setEditTopicId('');
      setEditTopicTitle('');
      setEditTopicDesc('');
      setMessage('Topic updated successfully!');
    } catch (err) {
      console.error('Edit topic error:', err);
      setMessage(err.message || 'Failed to update topic');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      let body = { email: loginEmail, password: loginPassword };
      if (isTeacherKeyLogin) {
        body = { teacherKey: teacherLoginKey }; // Special key-only login for teacher
      }
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setAuthToken(data.token);
        setIsLoginModalOpen(false);
        if (isTeacherKeyLogin) {
          setTeacherLoginKey('');
        } else {
          setLoginEmail('');
          setLoginPassword('');
        }
        setMessage('Login successful!');
      } else {
        setMessage(data.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setMessage('Login failed. Please try again.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
          role: registerRole,
          teacherKey: registerRole === 'teacher' ? teacherKey : undefined
        })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setAuthToken(data.token);
        setIsRegisterModalOpen(false);
        setRegisterName('');
        setRegisterEmail('');
        setRegisterPassword('');
        setTeacherKey('');
        setMessage('Registration successful!');
      } else {
        setMessage(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Register error:', err);
      setMessage('Registration failed. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setAuthToken(null);
    setFiles([]);
    setSelectedTopic('');
    setMessage('Logged out successfully');
  };

  const toggleTeacherKeyLogin = () => {
    setIsTeacherKeyLogin(!isTeacherKeyLogin);
    setLoginEmail('');
    setLoginPassword('');
    setTeacherLoginKey('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-100">
      {/* Enhanced Navigation */}
      <nav className="bg-gradient-to-r from-indigo-700 via-blue-700 to-purple-700 text-white shadow-lg relative overflow-hidden border-b border-indigo-500/20">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -left-4 w-28 h-28 bg-white/10 rounded-full"></div>
          <div className="absolute top-10 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/10 rounded-full"></div>
        </div>

        <div className="container mx-auto px-4 py-3 flex justify-between items-center relative z-10">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-full shadow-lg">
              <FontAwesomeIcon icon={faCloudUploadAlt} className="text-xl" />
            </div>
            <h1 className="text-xl font-semibold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">
              Chandan Kumar's Educational Resource Hub
            </h1>
          </div>
          <div className="flex space-x-3 items-center">
            {user ? (
              <>
                <span className="flex items-center bg-white bg-opacity-15 backdrop-blur-sm px-3 py-1.5 rounded-full shadow text-sm">
                  <FontAwesomeIcon icon={faUser} className="mr-1.5 text-sm" />
                  {user.name} ({user.role})
                </span>
                {user.role === 'teacher' && (
                  <button
                    className="bg-white bg-opacity-15 hover:bg-opacity-25 backdrop-blur-sm px-4 py-2 rounded-full transition-all duration-200 shadow hover:shadow-md flex items-center group text-sm"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <FontAwesomeIcon icon={faCloudUploadAlt} className="mr-1.5 group-hover:animate-bounce" />
                    Upload
                  </button>
                )}
                <button
                  className="bg-white bg-opacity-15 hover:bg-opacity-25 backdrop-blur-sm px-4 py-2 rounded-full transition-all duration-200 shadow hover:shadow-md flex items-center group text-sm"
                  onClick={handleLogout}
                >
                  <FontAwesomeIcon icon={faSignOutAlt} className="mr-1.5" />
                  Logout
>>>>>>> 8678e181a408c854c1a2f3a6a60ea54319b81b6f
                </button>
              </>
            ) : (
              <>
<<<<<<< HEAD
                <button onClick={() => setIsLoginOpen(true)} className="action-ghost">
                  <FontAwesomeIcon icon={faSignInAlt} />
                  <span className="hidden sm:inline">Login</span>
                </button>
                <button onClick={() => setIsRegisterOpen(true)} className="action-primary">
                  <FontAwesomeIcon icon={faUserPlus} />
                  <span className="hidden sm:inline">Create account</span>
=======
                <button
                  className="bg-white bg-opacity-15 hover:bg-opacity-25 backdrop-blur-sm px-4 py-2 rounded-full transition-all duration-200 shadow hover:shadow-md flex items-center group text-sm"
                  onClick={() => setIsLoginModalOpen(true)}
                >
                  <FontAwesomeIcon icon={faSignInAlt} className="mr-1.5" />
                  Login
                </button>
                <button
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4 py-2 rounded-full transition-all duration-200 shadow hover:shadow-md flex items-center group text-sm"
                  onClick={() => setIsRegisterModalOpen(true)}
                >
                  <FontAwesomeIcon icon={faUserPlus} className="mr-1.5" />
                  Register
>>>>>>> 8678e181a408c854c1a2f3a6a60ea54319b81b6f
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

<<<<<<< HEAD
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
=======
      {/* Professional Header Section */}
      <header className="relative overflow-hidden bg-gradient-to-r from-indigo-700 via-blue-700 to-purple-700 text-white pt-12 pb-20 px-6">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px'
          }}></div>
        </div>

        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
          <div className="md:w-1/2">
            <div className="mb-6">
              <span className="text-xs font-medium bg-white/20 px-3 py-1.5 rounded-full inline-block mb-3 tracking-wide">HOD & ASSISTANT PROFESSOR</span>
              <h2 className="text-4xl font-bold mb-4 leading-tight">Prof. Chandan Kumar</h2>
              <div className="w-16 h-0.5 bg-blue-300 mb-6"></div>
            </div>
            <p className="text-base leading-relaxed mb-8 text-blue-100">
              Head of the Department of Civil Engineering at GNA University, Phagwara. Specializing in Geotechnical Engineering with extensive academic and research experience.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start">
                <div className="bg-white/10 p-2 rounded-lg mr-3">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-blue-200 text-sm" />
                </div>
                <div>
                  <p className="font-medium text-sm">Specialization</p>
                  <p className="text-blue-100 text-sm">Geotechnical Engineering</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-white/10 p-2 rounded-lg mr-3">
                  <FontAwesomeIcon icon={faAward} className="text-blue-200 text-sm" />
                </div>
                <div>
                  <p className="font-medium text-sm">Certifications</p>
                  <p className="text-blue-100 text-sm">Autodesk Certified</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-white/10 p-2 rounded-lg mr-3">
                  <FontAwesomeIcon icon={faUniversity} className="text-blue-200 text-sm" />
                </div>
                <div>
                  <p className="font-medium text-sm">University</p>
                  <p className="text-blue-100 text-sm">GNA University</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-white/10 p-2 rounded-lg mr-3">
                  <FontAwesomeIcon icon={faChartLine} className="text-blue-200 text-sm" />
                </div>
                <div>
                  <p className="font-medium text-sm">Experience</p>
                  <p className="text-blue-100 text-sm">4+ Years</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-white/10 p-2 rounded-lg mr-3">
                  <FontAwesomeIcon icon={faLightbulb} className="text-blue-200 text-sm" />
                </div>
                <div>
                  <p className="font-medium text-sm">Expertise</p>
                  <p className="text-blue-100 text-sm">Teaching, research, consultancy services, innovative construction practices, and sustainable technologies</p>
                </div>
              </div>
            </div>
          </div>
          <div className="md:w-2/5 relative flex justify-center">
            <div className="relative w-56 h-56">
              {/* Decorative circles */}
              <div className="absolute -inset-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transform rotate-3 opacity-20"></div>
              <div className="absolute -inset-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transform -rotate-3 opacity-30"></div>

              {/* Circular image container */}
              <div className="relative rounded-full shadow-xl overflow-hidden w-full h-full transform transition-transform duration-500 z-10 border-4 border-white/90">
                <img
                  src={image}
                  alt="Chandan Kumar"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Profile badge - Fixed positioning with higher z-index */}
              <div className="absolute -bottom-2 -right-2 bg-white text-indigo-900 p-2 rounded-lg shadow-md border border-indigo-100 z-20">
                <p className="font-bold text-xs">Prof. Chandan Kumar</p>
                <p className="text-xs text-indigo-600">HOD Civil Engineering</p>
              </div>

              {/* Decorative elements around the circle */}
              <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-yellow-400 opacity-80 animate-bounce z-10"></div>
              <div className="absolute -bottom-2 -left-2 w-5 h-5 rounded-full bg-green-400 opacity-80 animate-ping z-10" style={{ animationDelay: '1s' }}></div>
              <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-pink-400 opacity-80 animate-pulse z-10"></div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="relative block w-full h-16"
          >
            <path
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
              opacity=".25"
              className="fill-current text-white"
            ></path>
            <path
              d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
              opacity=".5"
              className="fill-current text-white"
            ></path>
            <path
              d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
              className="fill-current text-white"
            ></path>
          </svg>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-8 -mt-12 relative z-20">
        {/* Message Alert */}
        {message && (
          <div className="mb-6">
            <div className={`px-4 py-3 rounded-lg relative shadow-md ${message.includes('Failed') || message.includes('Error') || message.includes('Invalid') ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`} role="alert">
              <div className="flex items-center">
                <FontAwesomeIcon
                  icon={message.includes('Failed') || message.includes('Error') || message.includes('Invalid') ? faExclamationCircle : faCheckCircle}
                  className={`mr-2 ${message.includes('Failed') || message.includes('Error') || message.includes('Invalid') ? 'text-red-500' : 'text-green-500'}`}
                />
                <span className="text-sm font-medium">{message}</span>
                <button className="ml-auto text-gray-500 hover:text-gray-700" onClick={() => setMessage('')}>
                  <FontAwesomeIcon icon={faTimes} className="fill-current h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100 transform hover:shadow-xl transition-all duration-300">
          {/* Topics Section */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faFolderOpen} className="mr-3 text-indigo-700" />
              Course Topics
            </h2>
            <div className="text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-full">{topics.length} topics available</div>
          </div>

          {user && user.role === 'teacher' && (
            <div className="bg-gradient-to-r from-gray-50 to-white p-5 rounded-xl mb-6 border border-gray-200 shadow-inner">
              <h3 className="text-md font-semibold text-gray-800 mb-4">Add New Topic</h3>
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  className="border border-gray-300 rounded-lg px-4 py-2.5 flex-grow focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm placeholder-gray-400 transition-all duration-200"
                  value={newTopicTitle}
                  placeholder="Enter Topic Title"
                  onChange={e => setNewTopicTitle(e.target.value)}
                />
                <input
                  className="border border-gray-300 rounded-lg px-4 py-2.5 flex-grow focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm placeholder-gray-400 transition-all duration-200"
                  value={newTopicDesc}
                  placeholder="Enter Topic Description"
                  onChange={e => setNewTopicDesc(e.target.value)}
                />
                <button
                  className="bg-indigo-700 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-800 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg transform hover:-translate-y-1"
                  onClick={handleCreateTopic}
                >
                  Add Topic
                </button>
              </div>
            </div>
          )}

          {topics.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map(topic => (
                <div key={topic._id} className="relative group border border-gray-200 rounded-xl bg-white hover:border-indigo-400 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md">
                  {user && user.role === 'teacher' && (
                    <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <button
                        className="bg-blue-100 text-blue-700 hover:bg-blue-200 p-2 rounded-full transition-all duration-200"
                        onClick={() => {
                          setEditTopicId(topic._id);
                          setEditTopicTitle(topic.title);
                          setEditTopicDesc(topic.description || '');
                        }}
                        title="Edit Topic"
                      >
                        <FontAwesomeIcon icon={faEdit} size="sm" />
                      </button>
                      <button
                        className="bg-red-100 text-red-700 hover:bg-red-200 p-2 rounded-full transition-all duration-200"
                        onClick={() => handleTopicDelete(topic._id)}
                        title="Delete Topic"
                      >
                        <FontAwesomeIcon icon={faTrash} size="sm" />
                      </button>
                    </div>
                  )}
                  <button
                    className={`w-full text-left p-5 transition-all duration-300 ${selectedTopic === topic._id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedTopic(topic._id)}
                  >
                    <div className="flex items-center mb-4">
                      <div className="bg-indigo-100 p-3 rounded-lg mr-4 shadow-md">
                        <FontAwesomeIcon icon={topicIcons(topic.title)} className="text-indigo-700 text-xl" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-lg">{topic.title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{topic.description || 'No description available'}</p>
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
                      <span className="text-indigo-700">{files.filter(f => f.topic.toString() === topic._id).length} files</span>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <div className="bg-gray-200 inline-block p-5 rounded-full mb-4">
                <FontAwesomeIcon icon={faFolderOpen} className="text-gray-500 text-3xl" />
              </div>
              <p className="text-gray-600 text-base">No topics available. {user && user.role === 'teacher' ? 'Create one to get started!' : 'Please contact your instructor for materials.'}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 transform hover:shadow-xl transition-all duration-300">
          {/* Files Section */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faFileAlt} className="mr-3 text-green-700" />
              {topics.find(t => t._id === selectedTopic)?.title || 'All'} Files
            </h2>
            <div className="text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
              {files.filter(f => !selectedTopic || f.topic.toString() === selectedTopic).length} files
            </div>
          </div>

          {files.filter(f => !selectedTopic || f.topic.toString() === selectedTopic).length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <div className="bg-gray-200 inline-block p-5 rounded-full mb-4">
                <FontAwesomeIcon icon={faFileAlt} className="text-gray-500 text-3xl" />
              </div>
              <p className="text-gray-600 text-base">No files found. {user && user.role === 'teacher' ? 'Upload some files to get started.' : 'Files will appear here once uploaded.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {files.filter(f => !selectedTopic || f.topic.toString() === selectedTopic).map(file => (
                <div key={file._id} className="border border-gray-200 rounded-xl bg-white hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start mb-5">
                      <div className={`p-3 rounded-lg mr-4 shadow-md ${file.fileType.includes('pdf') ? 'bg-red-100 text-red-700' :
                        file.fileType.includes('word') || file.fileType.includes('doc') ? 'bg-blue-100 text-blue-700' :
                          file.fileType.includes('powerpoint') || file.fileType.includes('presentation') || file.fileType.includes('ppt') ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                        <FontAwesomeIcon
                          icon={
                            file.fileType.includes('pdf') ? faFilePdf :
                              file.fileType.includes('word') || file.fileType.includes('doc') ? faFileWord :
                                file.fileType.includes('powerpoint') || file.fileType.includes('presentation') || file.fileType.includes('ppt') ? faFilePowerpoint :
                                  faFileAlt
                          }
                          className="text-xl"
                        />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h3 className="font-medium text-gray-900 text-base break-words line-clamp-2">{file.originalName}</h3>
                        <p className="text-gray-500 text-xs mt-1">
                          {Math.round((file.fileSize || 0) / 1024)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {user && user.role === 'teacher' && (
                      <div className="flex space-x-3 mb-5">
                        <button
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center"
                          onClick={() => handleFileEditPrompt(file._id, file.originalName)}
                        >
                          <FontAwesomeIcon icon={faEdit} className="mr-2" />
                          Rename
                        </button>
                        <button
                          className="bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center"
                          onClick={() => handleFileDelete(file._id)}
                        >
                          <FontAwesomeIcon icon={faTrash} className="mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => handleFileDownload(file._id, file.originalName)}
                      className="w-full bg-green-700 text-white py-2.5 px-5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isDownloading[file._id]}
                    >
                      {isDownloading[file._id] ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faDownload} className="mr-2" />
                          Download
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals (unchanged functionality, improved styling) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setIsModalOpen(false);
            setUploadFiles([]);
          }}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-800">Upload Files</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setUploadFiles([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form className="p-4" onSubmit={handleFileUpload}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Topic</label>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  value={uploadTopicId}
                  onChange={e => setUploadTopicId(e.target.value)}
                  required
                >
                  <option value="">Choose a topic...</option>
                  {topics.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Files</label>
                <input
                  type="file"
                  multiple
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 text-sm"
                  onChange={e => setUploadFiles(e.target.files)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">You can select multiple files at once</p>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setUploadFiles([]);
                  }}
                  className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition-colors duration-200 text-sm font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium"
                >
                  Upload Files
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit File Name Modal */}
      {editNameId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => { setEditNameId(''); setEditName(''); }}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Rename File</h3>
              <input
                type="text"
                className="border border-gray-300 rounded-lg w-full p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition-colors duration-200 text-sm font-medium hover:bg-gray-300"
                  onClick={() => { setEditNameId(''); setEditName(''); }}
                >
                  Cancel
                </button>
                <button
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium"
                  onClick={handleFileEditSubmit}
                >
                  Save Changes
                </button>
>>>>>>> 8678e181a408c854c1a2f3a6a60ea54319b81b6f
              </div>
            </div>
          </div>
        </div>
<<<<<<< HEAD
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
=======
      )}

      {/* Edit Topic Modal */}
      {editTopicId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => { setEditTopicId(''); setEditTopicTitle(''); setEditTopicDesc(''); }}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Topic</h3>
              <input
                type="text"
                className="border border-gray-300 rounded-lg w-full p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                value={editTopicTitle}
                onChange={e => setEditTopicTitle(e.target.value)}
                placeholder="Topic Title"
                autoFocus
              />
              <input
                type="text"
                className="border border-gray-300 rounded-lg w-full p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                value={editTopicDesc}
                onChange={e => setEditTopicDesc(e.target.value)}
                placeholder="Topic Description"
              />
              <div className="flex justify-end space-x-2">
                <button
                  className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition-colors duration-200 text-sm font-medium hover:bg-gray-300"
                  onClick={() => { setEditTopicId(''); setEditTopicTitle(''); setEditTopicDesc(''); }}
                >
                  Cancel
                </button>
                <button
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium"
                  onClick={handleTopicEditSubmit}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsLoginModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-800">Login</h3>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form className="p-4" onSubmit={handleLogin}>
              {isTeacherKeyLogin ? (
                <>
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FontAwesomeIcon icon={faLock} className="mr-2 text-indigo-600" />
                      Teacher Access Key
                    </label>
                    <input
                      type="password"
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      value={teacherLoginKey}
                      onChange={e => setTeacherLoginKey(e.target.value)}
                      placeholder="Enter teacher access key"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
              {!isTeacherKeyLogin && (
                <button
                  type="button"
                  onClick={toggleTeacherKeyLogin}
                  className="w-full text-indigo-600 hover:text-indigo-800 text-xs mb-3 underline text-right"
                >
                  Teacher access with key?
                </button>
              )}
              {isTeacherKeyLogin && (
                <button
                  type="button"
                  onClick={toggleTeacherKeyLogin}
                  className="w-full text-indigo-600 hover:text-indigo-800 text-xs mb-3 underline text-right"
                >
                  Use email/password instead
                </button>
              )}
              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition-colors duration-200 text-sm font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium"
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsRegisterModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-800">Create Account</h3>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form className="p-4" onSubmit={handleRegister}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  value={registerName}
                  onChange={e => setRegisterName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  value={registerEmail}
                  onChange={e => setRegisterEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  value={registerPassword}
                  onChange={e => setRegisterPassword(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  value={registerRole}
                  onChange={e => setRegisterRole(e.target.value)}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              {registerRole === 'teacher' && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <FontAwesomeIcon icon={faLock} className="mr-2 text-indigo-600" />
                    Teacher Access Key
                  </label>
                  <input
                    type="password"
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    value={teacherKey}
                    onChange={e => setTeacherKey(e.target.value)}
                    placeholder="Enter teacher access key"
                    required
                  />
                </div>
              )}
              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition-colors duration-200 text-sm font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
>>>>>>> 8678e181a408c854c1a2f3a6a60ea54319b81b6f
      )}
    </div>
  );
}

<<<<<<< HEAD
export default App;
=======
export default App;
>>>>>>> 8678e181a408c854c1a2f3a6a60ea54319b81b6f
