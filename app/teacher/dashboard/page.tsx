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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Edit, Trash2, Download, ImageIcon, Users, Calendar, DollarSign, LogOut, Award, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getEvents, createEvent, updateEvent, deleteEvent } from '@/app/actions/events';
import { generatePosterAction } from '@/app/actions/generation';
import { getEventRegistrations, getEventRegistrationStats } from '@/app/actions/registration';
import { exportEventRegistrationsCSV, exportEventRegistrationsPDF } from '@/app/actions/export';
import { releaseCertificates } from '@/app/actions/certificate';
import { markEventAttendance } from '@/app/actions/attendance';
import { logout } from '@/app/actions/user';
import { Checkbox } from '@/components/ui/checkbox';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle } from 'lucide-react';

export default function TeacherDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [registrationsDialogOpen, setRegistrationsDialogOpen] = useState(false);
  const [selectedEventRegistrations, setSelectedEventRegistrations] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [visibility, setVisibility] = useState('public');
  const [editVisibility, setEditVisibility] = useState('public');
  const [selectedForCertificates, setSelectedForCertificates] = useState<string[]>([]);
  const [releasingCertificates, setReleasingCertificates] = useState(false);
  const [scanningQR, setScanningQR] = useState(false);
  const [scanResult, setScanResult] = useState<null | { success: boolean; message: string; user?: any }>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Auto-refresh registrations when dialog is open
  useEffect(() => {
    if (registrationsDialogOpen && selectedEventRegistrations) {
      // Refresh immediately
      const refresh = async () => {
        try {
          const [regResult, statsResult] = await Promise.all([
            getEventRegistrations(selectedEventRegistrations),
            getEventRegistrationStats(selectedEventRegistrations),
          ]);
          
          if (regResult.success && statsResult.success) {
            setRegistrations(regResult.registrations || []);
            setStats(statsResult.stats);
          }
        } catch (error) {
          console.error('Error refreshing registrations:', error);
        }
      };
      
      refresh();
      
      // Set up auto-refresh every 5 seconds
      const interval = setInterval(refresh, 5000);
      
      setRefreshInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [registrationsDialogOpen, selectedEventRegistrations]);

  // QR Scanner handler for event attendance
  useEffect(() => {
    if (scanningQR && selectedEventRegistrations) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader-teacher",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        false
      );

      const handleScan = async (decodedText: string) => {
        if (!decodedText) return;
        
        try {
          const url = decodedText.trim();
          const urlObj = new URL(url);
          const segments = urlObj.pathname.split("/");
          const userId = segments.pop();

          if (!userId) {
            setScanResult({ success: false, message: "Invalid QR code" });
            return;
          }

          const result = await markEventAttendance(userId, selectedEventRegistrations);
          setScanResult({
            success: result.success,
            message: result.message || result.error || "Unknown error",
            user: result.user,
          });

          if (result.success) {
            toast({ title: "Success", description: result.message });
            setScanningQR(false);
            // Refresh registrations
            await handleViewRegistrations(selectedEventRegistrations);
            // Clear scanner
            setTimeout(() => {
              scanner.clear();
            }, 1000);
          }
        } catch (error: any) {
          toast({ variant: "destructive", title: "Error", description: error.message });
          setScanResult({ success: false, message: error.message });
        }
      };

      scanner.render(
        handleScan,
        (errorMessage: any) => {
          console.warn(errorMessage);
        }
      );

      return () => {
        scanner.clear();
      };
    }
  }, [scanningQR, selectedEventRegistrations]);

  const fetchEvents = async () => {
    try {
      const eventsData = await getEvents();
      setEvents(eventsData || []);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch events" });
    } finally {
      setLoading(false);
    }
  };

