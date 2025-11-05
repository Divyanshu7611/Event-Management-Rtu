"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Edit, Trash2, UserCheck, UserX, Key, Upload, Download, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createTeacher, getAllTeachers, updateTeacher, toggleTeacherStatus, resetTeacherPassword, bulkCreateTeachers, getTeacherActivity } from '@/app/actions/teacher';
import { logout } from '@/app/actions/user';

export default function TeachersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [activityData, setActivityData] = useState<any>(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const result = await getAllTeachers();
      if (result.success) {
        setTeachers(result.teachers || []);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch teachers" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await createTeacher(formData);
      if (result.success) {
        toast({ title: "Success", description: "Teacher created successfully" });
        setCreateDialogOpen(false);
        fetchTeachers();
        e.currentTarget.reset();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to create teacher" });
    }
  };

  const handleToggleStatus = async (teacherId: string) => {
    try {
      const result = await toggleTeacherStatus(teacherId);
      if (result.success) {
        toast({ title: "Success", description: "Teacher status updated" });
        fetchTeachers();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status" });
    }
  };

  const handleResetPassword = async (teacherId: string) => {
    if (!confirm('Are you sure you want to reset this teacher\'s password?')) return;
    
    try {
      const result = await resetTeacherPassword(teacherId);
      if (result.success) {
        toast({ title: "Success", description: `Password reset. New password: ${result.newPassword}` });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to reset password" });
    }
  };

  const handleViewActivity = async (teacherId: string) => {
    try {
      const result = await getTeacherActivity(teacherId);
      if (result.success) {
        setActivityData(result.activity);
        setActivityDialogOpen(true);
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch activity" });
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvData = event.target?.result as string;
      try {
        const result = await bulkCreateTeachers(csvData);
        if (result.success) {
          toast({ title: "Success", description: `Created ${result.created} teachers` });
          if (result.errors && result.errors.length > 0) {
            console.error('Errors:', result.errors);
          }
          fetchTeachers();
        } else {
          toast({ variant: "destructive", title: "Error", description: result.error });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to bulk create teachers" });
      }
    };
    reader.readAsText(file);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img src="/RTU logo.png" alt="Logo" className="h-8 w-8" />
            <h1 className="text-xl font-bold">Teacher Management</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/admin/scanner">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Teachers</h2>
          <div className="flex gap-2">
            <label htmlFor="bulk-upload">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload CSV
                </span>
              </Button>
              <input
                id="bulk-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleBulkUpload}
              />
            </label>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Teacher
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Teacher Account</DialogTitle>
                  <DialogDescription>Create a new teacher account with assigned centers and permissions.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTeacher} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" name="email" type="email" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" name="phone" type="tel" />
                    </div>
                    <div>
                      <Label htmlFor="tempPassword">Temporary Password</Label>
                      <Input id="tempPassword" name="tempPassword" placeholder="Leave empty for auto-generated" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="assignedCenters">Assigned Centers (comma-separated)</Label>
                    <Input id="assignedCenters" name="assignedCenters" placeholder="Center 1, Center 2" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="sendInviteLink" name="sendInviteLink" value="true" className="rounded" />
                    <Label htmlFor="sendInviteLink">Send invitation email with login link</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Teacher</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Centers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher._id}>
                      <TableCell>{teacher.name}</TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>{teacher.phone || '-'}</TableCell>
                      <TableCell>
                        {teacher.assignedCenters?.length > 0 
                          ? teacher.assignedCenters.join(', ')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${teacher.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {teacher.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {teacher.lastLogin 
                          ? new Date(teacher.lastLogin).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewActivity(teacher._id)}
                          >
                            <Activity className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(teacher._id)}
                          >
                            {teacher.isActive ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetPassword(teacher._id)}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {teachers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                        No teachers found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Activity Dialog */}
        <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Teacher Activity</DialogTitle>
            </DialogHeader>
            {activityData && (
              <div className="space-y-4">
                <div>
                  <Label>Events Created</Label>
                  <p className="text-2xl font-bold">{activityData.eventsCreated}</p>
                </div>
                <div>
                  <Label>Total Registrations</Label>
                  <p className="text-2xl font-bold">{activityData.totalRegistrations}</p>
                </div>
                <div>
                  <Label>Last Event Created</Label>
                  <p>{activityData.lastEventCreated ? new Date(activityData.lastEventCreated).toLocaleString() : 'None'}</p>
                </div>
                <div>
                  <Label>Last Login</Label>
                  <p>{activityData.lastLogin ? new Date(activityData.lastLogin).toLocaleString() : 'Never'}</p>
                </div>
                <div>
                  <Label>Account Created</Label>
                  <p>{new Date(activityData.accountCreated).toLocaleString()}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

