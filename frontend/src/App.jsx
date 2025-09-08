import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudUploadAlt,
  faCalculator,
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
} from '@fortawesome/free-solid-svg-icons';

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
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
        headers: fetchDefaults.headers
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
      console.error('Download error:', err);
      setMessage(err.message || 'Failed to download file');
    } finally {
      setIsDownloading(prev => ({ ...prev, [fileId]: false }));
    }
  };

  const handleFileDelete = async (fileId) => {
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
      <nav className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white shadow-2xl">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-full shadow-lg animate-pulse">
              <FontAwesomeIcon icon={faCloudUploadAlt} className="text-2xl" />
            </div>
            <h1 className="text-2xl font-bold tracking-wide">Chandan Kumar's File Sharing Portal 💫</h1>
          </div>
          <div className="flex space-x-4 items-center">
            {user ? (
              <>
                <span className="flex items-center bg-white bg-opacity-20 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
                  {user.name} ({user.role})
                </span>
                {user.role === 'teacher' && (
                  <button
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm px-6 py-3 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <FontAwesomeIcon icon={faCloudUploadAlt} className="mr-2" />
                    Upload Files
                  </button>
                )}
                <button
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm px-6 py-3 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center"
                  onClick={handleLogout}
                >
                  <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm px-6 py-3 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center"
                  onClick={() => setIsLoginModalOpen(true)}
                >
                  <FontAwesomeIcon icon={faSignInAlt} className="mr-2" />
                  Login
                </button>
                <button
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm px-6 py-3 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center"
                  onClick={() => setIsRegisterModalOpen(true)}
                >
                  <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {message && (
        <div className="container mx-auto mt-4 px-4">
          <div className={`px-6 py-4 rounded-xl relative shadow-lg animate-bounce-in ${message.includes('Failed') || message.includes('Error') || message.includes('Invalid') ? 'bg-red-50 border-2 border-red-200 text-red-800' : 'bg-green-50 border-2 border-green-200 text-green-800'}`} role="alert">
            <span className="block sm:inline">{message}</span>
            <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setMessage('')}>
              <FontAwesomeIcon icon={faTimes} className="fill-current h-5 w-5 text-gray-500 hover:text-gray-700 cursor-pointer" />
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-8 border border-white/50">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center">
            <FontAwesomeIcon icon={faCloudUploadAlt} className="mr-3 text-indigo-600" />
            Topics
          </h2>
          {user && user.role === 'teacher' && (
            <div className="flex flex-col md:flex-row gap-4 mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-inner">
              <input
                className="border border-gray-300 rounded-xl px-6 py-4 flex-grow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                value={newTopicTitle}
                placeholder="New Topic Title"
                onChange={e => setNewTopicTitle(e.target.value)}
              />
              <input
                className="border border-gray-300 rounded-xl px-6 py-4 flex-grow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                value={newTopicDesc}
                placeholder="Topic Description"
                onChange={e => setNewTopicDesc(e.target.value)}
              />
              <button
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                onClick={handleCreateTopic}
              >
                Add Topic
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {topics.map(topic => (
              <div key={topic._id} className="relative group">
                {user && user.role === 'teacher' && (
                  <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                    <button
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110"
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
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110"
                      onClick={() => handleTopicDelete(topic._id)}
                      title="Delete Topic"
                    >
                      <FontAwesomeIcon icon={faTrash} size="sm" />
                    </button>
                  </div>
                )}
                <button
                  className={`w-full bg-gradient-to-br from-white to-gray-50/50 rounded-2xl shadow-lg p-8 transition-all duration-300 cursor-pointer border-2 text-left hover:shadow-2xl transform hover:-translate-y-2 ${selectedTopic === topic._id ? 'border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                  onClick={() => setSelectedTopic(topic._id)}
                >
                  <div className="flex items-center mb-6">
                    <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-4 rounded-full mr-4 shadow-md">
                      <FontAwesomeIcon icon={topicIcons(topic.title)} className="text-indigo-600 text-2xl" />
                    </div>
                    <h3 className="font-bold text-xl text-gray-800">{topic.title}</h3>
                  </div>
                  <p className="text-gray-600 text-base mb-6 line-clamp-2">{topic.description || 'No description'}</p>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Created: {new Date(topic.createdAt).toLocaleDateString()}</span>
                    <span className="text-indigo-600 font-semibold">{files.filter(f => f.topic.toString() === topic._id).length} files</span>
                  </div>
                </button>
              </div>
            ))}
            {topics.length === 0 && (
              <div className="text-center py-16 col-span-full">
                <p className="text-gray-500 text-xl">No topics available. {user && user.role === 'teacher' ? 'Create one to get started!' : 'Please login as a teacher to create topics.'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center">
            <FontAwesomeIcon icon={faDownload} className="mr-3 text-green-600" />
            Files in {topics.find(t => t._id === selectedTopic)?.title || 'Selected Topic'}
          </h2>
          {files.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-xl">No files found in this topic. {user && user.role === 'teacher' ? 'Upload some files to get started.' : 'Please login as a teacher to upload files.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {files.map(file => (
                <div key={file._id} className="file-card bg-gradient-to-br from-gray-50 to-white/50 rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border border-gray-200/50">
                  <div className="flex items-start mb-6">
                    <div className="bg-gradient-to-br from-yellow-100 to-orange-100 p-4 rounded-full mr-4 shadow-md flex-shrink-0">
                      <FontAwesomeIcon
                        icon={
                          file.fileType.includes('pdf') ? faFilePdf :
                            file.fileType.includes('word') || file.fileType.includes('doc') ? faFileWord :
                              file.fileType.includes('powerpoint') || file.fileType.includes('presentation') || file.fileType.includes('ppt') ? faFilePowerpoint :
                                faCloudUploadAlt
                        }
                        className="text-yellow-600 text-xl"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="font-semibold text-gray-800 break-words text-base mb-2 line-clamp-2">{file.originalName}</h3>
                      <p className="text-sm text-gray-500 space-y-1">
                        <span>{Math.round((file.fileSize || 0) / 1024)} KB</span>
                        <br />
                        <span>{new Date(file.uploadedAt).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                  {user && user.role === 'teacher' && (
                    <div className="flex space-x-3 mb-4">
                      <button
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium flex-1 shadow-md hover:shadow-lg transform hover:scale-105"
                        onClick={() => handleFileEditPrompt(file._id, file.originalName)}
                      >
                        <FontAwesomeIcon icon={faEdit} className="mr-1" />
                        Edit
                      </button>
                      <button
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium flex-1 shadow-md hover:shadow-lg transform hover:scale-105"
                        onClick={() => handleFileDelete(file._id)}
                      >
                        <FontAwesomeIcon icon={faTrash} className="mr-1" />
                        Delete
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => handleFileDownload(file._id, file.originalName)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 px-6 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setIsModalOpen(false);
            setUploadFiles([]);
          }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
              <h3 className="text-2xl font-semibold text-gray-800">Upload Files</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setUploadFiles([]);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form className="p-6" onSubmit={handleFileUpload}>
              <div className="mb-6">
                <label className="block text-base font-semibold text-gray-700 mb-3">Select Topic</label>
                <select
                  className="border border-gray-300 rounded-xl px-6 py-4 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                  value={uploadTopicId}
                  onChange={e => setUploadTopicId(e.target.value)}
                  required
                >
                  <option value="">Choose a topic...</option>
                  {topics.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-base font-semibold text-gray-700 mb-3">Select Files</label>
                <input
                  type="file"
                  multiple
                  className="border border-gray-300 rounded-xl px-6 py-4 w-full file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  onChange={e => setUploadFiles(e.target.files)}
                  required
                />
                <p className="text-sm text-gray-500 mt-2">You can select multiple files at once</p>
              </div>
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setUploadFiles([]);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Edit File Name</h3>
              <input
                type="text"
                className="border border-gray-300 rounded-xl w-full p-4 mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end space-x-3">
                <button
                  className="bg-gray-300 hover:bg-gray-400 px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-md"
                  onClick={() => { setEditNameId(''); setEditName(''); }}
                >
                  Cancel
                </button>
                <button
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg"
                  onClick={handleFileEditSubmit}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Topic Modal */}
      {editTopicId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => { setEditTopicId(''); setEditTopicTitle(''); setEditTopicDesc(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Edit Topic</h3>
              <input
                type="text"
                className="border border-gray-300 rounded-xl w-full p-4 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                value={editTopicTitle}
                onChange={e => setEditTopicTitle(e.target.value)}
                placeholder="Topic Title"
                autoFocus
              />
              <input
                type="text"
                className="border border-gray-300 rounded-xl w-full p-4 mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                value={editTopicDesc}
                onChange={e => setEditTopicDesc(e.target.value)}
                placeholder="Topic Description"
              />
              <div className="flex justify-end space-x-3">
                <button
                  className="bg-gray-300 hover:bg-gray-400 px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-md"
                  onClick={() => { setEditTopicId(''); setEditTopicTitle(''); setEditTopicDesc(''); }}
                >
                  Cancel
                </button>
                <button
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
              <h3 className="text-2xl font-semibold text-gray-800">Login</h3>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form className="p-6" onSubmit={handleLogin}>
              {isTeacherKeyLogin ? (
                <>
                  <div className="mb-6">
                    <label className="block text-base font-semibold text-gray-700 mb-3 flex items-center">
                      <FontAwesomeIcon icon={faLock} className="mr-2 text-indigo-600" />
                      Teacher Key (Special Access)
                    </label>
                    <input
                      type="password"
                      className="border border-gray-300 rounded-xl px-6 py-4 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                      value={teacherLoginKey}
                      onChange={e => setTeacherLoginKey(e.target.value)}
                      placeholder="Enter fixed teacher key"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-base font-semibold text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      className="border border-gray-300 rounded-xl px-6 py-4 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-base font-semibold text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      className="border border-gray-300 rounded-xl px-6 py-4 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
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
                  className="w-full text-indigo-600 hover:text-indigo-800 text-sm mb-4 underline"
                >
                  Login as Teacher with Special Key?
                </button>
              )}
              {isTeacherKeyLogin && (
                <button
                  type="button"
                  onClick={toggleTeacherKeyLogin}
                  className="w-full text-indigo-600 hover:text-indigo-800 text-sm mb-4 underline"
                >
                  Use Email/Password Instead
                </button>
              )}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="bg-gray-300 hover:bg-gray-400 px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
              <h3 className="text-2xl font-semibold text-gray-800">Register</h3>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form className="p-6" onSubmit={handleRegister}>
              <div className="mb-4">
                <label className="block text-base font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  className="border border-gray-300 rounded-xl px-6 py-4 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                  value={registerName}
                  onChange={e => setRegisterName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-base font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  className="border border-gray-300 rounded-xl px-6 py-4 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                  value={registerEmail}
                  onChange={e => setRegisterEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-base font-semibold text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  className="border border-gray-300 rounded-xl px-6 py-4 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                  value={registerPassword}
                  onChange={e => setRegisterPassword(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-base font-semibold text-gray-700 mb-2">Role</label>
                <select
                  className="border border-gray-300 rounded-xl px-6 py-4 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                  value={registerRole}
                  onChange={e => setRegisterRole(e.target.value)}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              {registerRole === 'teacher' && (
                <div className="mb-6">
                  <label className="block text-base font-semibold text-gray-700 mb-2 flex items-center">
                    <FontAwesomeIcon icon={faLock} className="mr-2 text-indigo-600" />
                    Teacher Key (Required for Teachers)
                  </label>
                  <input
                    type="password"
                    className="border border-gray-300 rounded-xl px-6 py-4 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                    value={teacherKey}
                    onChange={e => setTeacherKey(e.target.value)}
                    placeholder="Enter fixed teacher key"
                    required
                  />
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="bg-gray-300 hover:bg-gray-400 px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;