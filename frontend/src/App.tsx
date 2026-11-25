import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Topbar } from "@/components/layout/Topbar";
import { LoginPage } from "@/components/auth/LoginPage";
import { StudentPortal } from "@/components/student/StudentPortal";
import { AdminPortal } from "@/components/admin/AdminPortal";

function AuthenticatedShell() {
  const { user, logout } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar user={user} onLogout={logout} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {user.role === "ADMIN" ? <AdminPortal /> : <StudentPortal />}
      </main>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AuthenticatedShell />
    </AuthProvider>
  );
}

export default App;
