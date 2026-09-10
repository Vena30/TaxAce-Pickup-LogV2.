import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Plus, RotateCcw, UserX, Shield, User } from "lucide-react";

export default function TeamManagement() {
  const utils = trpc.useUtils();
  const { data: members, isLoading } = trpc.staffAuth.listTeam.useQuery(undefined, {
    retry: false,
  });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", role: "user" as "user" | "admin" });

  const [confirmReset, setConfirmReset] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const addMember = trpc.staffAuth.addMember.useMutation({
    onSuccess: () => {
      utils.staffAuth.listTeam.invalidate();
      setShowAddDialog(false);
      setAddForm({ name: "", email: "", role: "user" });
      toast.success("Team member added. They can log in with WelcomeTaxAce!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMember = trpc.staffAuth.updateMember.useMutation({
    onSuccess: () => {
      utils.staffAuth.listTeam.invalidate();
      toast.success("Member updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPassword = trpc.staffAuth.resetPassword.useMutation({
    onSuccess: () => {
      utils.staffAuth.listTeam.invalidate();
      setConfirmReset(null);
      toast.success("Password reset to WelcomeTaxAce! — they'll be prompted to change it on next login.");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMember = trpc.staffAuth.removeMember.useMutation({
    onSuccess: () => {
      utils.staffAuth.listTeam.invalidate();
      setConfirmRemove(null);
      toast.success("Team member deactivated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim()) return;
    addMember.mutate(addForm);
  };

  const memberToRemove = members?.find((m) => m.id === confirmRemove);
  const memberToReset = members?.find((m) => m.id === confirmReset);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Team Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage who has access to TaxAce Pickup Log.
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Team Member
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading team...</div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sign In</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((member) => (
                <TableRow key={member.id} className={!member.isActive ? "opacity-50" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{member.name}</span>
                      {member.mustChangePassword && member.isActive && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                          Temp password
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      onValueChange={(val) =>
                        updateMember.mutate({ id: member.id, role: val as "user" | "admin" })
                      }
                      disabled={!member.isActive}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3 w-3 text-primary" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="user">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            User
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {member.isActive ? (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {member.lastSignedIn
                      ? new Date(member.lastSignedIn).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {member.isActive ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => setConfirmReset(member.id)}
                            title="Reset password to WelcomeTaxAce!"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset PW
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                            onClick={() => setConfirmRemove(member.id)}
                            title="Deactivate this team member"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => updateMember.mutate({ id: member.id, isActive: true })}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Full Name</Label>
              <Input
                id="add-name"
                placeholder="e.g. Samantha"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="e.g. samantha@taxace.com"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-role">Role</Label>
              <Select
                value={addForm.role}
                onValueChange={(v) => setAddForm((f) => ({ ...f, role: v as "user" | "admin" }))}
              >
                <SelectTrigger id="add-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              They'll log in with the temporary password <strong>WelcomeTaxAce!</strong> and be prompted to set a new one.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMember.isPending}>
                {addMember.isPending ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Confirm */}
      <AlertDialog open={confirmReset !== null} onOpenChange={() => setConfirmReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset <strong>{memberToReset?.name}</strong>'s password to{" "}
              <strong>WelcomeTaxAce!</strong> and require them to set a new password on next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmReset !== null && resetPassword.mutate({ id: confirmReset })}
            >
              Reset Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirm */}
      <AlertDialog open={confirmRemove !== null} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate <strong>{memberToRemove?.name}</strong>'s account. They will no
              longer be able to log in. You can reactivate them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmRemove !== null && removeMember.mutate({ id: confirmRemove })}
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
