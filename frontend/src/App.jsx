import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import ResumeUpload from "./pages/ResumeUpload";
import InterviewSetup from "./pages/InterviewSetup";
import Interview from "./pages/Interview";
import FinalReport from "./pages/FinalReport";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
            <Route path="/jobs/:jobId" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
            <Route path="/resume/upload" element={<ProtectedRoute><ResumeUpload /></ProtectedRoute>} />
            <Route path="/interview/setup" element={<ProtectedRoute><InterviewSetup /></ProtectedRoute>} />
            <Route path="/interview/:sessionId" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
            <Route path="/report/:sessionId" element={<ProtectedRoute><FinalReport /></ProtectedRoute>} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
