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
  faUserPlus
} from '@fortawesome/free-solid-svg-icons';
import FileUpload from './FileUpload';
// Use Vite environment variables
const API_URL = import.meta.env.VITE_SERVER_URL;
// Set default fetch headers
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

  // Authentication states
  const [user, setUser] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('teacher');
  const [teacherKey, setTeacherKey] = useState('');

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setUser(JSON.parse(userData));
      // Set token for all requests
      setAuthToken(token);
    }

    fetchTopics();
  }, []);

  // Function to set auth token in headers
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

  const fetchTopics = () => {
    fetch(`${API_URL}/api/topics`)
      .then(res => res.json())
      .then(data => {
        setTopics(data);
        if (data.length > 0 && !selectedTopic) setSelectedTopic(data[0]._id);
      })
      .catch(err => console.error('Error fetching topics:', err));
  };

  const fetchFiles = (topicId) => {
    fetch(`${API_URL}/api/topics/${topicId}/files`)
      .then(res => res.json())
      .then(setFiles)
      .catch(err => console.error('Error fetching files:', err));
  };

  useEffect(() => {
    if (selectedTopic) {
      fetchFiles(selectedTopic);
      setUploadTopicId(selectedTopic);
    }
  }, [selectedTopic]);

  const topicIcons = (name) => {
    if (name === 'Mathematics') return faCalculator;
    if (name === 'Science') return faFlask;
    if (name === 'Languages') return faLanguage;
    return faCloudUploadAlt;
  };

  const handleCreateTopic = () => {
    if (!newTopicTitle) return;
    fetch(`${API_URL}/api/topics`, {
      method: "POST",
      headers: fetchDefaults.headers,
      body: JSON.stringify({ title: newTopicTitle, description: newTopicDesc })
    })
      .then(res => {
        if (res.status === 401) {
          setMessage('Please login to create topics');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setTopics([data, ...topics]);
          setNewTopicTitle('');
          setNewTopicDesc('');
          setSelectedTopic(data._id);
          setMessage('Topic created successfully!');
        }
      })
      .catch(() => setMessage('Failed to create topic!'));
  };

  // const handleFileUpload = (e) => {
  //   e.preventDefault();
  //   if (!uploadFiles.length || !uploadTopicId) {
  //     setMessage('Please select files and a topic');
  //     return;
  //   }

    
  //   const formData = new FormData();
  //   Array.from(uploadFiles).forEach(file => {
  //     formData.append('files', file);
  //   });
  //   formData.append('topicId', uploadTopicId);

  //   // Remove JSON content type for FormData
  //   const { 'Content-Type': _, ...headers } = fetchDefaults.headers;

  //   fetch(`${API_URL}/api/upload`, {
  //     method: 'POST',
  //     headers: headers,
  //     body: formData,
  //   })
  //     .then(res => {
  //       if (res.status === 401) {
  //         setMessage('Please login to upload files');
  //         return null;
  //       }
  //       return res.json();
  //     })
  //     .then(uploadedFiles => {
  //       if (uploadedFiles) {
  //         setMessage('Files uploaded successfully!');
  //         setIsModalOpen(false);
  //         setUploadFiles([]);
  //         setFiles([...uploadedFiles, ...files]);
  //       }
  //     })
  //     .catch(() => setMessage('Failed to upload files!'));
  // };

  const handleFileDownload = (fileId, fileName) => {
    fetch(`${API_URL}/api/download/${fileId}`)
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => setMessage('Failed to download file!'));
  };

  const handleFileDelete = (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    fetch(`${API_URL}/api/files/${fileId}`, {
      method: 'DELETE',
      headers: fetchDefaults.headers
    })
      .then(res => {
        if (res.status === 401) {
          setMessage('Please login to delete files');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setFiles(files.filter(f => f._id !== fileId));
          setMessage('File deleted successfully!');
        }
      })
      .catch(() => setMessage('Failed to delete file!'));
  };

  const handleTopicDelete = (topicId) => {
    if (!window.confirm('Are you sure you want to delete this topic and all its files?')) return;

    fetch(`${API_URL}/api/topics/${topicId}`, {
      method: 'DELETE',
      headers: fetchDefaults.headers
    })
      .then(res => {
        if (res.status === 401) {
          setMessage('Please login to delete topics');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setTopics(topics.filter(t => t._id !== topicId));
          if (selectedTopic === topicId) {
            setSelectedTopic(topics.length > 1 ? topics[0]._id : '');
            setFiles([]);
          }
          setMessage('Topic and all files deleted successfully!');
        }
      })
      .catch(() => setMessage('Failed to delete topic!'));
  };

  const handleFileEditPrompt = (fileId, oldName) => {
    setEditNameId(fileId);
    setEditName(oldName);
  };

  const handleFileEditSubmit = () => {
    fetch(`${API_URL}/api/files/${editNameId}`, {
      method: "PUT",
      headers: fetchDefaults.headers,
      body: JSON.stringify({ newName: editName }),
    })
      .then(res => {
        if (res.status === 401) {
          setMessage('Please login to edit files');
          return null;
        }
        return res.json();
      })
      .then(updatedFile => {
        if (updatedFile) {
          setFiles(files.map(f => f._id === editNameId ? updatedFile : f));
          setEditName('');
          setEditNameId('');
          setMessage('File name updated successfully!');
        }
      })
      .catch(() => setMessage('Failed to update file name!'));
  };

  const handleTopicEditSubmit = () => {
    fetch(`${API_URL}/api/topics/${editTopicId}`, {
      method: "PUT",
      headers: fetchDefaults.headers,
      body: JSON.stringify({ title: editTopicTitle, description: editTopicDesc }),
    })
      .then(res => {
        if (res.status === 401) {
          setMessage('Please login to edit topics');
          return null;
        }
        return res.json();
      })
      .then(updatedTopic => {
        if (updatedTopic) {
          setTopics(topics.map(t => t._id === editTopicId ? updatedTopic : t));
          setEditTopicId('');
          setEditTopicTitle('');
          setEditTopicDesc('');
          setMessage('Topic updated successfully!');
        }
      })
      .catch(() => setMessage('Failed to update topic!'));
  };

  // Authentication functions
  const handleLogin = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: loginPassword })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
          setAuthToken(data.token);
          setIsLoginModalOpen(false);
          setLoginEmail('');
          setLoginPassword('');
          setMessage('Login successful!');
        } else {
          setMessage(data.message || 'Login failed');
        }
      })
      .catch(err => {
        setMessage('Login failed. Please try again.');
      });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        role: registerRole,
        teacherKey: registerRole === 'teacher' ? teacherKey : undefined
      })
    })
      .then(res => res.json())
      .then(data => {
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
      })
      .catch(err => {
        setMessage('Registration failed. Please try again.');
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setAuthToken(null);
    setMessage('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faCloudUploadAlt} className="text-2xl" />
            <h1 className="text-xl font-bold">Teacher's File Sharing Portal</h1>
          </div>
          <div className="flex space-x-4 items-center">
            {user ? (
              <>
                <span className="flex items-center">
                  <FontAwesomeIcon icon={faUser} className="mr-1" />
                  {user.name} ({user.role})
                </span>
                {user.role === 'teacher' && (
                  <button
                    className="hover:bg-blue-700 px-3 py-2 rounded transition"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Upload Files
                  </button>
                )}
                <button
                  className="hover:bg-blue-700 px-3 py-2 rounded transition flex items-center"
                  onClick={handleLogout}
                >
                  <FontAwesomeIcon icon={faSignOutAlt} className="mr-1" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  className="hover:bg-blue-700 px-3 py-2 rounded transition flex items-center"
                  onClick={() => setIsLoginModalOpen(true)}
                >
                  <FontAwesomeIcon icon={faSignInAlt} className="mr-1" />
                  Login
                </button>
                <button
                  className="hover:bg-blue-700 px-3 py-2 rounded transition flex items-center"
                  onClick={() => setIsRegisterModalOpen(true)}
                >
                  <FontAwesomeIcon icon={faUserPlus} className="mr-1" />
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {message && (
        <div className="container mx-auto mt-4">
          <div className={`px-4 py-3 rounded relative ${message.includes('Failed') || message.includes('Error') || message.includes('Invalid') ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-green-100 border border-green-400 text-green-700'}`} role="alert">
            <span className="block sm:inline">{message}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setMessage('')}>
              <FontAwesomeIcon icon={faTimes} className="fill-current h-6 w-6 text-gray-500 cursor-pointer" />
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Topics Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Topics</h2>
          {user && user.role === 'teacher' && (
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input
                className="border rounded px-3 py-2 flex-grow"
                value={newTopicTitle}
                placeholder="New Topic Title"
                onChange={e => setNewTopicTitle(e.target.value)}
              />
              <input
                className="border rounded px-3 py-2 flex-grow"
                value={newTopicDesc}
                placeholder="Topic Description"
                onChange={e => setNewTopicDesc(e.target.value)}
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                onClick={handleCreateTopic}
              >
                Add Topic
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map(topic => (
              <div key={topic._id} className="relative">
                {user && user.role === 'teacher' && (
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <button
                      className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
                      onClick={() => {
                        setEditTopicId(topic._id);
                        setEditTopicTitle(topic.title);
                        setEditTopicDesc(topic.description || '');
                      }}
                    >
                      <FontAwesomeIcon icon={faEdit} size="sm" />
                    </button>
                    <button
                      className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition"
                      onClick={() => handleTopicDelete(topic._id)}
                    >
                      <FontAwesomeIcon icon={faTrash} size="sm" />
                    </button>
                  </div>
                )}

                <button
                  className={`w-full bg-white rounded-lg shadow-md p-6 transition cursor-pointer border-2 text-left ${selectedTopic === topic._id ? 'border-blue-600' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  onClick={() => setSelectedTopic(topic._id)}
                >
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-100 p-3 rounded-full mr-4">
                      <FontAwesomeIcon icon={topicIcons(topic.title)} className="text-blue-600 text-xl" />
                    </div>
                    <h3 className="font-bold text-lg">{topic.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{topic.description}</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Created: {new Date(topic.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Files Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Files in {topics.find(t => t._id === selectedTopic)?.title || 'Selected Topic'}
          </h2>

          {files.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No files found in this topic. {user && user.role === 'teacher' ? 'Upload some files to get started.' : 'Please login as a teacher to upload files.'}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map(file => (
                <div key={file._id} className="file-card bg-gray-50 rounded-lg shadow p-4 transition hover:shadow-md">
                  <div className="flex items-start mb-3">
                    <div className="bg-yellow-100 p-2 rounded mr-3">
                      <FontAwesomeIcon
                        icon={
                          file.fileType.includes('pdf') ? faFilePdf :
                            file.fileType.includes('word') ? faFileWord :
                              file.fileType.includes('powerpoint') || file.fileType.includes('presentation') ? faFilePowerpoint :
                                faCloudUploadAlt
                        }
                        className="text-yellow-600"
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium break-words">{file.originalName}</h3>
                      <p className="text-xs text-gray-500">
                        {Math.round(file.fileSize / 1024)} KB<br />
                        {new Date(file.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {user && user.role === 'teacher' && (
                    <div className="flex space-x-2 mb-2">
                      <button
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                        onClick={() => handleFileEditPrompt(file._id, file.originalName)}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                        onClick={() => handleFileDelete(file._id)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => handleFileDownload(file._id, file.originalName)}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-3 rounded text-sm transition flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faDownload} className="mr-2" />
                    Download
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-lg font-semibold">Upload Files</h3>
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
            <form className="p-6" onSubmit={handleFileUpload}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                <select
                  className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={uploadTopicId}
                  onChange={e => setUploadTopicId(e.target.value)}
                  required
                >
                  <option value="">Select Topic</option>
                  {topics.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Files</label>
                <input
                  type="file"
                  multiple
                  className="border px-3 py-2 w-full"
                  onChange={e => setUploadFiles(e.target.files)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">You can select multiple files</p>
              </div>
              <div className="flex justify-end border-t p-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setUploadFiles([]);
                  }}
                  className="bg-gray-200 px-4 py-2 rounded mr-2 hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Upload
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Edit File Name</h3>
              <input
                type="text"
                className="border rounded w-full p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition"
                  onClick={() => { setEditNameId(''); setEditName(''); }}
                >
                  Cancel
                </button>
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  onClick={handleFileEditSubmit}
                >
                  Save
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Edit Topic</h3>
              <input
                type="text"
                className="border rounded w-full p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editTopicTitle}
                onChange={e => setEditTopicTitle(e.target.value)}
                placeholder="Topic Title"
                autoFocus
              />
              <input
                type="text"
                className="border rounded w-full p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editTopicDesc}
                onChange={e => setEditTopicDesc(e.target.value)}
                placeholder="Topic Description"
              />
              <div className="flex justify-end space-x-2">
                <button
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition"
                  onClick={() => { setEditTopicId(''); setEditTopicTitle(''); setEditTopicDesc(''); }}
                >
                  Cancel
                </button>
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  onClick={handleTopicEditSubmit}
                >
                  Save
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-lg font-semibold">Login</h3>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form className="p-6" onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end border-t p-4">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="bg-gray-200 px-4 py-2 rounded mr-2 hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Login
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-lg font-semibold">Register</h3>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form className="p-6" onSubmit={handleRegister}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={registerName}
                  onChange={e => setRegisterName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={registerEmail}
                  onChange={e => setRegisterEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={registerPassword}
                  onChange={e => setRegisterPassword(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={registerRole}
                  onChange={e => setRegisterRole(e.target.value)}
                >
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>
              {registerRole === 'teacher' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teacher Key</label>
                  <input
                    type="password"
                    className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={teacherKey}
                    onChange={e => setTeacherKey(e.target.value)}
                    placeholder="Enter teacher key"
                    required={registerRole === 'teacher'}
                  />
                </div>
              )}
              <div className="flex justify-end border-t p-4">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="bg-gray-200 px-4 py-2 rounded mr-2 hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Register
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