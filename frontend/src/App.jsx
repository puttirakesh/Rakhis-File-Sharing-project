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
                </button>
              </>
            ) : (
              <>
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
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

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

        {/* Topics Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <FontAwesomeIcon icon={faFolderOpen} className="mr-2 text-indigo-600" />
              Course Topics
            </h2>
            <div className="text-sm text-gray-500">{topics.length} topics available</div>
          </div>

          {user && user.role === 'teacher' && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Topic</h3>
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  className="border border-gray-300 rounded-lg px-4 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  value={newTopicTitle}
                  placeholder="Topic Title"
                  onChange={e => setNewTopicTitle(e.target.value)}
                />
                <input
                  className="border border-gray-300 rounded-lg px-4 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  value={newTopicDesc}
                  placeholder="Topic Description"
                  onChange={e => setNewTopicDesc(e.target.value)}
                />
                <button
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium text-sm whitespace-nowrap"
                  onClick={handleCreateTopic}
                >
                  Add Topic
                </button>
              </div>
            </div>
          )}

          {topics.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map(topic => (
                <div key={topic._id} className="relative group border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors duration-200 bg-white">
                  {user && user.role === 'teacher' && (
                    <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                      <button
                        className="bg-blue-100 text-blue-700 hover:bg-blue-200 p-2 rounded-md transition-colors duration-200"
                        onClick={() => {
                          setEditTopicId(topic._id);
                          setEditTopicTitle(topic.title);
                          setEditTopicDesc(topic.description || '');
                        }}
                        title="Edit Topic"
                      >
                        <FontAwesomeIcon icon={faEdit} size="xs" />
                      </button>
                      <button
                        className="bg-red-100 text-red-700 hover:bg-red-200 p-2 rounded-md transition-colors duration-200"
                        onClick={() => handleTopicDelete(topic._id)}
                        title="Delete Topic"
                      >
                        <FontAwesomeIcon icon={faTrash} size="xs" />
                      </button>
                    </div>
                  )}
                  <button
                    className={`w-full text-left p-4 transition-all duration-200 ${selectedTopic === topic._id ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedTopic(topic._id)}
                  >
                    <div className="flex items-center mb-3">
                      <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                        <FontAwesomeIcon icon={topicIcons(topic.title)} className="text-indigo-600 text-lg" />
                      </div>
                      <h3 className="font-medium text-gray-800">{topic.title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{topic.description || 'No description available'}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
                      <span className="text-indigo-600 font-medium">{files.filter(f => f.topic.toString() === topic._id).length} files</span>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="bg-gray-100 inline-block p-4 rounded-full mb-3">
                <FontAwesomeIcon icon={faFolderOpen} className="text-gray-400 text-2xl" />
              </div>
              <p className="text-gray-500 text-sm">No topics available. {user && user.role === 'teacher' ? 'Create one to get started!' : 'Please contact your instructor for materials.'}</p>
            </div>
          )}
        </div>

        {/* Files Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <FontAwesomeIcon icon={faFileAlt} className="mr-2 text-green-600" />
              {topics.find(t => t._id === selectedTopic)?.title || 'All'} Files
            </h2>
            <div className="text-sm text-gray-500">
              {files.filter(f => !selectedTopic || f.topic.toString() === selectedTopic).length} files
            </div>
          </div>

          {files.filter(f => !selectedTopic || f.topic.toString() === selectedTopic).length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-gray-100 inline-block p-4 rounded-full mb-3">
                <FontAwesomeIcon icon={faFileAlt} className="text-gray-400 text-2xl" />
              </div>
              <p className="text-gray-500 text-sm">No files found. {user && user.role === 'teacher' ? 'Upload some files to get started.' : 'Files will appear here once uploaded.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.filter(f => !selectedTopic || f.topic.toString() === selectedTopic).map(file => (
                <div key={file._id} className="border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow duration-200">
                  <div className="p-4">
                    <div className="flex items-start mb-4">
                      <div className={`p-3 rounded-lg mr-3 ${file.fileType.includes('pdf') ? 'bg-red-100 text-red-700' :
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
                          className="text-lg"
                        />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h3 className="font-medium text-gray-800 text-sm break-words line-clamp-2">{file.originalName}</h3>
                        <p className="text-gray-500 text-xs mt-1">
                          {Math.round((file.fileSize || 0) / 1024)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {user && user.role === 'teacher' && (
                      <div className="flex space-x-2 mb-4">
                        <button
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-md text-xs transition-colors duration-200 flex items-center"
                          onClick={() => handleFileEditPrompt(file._id, file.originalName)}
                        >
                          <FontAwesomeIcon icon={faEdit} className="mr-1" />
                          Rename
                        </button>
                        <button
                          className="bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-md text-xs transition-colors duration-200 flex items-center"
                          onClick={() => handleFileDelete(file._id)}
                        >
                          <FontAwesomeIcon icon={faTrash} className="mr-1" />
                          Delete
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => handleFileDownload(file._id, file.originalName)}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isDownloading[file._id]}
                    >
                      {isDownloading[file._id] ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} className="mr-1.5 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faDownload} className="mr-1.5" />
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
              </div>
            </div>
          </div>
        </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
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
      )}
    </div>
  );
}

export default App;