//   const [visibility, setVisibility] = useState('public');

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // Add visibility value manually since Select doesn't work with FormData
    formData.set('visibility', visibility);
    
    try {
      const result = await createEvent(formData);
      if (result.ok) {
        toast({ title: "Success", description: "Event created successfully" });
        setCreateDialogOpen(false);
        setVisibility('public'); // Reset
        fetchEvents();
        e.currentTarget.reset();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to create event" });
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEvent) return;
    
    const formData = new FormData(e.currentTarget);
    // Add visibility value manually since Select doesn't work with FormData
    formData.set('visibility', editVisibility);
    
    try {
      const result = await updateEvent(selectedEvent._id, formData);
      if (result.ok) {
        toast({ title: "Success", description: "Event updated successfully" });
        setEditDialogOpen(false);
        setSelectedEvent(null);
        setEditVisibility('public');
        fetchEvents();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update event" });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const result = await deleteEvent(eventId);
      if (result.ok) {
        toast({ title: "Success", description: "Event deleted successfully" });
        fetchEvents();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete event" });
    }
  };

  const handleGeneratePoster = async (eventId: string) => {
    try {
      const result = await generatePosterAction(eventId);
      if (result.success) {
        // Open poster in new window for download
        const link = document.createElement('a');
        link.href = result.posterUrl!;
        link.download = `${result.event?.eventName || 'poster'}_poster.png`;
        link.click();
        toast({ title: "Success", description: "Poster generated successfully" });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to generate poster" });
    }
  };

  const handleViewRegistrations = async (eventId: string) => {
    try {
      const [regResult, statsResult] = await Promise.all([
        getEventRegistrations(eventId),
        getEventRegistrationStats(eventId),
      ]);
      
      if (regResult.success && statsResult.success) {
        console.log('Registrations fetched:', regResult.registrations?.length || 0);
        console.log('Sample registration:', regResult.registrations?.[0]);
        setRegistrations(regResult.registrations || []);
        setStats(statsResult.stats);
        setSelectedEventRegistrations(eventId);
        setSelectedForCertificates([]);
        setRegistrationsDialogOpen(true);
      } else {
        const errorMsg = regResult.error || statsResult.error || "Failed to fetch registrations";
        console.error('Registration fetch error:', errorMsg);
        toast({ variant: "destructive", title: "Error", description: errorMsg });
      }
    } catch (error: any) {
      console.error('Exception in handleViewRegistrations:', error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to fetch registrations" });
    }
  };

  const handleReleaseCertificates = async () => {
    if (!selectedEventRegistrations || selectedForCertificates.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select students to issue certificates" });
      return;
    }

    if (!confirm(`Issue certificates to ${selectedForCertificates.length} student(s)?`)) {
      return;
    }

    setReleasingCertificates(true);
    try {
      const result = await releaseCertificates(selectedEventRegistrations, selectedForCertificates);
      if (result.success) {
        toast({ title: "Success", description: result.message });
        setSelectedForCertificates([]);
        // Refresh registrations
        await handleViewRegistrations(selectedEventRegistrations);
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to release certificates" });
    } finally {
      setReleasingCertificates(false);
    }
  };

  const toggleCertificateSelection = (registrationId: string, studentId: string) => {
    setSelectedForCertificates(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleExportCSV = async (eventId: string) => {
    try {
      const result = await exportEventRegistrationsCSV(eventId);
      if (result.success && result.file) {
        const binaryString = atob(result.file);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || 'registrations.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Success", description: "CSV exported successfully" });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to export CSV" });
    }
  };

  const handleExportPDF = async (eventId: string) => {
    try {
      const result = await exportEventRegistrationsPDF(eventId);
      if (result.success && result.file) {
        const binaryString = atob(result.file);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || 'registrations.pdf';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Success", description: "PDF exported successfully" });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to export PDF" });
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Calculate dashboard stats
  const totalEvents = events.length;
  const totalRegistrations = events.reduce((sum, event) => sum + (event.eventRegistrations?.length || 0), 0);
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.eventDate);
    return eventDate >= new Date();
  }).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img src="/RTU logo.png" alt="Logo" className="h-8 w-8" />
            <h1 className="text-xl font-bold">Teacher Dashboard</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalEvents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{upcomingEvents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Registrations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalRegistrations}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Events This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {events.filter(e => {
                  const eventDate = new Date(e.eventDate);
                  const now = new Date();
                  return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Events Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">My Events</h2>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
                <DialogDescription>Create a new event with all details.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <Label htmlFor="eventName">Event Name *</Label>
                  <Input id="eventName" name="eventName" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="eventDate">Event Date *</Label>
                    <Input id="eventDate" name="eventDate" type="date" required />
                  </div>
                  <div>
                    <Label htmlFor="startDateTime">Start Time</Label>
                    <Input id="startDateTime" name="startDateTime" type="datetime-local" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="endDateTime">End Time</Label>
                  <Input id="endDateTime" name="endDateTime" type="datetime-local" />
                </div>
                <div>
                  <Label htmlFor="motive">Motive/Description *</Label>
                  <Textarea id="motive" name="motive" required />
                </div>
                <div>
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea id="description" name="description" rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="centerId">Center/Venue</Label>
                    <Input id="centerId" name="centerId" />
                  </div>
                  <div>
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input id="capacity" name="capacity" type="number" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="registrationFee">Registration Fee (Text)</Label>
                    <Input id="registrationFee" name="registrationFee" placeholder="Free or amount" />
                  </div>
                  <div>
                    <Label htmlFor="feeAmount">Fee Amount (Numeric)</Label>
                    <Input id="feeAmount" name="feeAmount" type="number" step="0.01" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="registrationDeadline">Registration Deadline</Label>
                  <Input id="registrationDeadline" name="registrationDeadline" type="datetime-local" />
                </div>
                <div>
                  <Label htmlFor="whatsappGroupLink">WhatsApp Group Link</Label>
                  <Input id="whatsappGroupLink" name="whatsappGroupLink" placeholder="https://chat.whatsapp.com/..." />
                </div>
                <div>
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Event</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Registrations</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event._id}>
                      <TableCell className="font-medium">{event.eventName}</TableCell>
                      <TableCell>{new Date(event.eventDate).toLocaleDateString()}</TableCell>
                      <TableCell>{event.eventRegistrations?.length || 0}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          event.posterStatus === 'ready' ? 'bg-green-100 text-green-800' :
                          event.posterStatus === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {event.posterStatus || 'pending'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRegistrations(event._id)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGeneratePoster(event._id)}
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEvent(event);
                              setEditVisibility(event.visibility || 'public');
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEvent(event._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {events.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        No events found. Create your first event!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Edit Event Dialog */}
        {selectedEvent && (
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Event</DialogTitle>
                <DialogDescription>Update event details.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateEvent} className="space-y-4">
                <div>
                  <Label htmlFor="edit-eventName">Event Name *</Label>
                  <Input id="edit-eventName" name="eventName" defaultValue={selectedEvent.eventName} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-eventDate">Event Date *</Label>
                    <Input id="edit-eventDate" name="eventDate" type="date" defaultValue={selectedEvent.eventDate} required />
                  </div>
                  <div>
                    <Label htmlFor="edit-startDateTime">Start Time</Label>
                    <Input id="edit-startDateTime" name="startDateTime" type="datetime-local" 
                      defaultValue={selectedEvent.startDateTime ? new Date(selectedEvent.startDateTime).toISOString().slice(0, 16) : ''} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-motive">Motive/Description *</Label>
                  <Textarea id="edit-motive" name="motive" defaultValue={selectedEvent.motive} required />
                </div>
                <div>
                  <Label htmlFor="edit-description">Full Description</Label>
                  <Textarea id="edit-description" name="description" rows={4} defaultValue={selectedEvent.description || ''} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-centerId">Center/Venue</Label>
                    <Input id="edit-centerId" name="centerId" defaultValue={selectedEvent.centerId || ''} />
                  </div>
                  <div>
                    <Label htmlFor="edit-capacity">Capacity</Label>
                    <Input id="edit-capacity" name="capacity" type="number" defaultValue={selectedEvent.capacity || ''} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-registrationFee">Registration Fee (Text)</Label>
                    <Input id="edit-registrationFee" name="registrationFee" defaultValue={selectedEvent.registrationFee || ''} />
                  </div>
                  <div>
                    <Label htmlFor="edit-feeAmount">Fee Amount (Numeric)</Label>
                    <Input id="edit-feeAmount" name="feeAmount" type="number" step="0.01" defaultValue={selectedEvent.feeAmount || ''} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-registrationDeadline">Registration Deadline</Label>
                  <Input id="edit-registrationDeadline" name="registrationDeadline" type="datetime-local" 
                    defaultValue={selectedEvent.registrationDeadline ? new Date(selectedEvent.registrationDeadline).toISOString().slice(0, 16) : ''} />
                </div>
                <div>
                  <Label htmlFor="edit-whatsappGroupLink">WhatsApp Group Link</Label>
                  <Input id="edit-whatsappGroupLink" name="whatsappGroupLink" 
                    defaultValue={selectedEvent.whatsappGroupLink || ''} 
                    placeholder="https://chat.whatsapp.com/..." />
                </div>
                <div>
                  <Label htmlFor="edit-visibility">Visibility</Label>
                  <Select value={editVisibility} onValueChange={setEditVisibility}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Event</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Registrations Dialog */}
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
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => selectedEventRegistrations && handleExportCSV(selectedEventRegistrations)}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => selectedEventRegistrations && handleExportPDF(selectedEventRegistrations)}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setScanningQR(true);
                  setScanResult(null);
                }}
              >
                <QrCode className="h-4 w-4 mr-2" />
                Scan QR for Attendance
              </Button>
              {selectedForCertificates.length > 0 && (
                <Button 
                  size="sm" 
                  onClick={handleReleaseCertificates}
                  disabled={releasingCertificates}
                >
                  <Award className="h-4 w-4 mr-2" />
                  {releasingCertificates ? 'Releasing...' : `Issue Certificates (${selectedForCertificates.length})`}
                </Button>
              )}
            </div>
            {scanningQR && (
              <div className="mb-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">QR Scanner - Event Attendance</h3>
                  <Button size="sm" variant="outline" onClick={() => {
                    setScanningQR(false);
                    setScanResult(null);
                  }}>
                    Close Scanner
                  </Button>
                </div>
                {scanResult && (
                  <Alert variant={scanResult.success ? "default" : "destructive"} className="mb-2">
                    {scanResult.success ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    <AlertTitle>{scanResult.success ? "Success" : "Error"}</AlertTitle>
                    <AlertDescription>{scanResult.message}</AlertDescription>
                  </Alert>
                )}
                <div id="qr-reader-teacher" className="w-full" />
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((reg: any) => {
                  const student = reg.studentId || {};
                  // Get studentId from multiple possible locations
                  const studentId = reg.studentId?._id?.toString() || 
                                   reg.studentId?.toString() || 
                                   student._id?.toString() || 
                                   student.id || 
                                   '';
                  const isSelected = selectedForCertificates.includes(studentId);
                  return (
                    <TableRow key={reg._id}>
                      <TableCell>
                        {reg.attendance && studentId ? (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleCertificateSelection(reg._id, studentId)}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>{reg.studentName || student.name || 'N/A'}</TableCell>
                      <TableCell>{reg.studentEmail || student.email || 'N/A'}</TableCell>
                      <TableCell>{reg.studentMobile || student.phoneNumber || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          reg.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          reg.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {reg.paymentStatus || 'pending'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${reg.attendance ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {reg.attendance ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {registrations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      No registrations found for this event. Students can register via the event registration page.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

