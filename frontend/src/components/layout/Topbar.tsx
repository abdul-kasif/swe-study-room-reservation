import { BookOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AuthUser } from "@/types/reservation";

interface TopbarProps {
  user: AuthUser;
  onLogout: () => void;
}

export function Topbar({ user, onLogout }: TopbarProps) {
  const isAdmin = user.role === "ADMIN";

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">
            Study Room Portal
          </span>
          <Badge
            variant={isAdmin ? "default" : "secondary"}
            className={
              isAdmin
                ? "bg-slate-900 text-white hover:bg-slate-900"
                : "bg-blue-100 text-blue-800 hover:bg-blue-100"
            }
          >
            {user.role}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.fullName} (
            <strong className="text-foreground">{user.username}</strong>)
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
