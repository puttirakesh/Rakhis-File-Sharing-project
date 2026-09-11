import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAward,
  faCalculator,
  faChartLine,
  faCheckCircle,
  faCloudArrowUp,
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
  faPen,
  faPlus,
  faSearch,
  faSignInAlt,
  faSignOutAlt,
  faSpinner,
  faTrash,
  faUser,
  faUniversity,
  faUserPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import image from "./assets/chandan-kumar.jpg";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/$/, "");

const MAX_FILE_SIZE_MB = Number(
  import.meta.env.VITE_MAX_FILE_SIZE_MB || 25
);

const MAX_FILES_PER_UPLOAD = Number(
  import.meta.env.VITE_MAX_FILES_PER_UPLOAD || 10
);

const getToken = () => localStorage.getItem("token");

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType =
    response.headers.get("content-type") || "";

  let payload = null;

  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  } else {
    payload = await response.text().catch(() => "");
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      payload.message
        ? payload.message
        : typeof payload === "string" && payload
          ? payload
          : `Request failed (${response.status})`;

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function Modal({ title, icon, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <FontAwesomeIcon icon={icon || faCloudArrowUp} />
            </div>
            <h2 className="truncate text-lg font-bold text-slate-900">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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

function fileTypeInfo(file = {}) {
  const value =
    `${file.fileType || ""} ${file.originalName || ""}`.toLowerCase();

  if (value.includes("pdf")) {
    return { icon: faFilePdf, label: "PDF" };
  }

  if (value.includes("word") || value.includes(".doc")) {
    return { icon: faFileWord, label: "DOC" };
  }

  if (
    value.includes("powerpoint") ||
    value.includes("presentation") ||
    value.includes(".ppt")
  ) {
    return { icon: faFilePowerpoint, label: "PPT" };
  }

  if (
    value.includes("excel") ||
    value.includes("spreadsheet") ||
    value.includes(".xls")
  ) {
    return { icon: faFileExcel, label: "XLS" };
  }

  return { icon: faFileAlt, label: "FILE" };
}

function topicIcon(title = "") {
  const value = title.toLowerCase();

  if (value.includes("math")) {
    return faCalculator;
  }

  if (
    value.includes("science") ||
    value.includes("physics") ||
    value.includes("chemistry")
  ) {
    return faFlask;
  }

  if (
    value.includes("language") ||
    value.includes("english")
  ) {
    return faLanguage;
  }

  return faFolderOpen;
}

function formatBytes(bytes = 0) {
  if (!bytes) return "0 KB";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(
    bytes /
    1024 ** index
  ).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function App() {
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [busyAction, setBusyAction] = useState("");

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);

  const [isTeacherKeyLogin, setIsTeacherKeyLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [teacherLoginKey, setTeacherLoginKey] = useState("");

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerRole, setRegisterRole] = useState("student");
  const [teacherKey, setTeacherKey] = useState("");

  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");

  const [editTopicId, setEditTopicId] = useState("");
  const [editTopicTitle, setEditTopicTitle] = useState("");
  const [editTopicDesc, setEditTopicDesc] = useState("");

  const [editFileId, setEditFileId] = useState("");
  const [editFileName, setEditFileName] = useState("");

  const [uploadTopicId, setUploadTopicId] = useState("");
  const [uploadFiles, setUploadFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const [isDownloading, setIsDownloading] = useState({});

  const selectedTopicObject = useMemo(
    () =>
      topics.find(
        (topic) => topic._id === selectedTopic
      ),
    [topics, selectedTopic]
  );

  const showMessage = useCallback((text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  }, []);

  useEffect(() => {
    if (!message) return undefined;

    const timer = window.setTimeout(
      () => setMessage(""),
      4500
    );

    return () => window.clearTimeout(timer);
  }, [message]);

  const refreshTopics = useCallback(async () => {
    try {
      const data = await apiFetch("/api/topics");
      const nextTopics = Array.isArray(data) ? data : [];

      setTopics(nextTopics);

      setSelectedTopic((current) => {
        if (
          current &&
          nextTopics.some(
            (topic) => topic._id === current
          )
        ) {
          return current;
        }

        return nextTopics[0]?._id || "";
      });
    } catch (error) {
      console.error(error);
      showMessage(
        error.message ||
          "Unable to load folders.",
        "error"
      );
    }
  }, [showMessage]);

  const refreshFiles = useCallback(
    async (topicId) => {
      if (!topicId) {
        setFiles([]);
        return;
      }

      try {
        const data = await apiFetch(
          `/api/topics/${topicId}/files`
        );

        setFiles(
          Array.isArray(data) ? data : []
        );
      } catch (error) {
        console.error(error);

        showMessage(
          error.message ||
            "Unable to load files.",
          "error"
        );
      }
    },
    [showMessage]
  );

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    const storedUser =
      localStorage.getItem("user");

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }

    refreshTopics();
  }, [refreshTopics]);

  useEffect(() => {
    if (!selectedTopic) {
      setFiles([]);
      return;
    }

    setUploadTopicId(selectedTopic);
    refreshFiles(selectedTopic);
  }, [selectedTopic, refreshFiles]);

  const totalFiles = useMemo(
    () =>
      topics.reduce(
        (total, topic) =>
          total +
          Number(topic.fileCount || 0),
        0
      ),
    [topics]
  );

  const filteredFiles = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    return files.filter((file) => {
      if (!query) return true;

      return `${file.originalName || ""} ${
        file.fileType || ""
      }`
        .toLowerCase()
        .includes(query);
    });
  }, [files, searchQuery]);

  const openUpload = () => {
    if (!user || user.role !== "teacher") {
      setIsLoginOpen(true);
      return;
    }

    if (!topics.length) {
      showMessage(
        "Create a folder before uploading files.",
        "error"
      );
      return;
    }

    setUploadTopicId(
      selectedTopic || topics[0]._id
    );
    setUploadFiles([]);
    setIsUploadOpen(true);
  };

  const addUploadFiles = (inputFiles) => {
    const incoming = Array.from(
      inputFiles || []
    );

    const accepted = [];
    let firstRejected = "";

    for (const file of incoming) {
      const extension =
        file.name.includes(".")
          ? file.name
              .split(".")
              .pop()
              .toLowerCase()
          : "";

      const sizeMb =
        file.size / (1024 * 1024);

      if (sizeMb > MAX_FILE_SIZE_MB) {
        if (!firstRejected) {
          firstRejected = `${file.name} is larger than ${MAX_FILE_SIZE_MB} MB.`;
        }
        continue;
      }

      if (
        !extension &&
        !file.type
      ) {
        if (!firstRejected) {
          firstRejected =
            `${file.name} does not have a valid file type.`;
        }
        continue;
      }

      accepted.push(file);
    }

    setUploadFiles((current) => {
      const merged = [
        ...current,
        ...accepted,
      ];

      const unique = merged.filter(
        (file, index, array) =>
          array.findIndex(
            (item) =>
              `${item.name}-${item.size}-${item.lastModified}` ===
              `${file.name}-${file.size}-${file.lastModified}`
          ) === index
      );

      return unique.slice(
        0,
        MAX_FILES_PER_UPLOAD
      );
    });

    if (
      incoming.length >
      accepted.length &&
      !firstRejected
    ) {
      firstRejected =
        `Only ${MAX_FILES_PER_UPLOAD} files can be uploaded at once.`;
    }

    if (
      firstRejected ||
      accepted.length + uploadFiles.length >
        MAX_FILES_PER_UPLOAD
    ) {
      showMessage(
        firstRejected ||
          `Only ${MAX_FILES_PER_UPLOAD} files can be uploaded at once.`,
        "error"
      );
    }
  };

  const removeUploadFile = (index) => {
    setUploadFiles((current) =>
      current.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );
  };

  const handleUpload = async (
    event
  ) => {
    event.preventDefault();

    if (
      !uploadTopicId
    ) {
      showMessage(
        "Choose the destination folder.",
        "error"
      );
      return;
    }

    if (!uploadFiles.length) {
      showMessage(
        "Select at least one file.",
        "error"
      );
      return;
    }

    setBusyAction("upload");

    try {
      const formData =
        new FormData();

      uploadFiles.forEach((file) => {
        formData.append(
          "files",
          file
        );
      });

      formData.append(
        "topicId",
        uploadTopicId
      );

      await apiFetch(
        "/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      setIsUploadOpen(false);
      setUploadFiles([]);

      setSelectedTopic(
        uploadTopicId
      );

      await refreshFiles(
        uploadTopicId
      );

      await refreshTopics();

      showMessage(
        "Files uploaded successfully."
      );
    } catch (error) {
      console.error(error);

      showMessage(
        error.message ||
          "Upload failed.",
        "error"
      );
    } finally {
      setBusyAction("");
    }
  };

  const handleCreateTopic =
    async (event) => {
      event.preventDefault();

      if (
        !newTopicTitle.trim()
      ) {
        showMessage(
          "Folder name is required.",
          "error"
        );
        return;
      }

      setBusyAction(
        "create-topic"
      );

      try {
        const data =
          await apiFetch(
            "/api/topics",
            {
              method: "POST",
              body: JSON.stringify({
                title:
                  newTopicTitle.trim(),
                description:
                  newTopicDesc.trim(),
              }),
            }
          );

        setIsCreateTopicOpen(
          false
        );

        setNewTopicTitle("");
        setNewTopicDesc("");

        await refreshTopics();

        setSelectedTopic(
          data._id
        );

        showMessage(
          "Folder created successfully."
        );
      } catch (error) {
        console.error(error);

        showMessage(
          error.message ||
            "Unable to create folder.",
          "error"
        );
      } finally {
        setBusyAction("");
      }
    };

  const openTopicEdit = (
    topic
  ) => {
    setEditTopicId(
      topic._id
    );
    setEditTopicTitle(
      topic.title || ""
    );
    setEditTopicDesc(
      topic.description || ""
    );
  };

  const handleTopicEdit =
    async (event) => {
      event.preventDefault();

      if (
        !editTopicTitle.trim()
      ) {
        showMessage(
          "Folder name is required.",
          "error"
        );
        return;
      }

      setBusyAction(
        "edit-topic"
      );

      try {
        const updated =
          await apiFetch(
            `/api/topics/${editTopicId}`,
            {
              method: "PUT",
              body: JSON.stringify({
                title:
                  editTopicTitle.trim(),
                description:
                  editTopicDesc.trim(),
              }),
            }
          );

        setTopics((current) =>
          current.map((topic) =>
            topic._id ===
            editTopicId
              ? updated
              : topic
          )
        );

        setEditTopicId("");

        showMessage(
          "Folder updated successfully."
        );
      } catch (error) {
        console.error(error);

        showMessage(
          error.message ||
            "Unable to update folder.",
          "error"
        );
      } finally {
        setBusyAction("");
      }
    };

  const handleTopicDelete =
    async (topicId) => {
      const topic =
        topics.find(
          (item) =>
            item._id === topicId
        );

      if (
        !window.confirm(
          `Delete "${topic?.title || "this folder"}" and all of its files?`
        )
      ) {
        return;
      }

      setBusyAction(
        `delete-topic-${topicId}`
      );

      try {
        await apiFetch(
          `/api/topics/${topicId}`,
          {
            method: "DELETE",
          }
        );

        const remaining =
          topics.filter(
            (item) =>
              item._id !==
              topicId
          );

        setTopics(
          remaining
        );

        setSelectedTopic(
          (current) =>
            current === topicId
              ? remaining[0]?._id ||
                ""
              : current
        );

        if (
          selectedTopic ===
          topicId
        ) {
          setFiles([]);
        }

        showMessage(
          "Folder deleted successfully."
        );
      } catch (error) {
        console.error(error);

        showMessage(
          error.message ||
            "Unable to delete folder.",
          "error"
        );
      } finally {
        setBusyAction("");
      }
    };

  const openFileEdit = (
    file
  ) => {
    setEditFileId(
      file._id
    );
    setEditFileName(
      file.originalName ||
        ""
    );
  };

  const handleFileEdit =
    async (event) => {
      event.preventDefault();

      if (
        !editFileName.trim()
      ) {
        showMessage(
          "File name is required.",
          "error"
        );
        return;
      }

      setBusyAction(
        "edit-file"
      );

      try {
        const updated =
          await apiFetch(
            `/api/files/${editFileId}`,
            {
              method: "PUT",
              body: JSON.stringify({
                newName:
                  editFileName.trim(),
              }),
            }
          );

        setFiles((current) =>
          current.map((file) =>
            file._id ===
            editFileId
              ? updated
              : file
          )
        );

        setEditFileId("");
        setEditFileName("");

        showMessage(
          "File renamed successfully."
        );
      } catch (error) {
        console.error(error);

        showMessage(
          error.message ||
            "Unable to rename file.",
          "error"
        );
      } finally {
        setBusyAction("");
      }
    };

  const handleFileDelete =
    async (fileId) => {
      if (
        !window.confirm(
          "Delete this file permanently?"
        )
      ) {
        return;
      }

      setBusyAction(
        `delete-file-${fileId}`
      );

      try {
        await apiFetch(
          `/api/files/${fileId}`,
          {
            method: "DELETE",
          }
        );

        setFiles((current) =>
          current.filter(
            (file) =>
              file._id !==
              fileId
          )
        );

        await refreshTopics();

        showMessage(
          "File deleted successfully."
        );
      } catch (error) {
        console.error(error);

        showMessage(
          error.message ||
            "Unable to delete file.",
          "error"
        );
      } finally {
        setBusyAction("");
      }
    };

  const handleDownload =
    async (
      fileId,
      fileName
    ) => {
      setIsDownloading(
        (current) => ({
          ...current,
          [fileId]: true,
        })
      );

      try {
        const response =
          await fetch(
            `${API_URL}/api/download/${fileId}`
          );

        if (!response.ok) {
          const type =
            response.headers.get(
              "content-type"
            ) || "";

          const payload =
            type.includes(
              "application/json"
            )
              ? await response
                  .json()
                  .catch(
                    () => null
                  )
              : null;

          throw new Error(
            payload?.message ||
              "Unable to download file."
          );
        }

        const blob =
          await response.blob();

        const url =
          window.URL.createObjectURL(
            blob
          );

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href = url;
        anchor.download =
          fileName ||
          "download";

        document.body.appendChild(
          anchor
        );

        anchor.click();
        anchor.remove();

        window.URL.revokeObjectURL(
          url
        );

        showMessage(
          "Download started."
        );
      } catch (error) {
        console.error(error);

        showMessage(
          error.message ||
            "Unable to download file.",
          "error"
        );
      } finally {
        setIsDownloading(
          (current) => ({
            ...current,
            [fileId]: false,
          })
        );
      }
    };

  const handleLogin =
    async (event) => {
      event.preventDefault();

      setBusyAction("login");

      try {
        const payload =
          isTeacherKeyLogin
            ? {
                teacherKey:
                  teacherLoginKey,
              }
            : {
                email:
                  loginEmail.trim(),
                password:
                  loginPassword,
              };

        const data =
          await apiFetch(
            "/api/login",
            {
              method: "POST",
              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        localStorage.setItem(
          "token",
          data.token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            data.user
          )
        );

        setUser(
          data.user
        );

        setIsLoginOpen(
          false
        );

        setLoginEmail("");
        setLoginPassword("");
        setTeacherLoginKey("");

        showMessage(
          `Welcome back, ${
            data.user?.name ||
            "User"
          }!`
        );
      } catch (error) {
        console.error(error);

        showMessage(
          error.message ||
            "Login failed.",
          "error"
        );
      } finally {
        setBusyAction("");
      }
    };

  const handleRegister =
    async (event) => {
      event.preventDefault();

      setBusyAction(
        "register"
      );

      try {
        const payload = {
          name:
            registerName.trim(),
          email:
            registerEmail.trim(),
          password:
            registerPassword,
          role:
            registerRole,
        };

        if (
          registerRole ===
          "teacher"
        ) {
          payload.teacherKey =
            teacherKey;
        }

        const data =
          await apiFetch(
            "/api/register",
            {
              method: "POST",
              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        localStorage.setItem(
          "token",
          data.token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            data.user
          )
        );

        setUser(
          data.user
        );

        setIsRegisterOpen(
          false
        );

        setRegisterName("");
        setRegisterEmail("");
        setRegisterPassword("");
        setTeacherKey("");

        showMessage(
          "Account created successfully."
        );
      } catch (error) {
        console.error(error);

        showMessage(
          error.message ||
            "Registration failed.",
          "error"
        );
      } finally {
        setBusyAction("");
      }
    };

  const logout = () => {
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    setUser(null);
    setFiles([]);
    setSearchQuery("");

    showMessage(
      "You have been signed out."
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {message && (
        <div
          className={`fixed right-4 top-4 z-[120] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl ${
            messageType === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <FontAwesomeIcon
            icon={
              messageType === "error"
                ? faExclamationCircle
                : faCheckCircle
            }
            className="mt-0.5"
          />
          <span>{message}</span>
          <button
            type="button"
            onClick={() =>
              setMessage("")
            }
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 text-white shadow-xl backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <FontAwesomeIcon icon={faCloudArrowUp} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold sm:text-base">
                Educational Resource Hub
              </p>
              <p className="hidden text-xs text-slate-400 sm:block">
                Organized learning resources in one place.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs sm:flex">
                  <FontAwesomeIcon icon={faUser} />
                  <span className="max-w-32 truncate">
                    {user.name}
                  </span>
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 capitalize text-indigo-200">
                    {user.role}
                  </span>
                </div>

                {user.role ===
                  "teacher" && (
                  <button
                    type="button"
                    onClick={openUpload}
                    className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold transition hover:bg-indigo-400"
                  >
                    <FontAwesomeIcon
                      icon={faCloudArrowUp}
                      className="mr-2"
                    />
                    Upload
                  </button>
                )}

                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
                >
                  <FontAwesomeIcon
                    icon={faSignOutAlt}
                    className="mr-2"
                  />
                  <span className="hidden sm:inline">
                    Logout
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setIsLoginOpen(
                      true
                    )
                  }
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
                >
                  <FontAwesomeIcon
                    icon={faSignInAlt}
                    className="mr-2"
                  />
                  Login
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setIsRegisterOpen(
                      true
                    )
                  }
                  className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold transition hover:bg-indigo-400"
                >
                  <FontAwesomeIcon
                    icon={faUserPlus}
                    className="mr-2"
                  />
                  <span className="hidden sm:inline">
                    Create account
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-violet-950 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-10 top-10 h-48 w-48 rounded-full bg-indigo-500 blur-3xl" />
          <div className="absolute bottom-0 right-10 h-64 w-64 rounded-full bg-violet-500 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_.8fr] lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Digital learning workspace
            </span>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Keep every resource
              <span className="block text-indigo-300">
                exactly where it belongs.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Discover, organize, upload, rename,
              download and manage educational
              resources through a clean folder-based
              workspace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {user?.role ===
              "teacher" ? (
                <>
                  <button
                    type="button"
                    onClick={openUpload}
                    className="rounded-2xl bg-white px-5 py-3 font-bold text-slate-900 transition hover:-translate-y-0.5"
                  >
                    <FontAwesomeIcon
                      icon={faCloudArrowUp}
                      className="mr-2"
                    />
                    Upload files
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setIsCreateTopicOpen(
                        true
                      )
                    }
                    className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 font-bold transition hover:bg-white/15"
                  >
                    <FontAwesomeIcon
                      icon={faPlus}
                      className="mr-2"
                    />
                    Create folder
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setIsLoginOpen(
                      true
                    )
                  }
                  className="rounded-2xl bg-white px-5 py-3 font-bold text-slate-900 transition hover:-translate-y-0.5"
                >
                  <FontAwesomeIcon
                    icon={faSignInAlt}
                    className="mr-2"
                  />
                  Sign in to get started
                </button>
              )}
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <strong className="text-2xl">
                  {topics.length}
                </strong>
                <p className="mt-1 text-xs text-slate-400">
                  Folders
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <strong className="text-2xl">
                  {totalFiles}
                </strong>
                <p className="mt-1 text-xs text-slate-400">
                  Resources
                </p>
              </div>

              <div className="hidden rounded-2xl border border-white/10 bg-white/5 p-4 sm:block">
                <strong className="text-2xl">
                  {user
                    ? "Active"
                    : "Open"}
                </strong>
                <p className="mt-1 text-xs text-slate-400">
                  Workspace
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-4">
              <img
                src={image}
                alt="Prof. Chandan Kumar"
                className="h-20 w-20 rounded-3xl object-cover ring-2 ring-white/10"
              />

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Professor & HOD
                </p>
                <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                  Prof. Chandan Kumar
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Civil Engineering · GNA University
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 p-3">
                <FontAwesomeIcon
                  icon={faGraduationCap}
                  className="text-indigo-300"
                />
                <p className="mt-2 text-sm font-bold">
                  Geotechnical
                </p>
                <p className="text-xs text-slate-400">
                  Specialization
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-3">
                <FontAwesomeIcon
                  icon={faAward}
                  className="text-indigo-300"
                />
                <p className="mt-2 text-sm font-bold">
                  Autodesk
                </p>
                <p className="text-xs text-slate-400">
                  Certification
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-3">
                <FontAwesomeIcon
                  icon={faUniversity}
                  className="text-indigo-300"
                />
                <p className="mt-2 text-sm font-bold">
                  GNA
                </p>
                <p className="text-xs text-slate-400">
                  University
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-3">
                <FontAwesomeIcon
                  icon={faChartLine}
                  className="text-indigo-300"
                />
                <p className="mt-2 text-sm font-bold">
                  4+ Years
                </p>
                <p className="text-xs text-slate-400">
                  Experience
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <FontAwesomeIcon
                  icon={faLightbulb}
                  className="text-amber-300"
                />
                Built for focus
              </div>
              <p className="mt-2 text-xs leading-6 text-slate-400">
                Select a folder once, then upload
                directly into it. Students see the
                same folder structure immediately.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                Resource library
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Browse by folder
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a folder to view its resources.
              </p>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Search resources..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>

          {topics.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {topics.map((topic) => {
                const active =
                  topic._id ===
                  selectedTopic;

                return (
                  <button
                    type="button"
                    key={topic._id}
                    onClick={() =>
                      setSelectedTopic(
                        topic._id
                      )
                    }
                    className={`group relative rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-indigo-300 bg-indigo-50 ring-4 ring-indigo-100"
                        : "border-slate-200 bg-slate-50 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm">
                        <FontAwesomeIcon
                          icon={topicIcon(
                            topic.title
                          )}
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white">
                          {topic.fileCount || 0}
                        </span>

                        {user?.role ===
                          "teacher" && (
                          <>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                openTopicEdit(topic);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.stopPropagation();
                                  openTopicEdit(topic);
                                }
                              }}
                              className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-white hover:text-indigo-600"
                            >
                              <FontAwesomeIcon
                                icon={faPen}
                                className="text-xs"
                              />
                            </span>

                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleTopicDelete(
                                  topic._id
                                );
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.stopPropagation();
                                  handleTopicDelete(topic._id);
                                }
                              }}
                              className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-white hover:text-rose-600"
                            >
                              <FontAwesomeIcon
                                icon={faTrash}
                                className="text-xs"
                              />
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-4 line-clamp-1 font-bold">
                      {topic.title}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {topic.description ||
                        "No description provided."}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
                <FontAwesomeIcon
                  icon={faFolderOpen}
                />
              </div>
              <h3 className="mt-4 font-bold">
                No folders yet
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {user?.role === "teacher"
                  ? "Create your first folder to start organizing resources."
                  : "Sign in as a teacher to create folders."}
              </p>

              {user?.role ===
                "teacher" && (
                <button
                  type="button"
                  onClick={() =>
                    setIsCreateTopicOpen(
                      true
                    )
                  }
                  className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
                >
                  <FontAwesomeIcon
                    icon={faPlus}
                    className="mr-2"
                  />
                  Create folder
                </button>
              )}
            </div>
          )}
        </section>

        <section className="mt-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">
                {selectedTopicObject?.title ||
                  "Resources"}
              </h2>

              <p className="text-sm text-slate-500">
                {selectedTopicObject?.description ||
                  "Select a folder to browse its files."}
              </p>
            </div>

            {selectedTopic && (
              <span className="text-sm font-semibold text-slate-500">
                {filteredFiles.length} resource
                {filteredFiles.length === 1
                  ? ""
                  : "s"}
              </span>
            )}
          </div>

          {selectedTopic &&
          filteredFiles.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredFiles.map(
                (file) => {
                  const info =
                    fileTypeInfo(
                      file
                    );

                  return (
                    <article
                      key={file._id}
                      className="group rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                          <FontAwesomeIcon
                            icon={
                              info.icon
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-bold text-slate-900">
                            {file.originalName}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {info.label}
                            {file.fileSize
                              ? ` · ${formatBytes(
                                  file.fileSize
                                )}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleDownload(
                              file._id,
                              file.originalName
                            )
                          }
                          disabled={
                            isDownloading[
                              file._id
                            ]
                          }
                          className="flex-1 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                        >
                          <FontAwesomeIcon
                            icon={
                              isDownloading[
                                file._id
                              ]
                                ? faSpinner
                                : faDownload
                            }
                            className={
                              isDownloading[
                                file._id
                              ]
                                ? "mr-2 animate-spin"
                                : "mr-2"
                            }
                          />
                          Download
                        </button>

                        {user?.role ===
                          "teacher" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                openFileEdit(
                                  file
                                )
                              }
                              className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                              title="Rename"
                            >
                              <FontAwesomeIcon
                                icon={faPen}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleFileDelete(
                                  file._id
                                )
                              }
                              disabled={
                                busyAction ===
                                `delete-file-${file._id}`
                              }
                              className="grid h-11 w-11 place-items-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                              title="Delete"
                            >
                              <FontAwesomeIcon
                                icon={
                                  busyAction ===
                                  `delete-file-${file._id}`
                                    ? faSpinner
                                    : faTrash
                                }
                                className={
                                  busyAction ===
                                  `delete-file-${file._id}`
                                    ? "animate-spin"
                                    : ""
                                }
                              />
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <FontAwesomeIcon
                  icon={faFileAlt}
                />
              </div>
              <h3 className="mt-4 font-bold">
                {selectedTopic
                  ? "No matching resources"
                  : "Select a folder"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {selectedTopic
                  ? "This folder does not contain resources matching your search."
                  : "Choose a folder above to view its resources."}
              </p>

              {user?.role ===
                "teacher" &&
                selectedTopic && (
                  <button
                    type="button"
                    onClick={openUpload}
                    className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
                  >
                    <FontAwesomeIcon
                      icon={faCloudArrowUp}
                      className="mr-2"
                    />
                    Upload files
                  </button>
                )}
            </div>
          )}
        </section>
      </main>

      {isCreateTopicOpen && (
        <Modal
          title="Create folder"
          icon={faPlus}
          onClose={() =>
            !busyAction &&
            setIsCreateTopicOpen(false)
          }
        >
          <form
            onSubmit={handleCreateTopic}
            className="p-5 sm:p-6"
          >
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Folder name
            </label>

            <input
              value={newTopicTitle}
              onChange={(event) =>
                setNewTopicTitle(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="e.g. Mathematics"
              autoFocus
              required
            />

            <label className="mb-2 mt-4 block text-sm font-bold text-slate-700">
              Description
            </label>

            <textarea
              value={newTopicDesc}
              onChange={(event) =>
                setNewTopicDesc(
                  event.target.value
                )
              }
              className="min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              placeholder="Optional description"
            />

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setIsCreateTopicOpen(
                    false
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  busyAction ===
                  "create-topic"
                }
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <FontAwesomeIcon
                  icon={
                    busyAction ===
                    "create-topic"
                      ? faSpinner
                      : faCheckCircle
                  }
                  className={
                    busyAction ===
                    "create-topic"
                      ? "mr-2 animate-spin"
                      : "mr-2"
                  }
                />
                Create folder
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editTopicId && (
        <Modal
          title="Edit folder"
          icon={faPen}
          onClose={() =>
            !busyAction &&
            setEditTopicId("")
          }
        >
          <form
            onSubmit={handleTopicEdit}
            className="p-5 sm:p-6"
          >
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Folder name
            </label>

            <input
              value={editTopicTitle}
              onChange={(event) =>
                setEditTopicTitle(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              autoFocus
              required
            />

            <label className="mb-2 mt-4 block text-sm font-bold text-slate-700">
              Description
            </label>

            <textarea
              value={editTopicDesc}
              onChange={(event) =>
                setEditTopicDesc(
                  event.target.value
                )
              }
              className="min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setEditTopicId("")
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  busyAction ===
                  "edit-topic"
                }
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <FontAwesomeIcon
                  icon={
                    busyAction ===
                    "edit-topic"
                      ? faSpinner
                      : faCheckCircle
                  }
                  className={
                    busyAction ===
                    "edit-topic"
                      ? "mr-2 animate-spin"
                      : "mr-2"
                  }
                />
                Save changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editFileId && (
        <Modal
          title="Rename file"
          icon={faPen}
          onClose={() =>
            !busyAction &&
            setEditFileId("")
          }
        >
          <form
            onSubmit={handleFileEdit}
            className="p-5 sm:p-6"
          >
            <label className="mb-2 block text-sm font-bold text-slate-700">
              File name
            </label>

            <input
              value={editFileName}
              onChange={(event) =>
                setEditFileName(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              autoFocus
              required
            />

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setEditFileId("")
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  busyAction ===
                  "edit-file"
                }
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <FontAwesomeIcon
                  icon={
                    busyAction ===
                    "edit-file"
                      ? faSpinner
                      : faCheckCircle
                  }
                  className={
                    busyAction ===
                    "edit-file"
                      ? "mr-2 animate-spin"
                      : "mr-2"
                  }
                />
                Save changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isUploadOpen && (
        <Modal
          title="Upload resources"
          icon={faCloudArrowUp}
          onClose={() =>
            !busyAction &&
            setIsUploadOpen(false)
          }
        >
          <form
            onSubmit={handleUpload}
            className="p-5 sm:p-6"
          >
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Destination folder
            </label>

            <select
              value={uploadTopicId}
              onChange={(event) =>
                setUploadTopicId(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            >
              {topics.map((topic) => (
                <option
                  key={topic._id}
                  value={topic._id}
                >
                  {topic.title}
                </option>
              ))}
            </select>

            <div
              className={`mt-4 rounded-2xl border-2 border-dashed p-6 text-center transition ${
                isDragging
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-300 bg-slate-50"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() =>
                setIsDragging(false)
              }
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                addUploadFiles(
                  event.dataTransfer.files
                );
              }}
            >
              <FontAwesomeIcon
                icon={faCloudArrowUp}
                className="text-3xl text-indigo-500"
              />

              <p className="mt-3 font-bold">
                Drag and drop your files here
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Up to {MAX_FILES_PER_UPLOAD} files ·{" "}
                {MAX_FILE_SIZE_MB} MB each
              </p>

              <label className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
                <FontAwesomeIcon
                  icon={faPlus}
                  className="mr-2"
                />
                Choose files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) =>
                    addUploadFiles(
                      event.target.files
                    )
                  }
                />
              </label>
            </div>

            {uploadFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadFiles.map(
                  (file, index) => (
                    <div
                      key={`${file.name}-${file.lastModified}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <FontAwesomeIcon
                        icon={
                          fileTypeInfo(
                            {
                              originalName:
                                file.name,
                              fileType:
                                file.type,
                            }
                          ).icon
                        }
                        className="text-indigo-600"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatBytes(
                            file.size
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeUploadFile(
                            index
                          )
                        }
                        className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Remove ${file.name}`}
                      >
                        <FontAwesomeIcon
                          icon={faXmark}
                        />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setIsUploadOpen(false)
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  busyAction ===
                  "upload"
                }
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <FontAwesomeIcon
                  icon={
                    busyAction ===
                    "upload"
                      ? faSpinner
                      : faCloudArrowUp
                  }
                  className={
                    busyAction ===
                    "upload"
                      ? "mr-2 animate-spin"
                      : "mr-2"
                  }
                />
                Upload
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isLoginOpen && (
        <Modal
          title={
            isTeacherKeyLogin
              ? "Teacher access"
              : "Welcome back"
          }
          icon={
            isTeacherKeyLogin
              ? faLock
              : faSignInAlt
          }
          onClose={() =>
            !busyAction &&
            setIsLoginOpen(false)
          }
        >
          <form
            onSubmit={handleLogin}
            className="p-5 sm:p-6"
          >
            {isTeacherKeyLogin ? (
              <>
                <p className="text-sm leading-6 text-slate-500">
                  Use your teacher access key
                  to open the teacher workspace.
                </p>

                <label className="mb-2 mt-5 block text-sm font-bold text-slate-700">
                  Teacher access key
                </label>

                <input
                  type="password"
                  value={
                    teacherLoginKey
                  }
                  onChange={(
                    event
                  ) =>
                    setTeacherLoginKey(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  autoFocus
                  required
                />
              </>
            ) : (
              <>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Email address
                </label>

                <input
                  type="email"
                  value={
                    loginEmail
                  }
                  onChange={(
                    event
                  ) =>
                    setLoginEmail(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  placeholder="you@example.com"
                  autoFocus
                  required
                />

                <label className="mb-2 mt-4 block text-sm font-bold text-slate-700">
                  Password
                </label>

                <input
                  type="password"
                  value={
                    loginPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setLoginPassword(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </>
            )}

            <button
              type="button"
              onClick={() =>
                setIsTeacherKeyLogin(
                  (current) =>
                    !current
                )
              }
              className="mt-4 text-sm font-bold text-indigo-600"
            >
              {isTeacherKeyLogin
                ? "Use email and password instead"
                : "Teacher access with key"}
            </button>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setIsLoginOpen(
                    false
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  busyAction ===
                  "login"
                }
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <FontAwesomeIcon
                  icon={
                    busyAction ===
                    "login"
                      ? faSpinner
                      : faSignInAlt
                  }
                  className={
                    busyAction ===
                    "login"
                      ? "mr-2 animate-spin"
                      : "mr-2"
                  }
                />
                Sign in
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isRegisterOpen && (
        <Modal
          title="Create your account"
          icon={faUserPlus}
          onClose={() =>
            !busyAction &&
            setIsRegisterOpen(false)
          }
        >
          <form
            onSubmit={handleRegister}
            className="p-5 sm:p-6"
          >
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Full name
            </label>

            <input
              value={registerName}
              onChange={(event) =>
                setRegisterName(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              autoFocus
              required
            />

            <label className="mb-2 mt-4 block text-sm font-bold text-slate-700">
              Email address
            </label>

            <input
              type="email"
              value={registerEmail}
              onChange={(event) =>
                setRegisterEmail(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              required
            />

            <label className="mb-2 mt-4 block text-sm font-bold text-slate-700">
              Password
            </label>

            <input
              type="password"
              minLength={8}
              value={
                registerPassword
              }
              onChange={(event) =>
                setRegisterPassword(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              required
            />

            <label className="mb-2 mt-4 block text-sm font-bold text-slate-700">
              Account type
            </label>

            <select
              value={registerRole}
              onChange={(event) =>
                setRegisterRole(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="student">
                Student
              </option>
              <option value="teacher">
                Teacher
              </option>
            </select>

            {registerRole ===
              "teacher" && (
              <>
                <label className="mb-2 mt-4 block text-sm font-bold text-slate-700">
                  Teacher access key
                </label>

                <input
                  type="password"
                  value={
                    teacherKey
                  }
                  onChange={(
                    event
                  ) =>
                    setTeacherKey(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setIsRegisterOpen(
                    false
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  busyAction ===
                  "register"
                }
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <FontAwesomeIcon
                  icon={
                    busyAction ===
                    "register"
                      ? faSpinner
                      : faUserPlus
                  }
                  className={
                    busyAction ===
                    "register"
                      ? "mr-2 animate-spin"
                      : "mr-2"
                  }
                />
                Create account
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default App;
