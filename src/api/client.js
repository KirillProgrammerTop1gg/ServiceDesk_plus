import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // sends httpOnly cookie automatically
  headers: { "Content-Type": "application/json" },
  xsrfCookieName: "csrf_token",
  xsrfHeaderName: "X-CSRF-Token",
});

// ── Auth ──────────────────────────────────────────────────

export const login = (username, password) => {
  // FastAPI OAuth2PasswordRequestForm expects form-encoded body
  const params = new URLSearchParams();
  params.append("username", username);
  params.append("password", password);
  return api.post("/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
};

export const register = (username, email, password) =>
  api.post("/register", { username, email, password });

export const logout = () => api.post("/logout");

export const getMe = () => api.get("/me");

// ── Problems (User) ───────────────────────────────────────

export const getMyProblems = () => api.get("/problems/my");

export const addProblem = (formData) =>
  api.post("/problems", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getMessage = (id) => api.get(`/problems/${id}/answer`);

export const markAnswerRead = (id) =>
  api.post(`/problems/${id}/read`);

export const getServiceRecord = (id) => api.get(`/service-records/${id}`);

// ── Admin ─────────────────────────────────────────────────

export const getNewProblems = () => api.get("/problems/new");

export const getProblem = (problemId) => api.get(`/problems/${problemId}`);

export const takeProblem = (problemId) =>
  api.post(`/problems/${problemId}/take`);

export const getAdminProblems = () => api.get("/problems/admin");

export const addAnswer = (problemId, message, isPrivate = false) =>
  api.post("/answers", { problem_id: problemId, message, is_private: isPrivate });

export const completeService = (problemId, workDone, partsUsed) =>
  api.post("/service-records", {
    problem_id: problemId,
    work_done: workDone,
    parts_used: partsUsed,
  });

export const deleteProblem = (problemId) =>
  api.delete(`/problems/${problemId}`);

// Admin statistics
export const getAdminStats = () => api.get('/admin/stats');

// Admin user role management
export const getAdminUsers = () => api.get("/admin/users");
export const changeUserRole = (userId, role) =>
  api.post(`/admin/users/${userId}/role`, { role });

// ── State Machine & Workflow Actions ─────────────────────
export const getAdminMasters = () => api.get("/admin/masters");
export const approveProblem = (id) => api.post(`/problems/${id}/approve`);
export const declineProblem = (id, comment) => api.post(`/problems/${id}/decline`, { comment });
export const assignMaster = (id, masterId) => api.post(`/problems/${id}/assign`, { master_id: masterId });
export const updateProblemNotes = (id, notes) => api.post(`/problems/${id}/notes`, { notes });
export const submitCompletionRequest = (id, workDone, partsUsed) => api.post(`/problems/${id}/completion-request`, { work_done: workDone, parts_used: partsUsed });
export const approveCompletion = (id) => api.post(`/problems/${id}/completion-approve`);
export const rejectCompletion = (id, comment) => api.post(`/problems/${id}/completion-reject`, { comment });

// New Workflows: Price Acceptance
export const proposePrice = (id, proposedPrice) => api.post(`/problems/${id}/propose-price`, { proposed_price: proposedPrice });
export const cancelPrice = (id) => api.post(`/problems/${id}/cancel-price`);
export const acceptPrice = (id) => api.post(`/problems/${id}/accept-price`);
export const declinePrice = (id) => api.post(`/problems/${id}/decline-price`);
export const negotiatePrice = (id, counterPrice, comment) => api.post(`/problems/${id}/negotiate-price`, { counter_price: counterPrice, comment });
export const acceptNegotiation = (id) => api.post(`/problems/${id}/accept-negotiation`);

// New Workflows: Master Requests (private to manager)
export const submitMasterRequest = (id, requestType, comment, workDone = null, partsUsed = null) => 
  api.post(`/problems/${id}/master-request`, { request_type: requestType, comment, work_done: workDone, parts_used: partsUsed });
export const cancelMasterRequest = (id) => api.post(`/problems/${id}/master-request/cancel`);
export const acceptMasterRequest = (id, formalComment, workDone = null, partsUsed = null) => 
  api.post(`/problems/${id}/master-request/accept`, { formal_comment: formalComment, work_done: workDone, parts_used: partsUsed });

// New Workflows: Payment
export const postPayment = (id, formData) => api.post(`/problems/${id}/post-payment`, formData, {
  headers: { "Content-Type": "multipart/form-data" }
});
export const markPaid = (id) => api.post(`/problems/${id}/mark-paid`);
export const confirmPayment = (id) => api.post(`/problems/${id}/confirm-payment`);

// ── Account / Telegram Settings ───────────────────────────
export const changeUsername = (newUsername) =>
  api.post("/user/change-username", { new_username: newUsername });

export const getTelegramStatus = () => api.get("/user/telegram");

export const unlinkTelegram = () => api.post("/user/telegram/unlink");

// ── AI Refinement ──────────────────────────────────────────
export const refineProblemAI = (title, description) =>
  api.post("/ai/refine-problem", { title, description });

export const refineCommentAI = (text) =>
  api.post("/ai/refine-comment", { text });

export const refineBargain = (currentPrice, counterPrice, comment) =>
  api.post("/ai/refine-bargain", { current_price: currentPrice, counter_price: counterPrice, comment });

export const confirmHandover = (id) =>
  api.post(`/problems/${id}/confirm-handover`);

export default api;
