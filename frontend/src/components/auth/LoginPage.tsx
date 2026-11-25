import { useState, type SubmitEvent } from "react";
import { AlertCircle, BookOpen, Shield, GraduationCap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { UserRole } from "@/types/reservation";

export function LoginPage() {
  const { login, registerStudent } = useAuth();

  const [roleTab, setRoleTab] = useState<UserRole>("STUDENT");
  const [isRegistering, setIsRegistering] = useState(false);

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (value: string) => {
    setRoleTab(value as UserRole);
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">Study Room Portal</CardTitle>
          <CardDescription>
            Sign in to book and manage campus study rooms
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <Tabs
            value={roleTab}
            onValueChange={handleRoleChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="STUDENT" className="gap-1.5">
                <GraduationCap className="h-4 w-4" />
                Student
              </TabsTrigger>
              <TabsTrigger value="ADMIN" className="gap-1.5">
                <Shield className="h-4 w-4" />
                Admin
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={roleTab === "STUDENT" ? "student1" : "admin1"}
                required
              />
            </div>

            {roleTab === "STUDENT" && isRegistering && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={`w-full ${
                roleTab === "ADMIN"
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {loading
                ? "Please wait..."
                : roleTab === "STUDENT" && isRegistering
                  ? "Create Student Account"
                  : `Sign in as ${roleTab === "ADMIN" ? "Admin" : "Student"}`}
            </Button>
          </form>

          {roleTab === "STUDENT" && (
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="text-blue-600"
                onClick={() => {
                  setIsRegistering((prev) => !prev);
                  setError(null);
                }}
              >
                {isRegistering
                  ? "Already have an account? Sign in"
                  : "New student? Register an account"}
              </Button>
            </div>
          )}

          <div className="border-t pt-4 text-center text-xs text-muted-foreground">
            Demo:{" "}
            <strong className="text-foreground">student1 / student123</strong>{" "}
            or <strong className="text-foreground">admin1 / admin123</strong>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
