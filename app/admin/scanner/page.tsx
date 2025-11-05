"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GraduationCap, ArrowLeft, QrCode, CheckCircle, XCircle, LogOut, ArrowRight, Mail, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { markAttendance, getAllUsers, logout } from '@/app/actions/user';
import { getEvents } from '@/app/actions/events';
import { getEventRegistrations, getEventRegistrationStats } from '@/app/actions/registration';
import {Html5QrcodeScanner} from 'html5-qrcode';
import EventManager from '@/components/event/Events';
import Chatbot from '@/components/chatbot/Chatbot';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function ScannerPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // ... (all your existing state and functions remain unchanged)
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<null | { success: boolean; message: string; user?: any }>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerSupported, setScannerSupported] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [registrationsDialogOpen, setRegistrationsDialogOpen] = useState(false);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);


    const handleScan = async (decodedText: string) => {
    if (!decodedText) return;
    setScanning(false);

    try {
      const url = decodedText.trim();
      const urlObj = new URL(url);
      const segments = urlObj.pathname.split("/");
      const userId = segments.pop();

      if (!userId) {
        setScanResult({ success: false, message: "Invalid QR code" });
        return;
      }

      const attendanceResult = await markAttendance(userId);
      setScanResult({
        success: attendanceResult.success,
        message: attendanceResult.message || attendanceResult.error || "Unknown error",
        user: attendanceResult.user,
      });

      if (attendanceResult.success) {
        toast({ title: "Success", description: attendanceResult.message });

        const usersResult = await getAllUsers();
        if (usersResult.success) setUsers(usersResult.users || []);
      } else {
        throw new Error(attendanceResult.error || "Failed to mark attendance");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };
  useEffect(() => {
    async function fetchUsers() {
      try {
        const result = await getAllUsers();
        if (result.success) {
          setUsers(result.users || []);
        } else {
          throw new Error(result.error || "Failed to fetch users");
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [toast]);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const eventsData = await getEvents();
        setEvents(eventsData || []);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    }
    fetchEvents();
  }, []);

  const handleViewEventRegistrations = async (eventId: string) => {
    try {
      const [regResult, statsResult] = await Promise.all([
        getEventRegistrations(eventId),
        getEventRegistrationStats(eventId),
      ]);
      
      if (regResult.success && statsResult.success) {
        setRegistrations(regResult.registrations || []);
        setStats(statsResult.stats);
        setSelectedEvent(eventId);
        setRegistrationsDialogOpen(true);
      } else {
        toast({ variant: "destructive", title: "Error", description: regResult.error || "Failed to fetch registrations" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch registrations" });
    }
  };
  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        false // Set verbose mode (true for debugging, false for normal use)
      );
      
      scanner.render(handleScan, (errorMessage:any) => {
        console.warn(errorMessage);
      });

      return () => {
        scanner.clear();
      };
    }
  }, [scanning]);

  const handleError = (err: any) => {
    console.error(err);
    toast({
      variant: "destructive",
      title: "Scanner Error",
      description: "Could not access camera or scanner encountered an error",
    });
    setScanning(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Function to count attendance for today
  const getTodayAttendanceCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return users.filter(user => 
      user.attendance && user.attendance.some((a: any) => {
        const attendanceDate = new Date(a.date);
        attendanceDate.setHours(0, 0, 0, 0);
        return attendanceDate.getTime() === today.getTime();
      })
    ).length;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        {/* ... header content ... */}
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
          <img src="/RTU logo.png" alt="Logo" className="h-8 w-8" />
            <h1 className="text-xl font-bold">Event Management System</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* ... ALL your existing page content ... */}
          <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
          <div className="flex gap-2 mb-4">
            <Link href="/admin/scanner/review">
              <Button variant="ghost" size="sm">
                <ArrowRight className="h-4 w-4 mr-2" />
                Get all registered students
              </Button>
            </Link>
            <Link href="/admin/teachers">
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Manage Teachers
              </Button>
            </Link>
            <Link href="/send-reminder">
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Send Reminders
              </Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Students</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{users.length}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Today's Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{getTodayAttendanceCount()}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Attendance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {users.length > 0 
                    ? `${Math.round((getTodayAttendanceCount() / users.length) * 100)}%` 
                    : '0%'}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>QR Scanner</CardTitle>
                <CardDescription>Scan student QR codes to mark attendance</CardDescription>
              </CardHeader>
              <CardContent>
                {scanning ? (
                  <div>
                    <div id="qr-reader" className="w-full h-64" />
                    <Button variant="outline" className="w-full mt-4" onClick={() => setScanning(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    {scanResult && (
                      <Alert variant={scanResult.success ? "default" : "destructive"} className="mb-4">
                        {scanResult.success ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                        <AlertTitle>{scanResult.success ? "Success" : "Error"}</AlertTitle>
                        <AlertDescription>{scanResult.message}</AlertDescription>
                      </Alert>
                    )}
                    <Button className="w-full" onClick={() => setScanning(true)}>
                      <QrCode className="h-4 w-4 mr-2" />
                      Start Scanning
                    </Button>
                  </div>
                )}
                
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Today's Attendance</CardTitle>
                <CardDescription>Students present today</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p>Loading...</p>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Roll Number</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users
                          .filter(user => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            
                            return user.attendance && user.attendance.some((a: any) => {
                              const attendanceDate = new Date(a.date);
                              attendanceDate.setHours(0, 0, 0, 0);
                              return attendanceDate.getTime() === today.getTime();
                            });
                          })
                          .map(user => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            
                            const todayAttendance = user.attendance.find((a: any) => {
                              const attendanceDate = new Date(a.date);
                              attendanceDate.setHours(0, 0, 0, 0);
                              return attendanceDate.getTime() === today.getTime();
                            });
                            
                            return (
                              <TableRow key={user.id}>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.rollNumber}</TableCell>
                                <TableCell>
                                  {todayAttendance ? format(new Date(todayAttendance.date), 'h:mm a') : ''}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        {users.filter(user => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          return user.attendance && user.attendance.some((a: any) => {
                            const attendanceDate = new Date(a.date);
                            attendanceDate.setHours(0, 0, 0, 0);
                            return attendanceDate.getTime() === today.getTime();
                          });
                        }).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                              No attendance records for today
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <EventManager />
          
          {/* Events and Registrations Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Events & Registrations</CardTitle>
              <CardDescription>View registrations for each event</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Registrations</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event._id}>
                        <TableCell className="font-medium">{event.eventName}</TableCell>
                        <TableCell>{new Date(event.eventDate).toLocaleDateString()}</TableCell>
                        <TableCell>{event.eventRegistrations?.length || 0}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewEventRegistrations(event._id)}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            View Registrations
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No events found</p>
              )}
            </CardContent>
          </Card>
          
          <Tabs value="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Students</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>Student Records</CardTitle>
                  <CardDescription>
                    Complete list of registered students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <p>Loading...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Roll Number</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Total Attendance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map(user => (
                            <TableRow key={user.id}>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.rollNumber}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{user.attendance ? user.attendance.length : 0}</TableCell>
                            </TableRow>
                          ))}
                          {users.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                No students registered yet
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="border-t py-6">
        {/* ... footer content ... */}
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Event Management System. All rights reserved.
        </div>
      </footer>
      
      {/* Event Registrations Dialog */}
      <Dialog open={registrationsDialogOpen} onOpenChange={setRegistrationsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Registrations</DialogTitle>
            <DialogDescription>
              {stats && (
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.totalRegistrations}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Attended</p>
                    <p className="text-2xl font-bold">{stats.attended}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-2xl font-bold">{stats.paid}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Collected</p>
                    <p className="text-2xl font-bold">₹{stats.totalCollected || 0}</p>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Registered At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((reg: any) => {
                const student = reg.studentId || {};
                return (
                  <TableRow key={reg._id}>
                    <TableCell className="font-medium">{reg.studentName || student.name || 'N/A'}</TableCell>
                    <TableCell>{reg.studentEmail || student.email || 'N/A'}</TableCell>
                    <TableCell>{reg.studentMobile || student.phoneNumber || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        reg.paymentStatus === 'paid' ? 'default' :
                        reg.paymentStatus === 'free' ? 'secondary' : 'destructive'
                      }>
                        {reg.paymentStatus || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={reg.attendance ? 'default' : 'outline'}>
                        {reg.attendance ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {reg.registeredAt ? format(new Date(reg.registeredAt), 'PPp') : 'N/A'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {registrations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No registrations found for this event
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
      
      {/* ✅ 2. ADD THE CHATBOT COMPONENT HERE */}
      <Chatbot />
    </div>
  );
}