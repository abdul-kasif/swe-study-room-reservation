import { useState, type SubmitEvent } from "react";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/reservation";

export function LoginPage() {
  const { login, registerStudent } = useAuth();

  const [roleTab, setRoleTab] = useState<UserRole>("STUDENT");
  const [isRegistering, setIsRegistering] = useState(false);

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchRole = (role: UserRole) => {
    setRoleTab(role);
    setIsRegistering(false);
    setError(null);
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (roleTab === "STUDENT" && isRegistering) {
        await registerStudent(username.trim(), fullName.trim(), password);
      } else {
        await login(username.trim(), password, roleTab);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.35rem" }}>Study Room Portal</h1>
          <p
            style={{
              margin: "0.35rem 0 0",
              fontSize: "0.88rem",
              color: "var(--muted)",
            }}
          >
            Sign in to manage campus study room bookings
          </p>
        </div>

        {/* Role Switcher */}
        <div className="role-tabs">
          <button
            type="button"
            className={`role-tab ${roleTab === "STUDENT" ? "active-student" : ""}`}
            onClick={() => switchRole("STUDENT")}
          >
            Student Login
          </button>
          <button
            type="button"
            className={`role-tab ${roleTab === "ADMIN" ? "active-admin" : ""}`}
            onClick={() => switchRole("ADMIN")}
          >
            Admin Login
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={
                roleTab === "STUDENT" ? "e.g. student1" : "e.g. admin1"
              }
              required
            />
          </div>

          {roleTab === "STUDENT" && isRegistering && (
            <div className="field">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                className="input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jane Doe"
                required
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn ${roleTab === "ADMIN" ? "btn-admin" : "btn-primary"}`}
            style={{ width: "100%", marginTop: "0.25rem" }}
          >
            {loading
              ? "Please wait..."
              : roleTab === "STUDENT" && isRegistering
                ? "Create Student Account"
                : `Sign in as ${roleTab === "ADMIN" ? "Admin" : "Student"}`}
          </button>
        </form>

        {roleTab === "STUDENT" && (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <button
              type="button"
              className="btn"
              style={{
                border: "none",
                background: "transparent",
                color: "var(--primary)",
                fontSize: "0.84rem",
              }}
              onClick={() => {
                setIsRegistering((prev) => !prev);
                setError(null);
              }}
            >
              {isRegistering
                ? "Already have an account? Sign in"
                : "New student? Register an account"}
            </button>
          </div>
        )}

        <div className="auth-footer">
          Demo accounts: <strong>student1 / student123</strong> or{" "}
          <strong>admin1 / admin123</strong>
        </div>
      </div>
    </div>
  );
}
