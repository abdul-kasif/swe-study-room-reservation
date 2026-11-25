import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AdminToolbarProps {
  loading: boolean;
  onCleanupExpired: () => void;
}

export function AdminToolbar({ loading, onCleanupExpired }: AdminToolbarProps) {
  return (
    <Card>
      <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold">Admin Operations</h2>
          <p className="text-sm text-muted-foreground">
            Review VIP room requests or cancel expired drafts and pending
            approvals.
          </p>
        </div>
        <Button
          type="button"
          onClick={onCleanupExpired}
          disabled={loading}
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Cleanup Expired
        </Button>
      </CardContent>
    </Card>
  );
}
