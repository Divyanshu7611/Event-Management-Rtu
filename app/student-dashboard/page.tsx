// "use client";

// import { useState, useEffect } from "react";
// import { useSearchParams } from "next/navigation";
// import Link from "next/link";
// import { QRCodeSVG } from "qrcode.react";
// import { Button } from "@/components/ui/button";
// import { toZonedTime } from "date-fns-tz";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { ArrowLeft, Calendar, Download } from "lucide-react";
// import { format } from "date-fns";
// import { getStudentById, getStudentByEmail } from "@/app/actions/user";
// import { useToast } from "@/hooks/use-toast";



// interface User {
//   id: string;
//   name: string;
//   email: string;
//   rollNumber: string;
//   branch: string;
//   year: string;
//   eventName: string;
//   phoneNumber: string;
//   universityRollNo: string;
//   qrCode: string;
//   attendance: {
//     date: string;
//     present: boolean;
//   }[];
//   cgpa: string;
//   back: string;
//   summary: string;
//   clubs: string;
//   aim: string;
//   believe: string;
//   expect: string;
//   domain: string[];
// }

// export default function DashboardPage() {
//   const searchParams = useSearchParams();
//   const userId = searchParams.get("userId");
//   const { toast } = useToast();

//   const [user, setUser] = useState<User | null | undefined>(null);
//   const [loading, setLoading] = useState(true);
//   const [email, setEmail] = useState("");
//   const [searchLoading, setSearchLoading] = useState(false);

//   useEffect(() => {
//     async function fetchUser() {
//       if (userId) {
//         setLoading(true);
//         const result = await getStudentById(userId);
//         if (result.success && result.user) {
//           setUser(result.user);
//         } else {
//           toast({
//             variant: "destructive",
//             title: "Error",
//             description: result.error || "Failed to fetch user data",
//           });
//         }
//         setLoading(false);
//       } else {
//         const emailParam = searchParams.get("email");
//         if (emailParam) {
//             await handleSearch(emailParam);
//         } else {
//             setLoading(false);
//         }
//       }
//     }
//     fetchUser();
//   }, [userId, searchParams, toast]);


//   const handleSearch = async (paramEmail?:string) => {
//      const searchEmail = String(paramEmail || email || "").trim();
//     if (!searchEmail) {
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description: "Please enter your email",
//       });
//       return;
//     }

//     setSearchLoading(true);
//     const result = await getStudentByEmail(searchEmail);

//     if (result.success && result.user) {
//       setUser(result.user);
//     } else {
//       setUser(null);
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description: result.error || "User not found",
//       });
//     }
//     setSearchLoading(false);
//   };

//   const downloadQR = () => {
//     if (!user) return;

//     const svg = document.querySelector("#qr-code-svg") as SVGElement;
//     if (!svg) return;

//     const serializer = new XMLSerializer();
//     const svgData = serializer.serializeToString(svg);
//     const canvas = document.createElement("canvas");
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     const img = new Image();

//     img.onload = () => {
//       canvas.width = img.width;
//       canvas.height = img.height;
//       ctx.drawImage(img, 0, 0);

//       const url = canvas.toDataURL("image/png");
//       const link = document.createElement("a");
//       link.href = url;
//       link.download = `qrcode-${user.rollNumber}.png`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//     };

//     img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
//   };

//   return (
//     <div className="min-h-screen bg-background flex flex-col">
//       <header className="border-b">
//         <div className="container mx-auto px-4 py-4 flex justify-between items-center">
//           <div className="flex items-center space-x-2">
//             <img src="/RTU logo.png" alt="Logo" className="h-8 w-8" />
//             <h1 className="text-xl font-bold">Event Management System</h1>
//           </div>
//           <Link href="/">
//             <Button variant="ghost" size="sm">
//               <ArrowLeft className="h-4 w-4 mr-2" />
//               Back to Home
//             </Button>
//           </Link>
//         </div>
//       </header>

//       <main className="flex-1 container mx-auto px-4 py-8">
//         {!user && !loading ? (
//           <Card className="max-w-md mx-auto">
//             <CardHeader>
//               <CardTitle>Find Your Dashboard</CardTitle>
//               <CardDescription>
//                 Enter your email address to access your dashboard and QR code.
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="flex space-x-2">
//                 <Input
//                   placeholder="Enter your email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
//                 />
//                 <Button onClick={() => handleSearch()} disabled={searchLoading}>
//                   {searchLoading ? "Searching..." : "Search"}
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         ) : loading ? (
//           <div className="flex justify-center items-center h-64">
//             <p>Loading...</p>
//           </div>
//         ) : user ? (
//           <div className="max-w-4xl mx-auto">
//             <h2 className="text-2xl font-bold mb-6">Student Dashboard</h2>

//             <div className="grid md:grid-cols-3 gap-6 mb-8">
//               <Card className="md:col-span-1">
//                 <CardHeader>
//                   <CardTitle>Student Info</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <dl className="space-y-3 text-sm">
//                     {/* ... your student info details here ... */}
//                      <div>
//                        <a href="https://chat.whatsapp.com/CeM1n0ZrxxH7owou3ywUmI?mode=ac_t" className="hover:underline bg-gray-200 px-3 py-2 mb-2 rounded-lg text-black font-semibold" target="_blank" rel="noopener noreferrer">
//               Join WhatsApp Group
//             </a>
//                       <dt className="font-medium text-muted-foreground mt-3">
//                         Name
//                       </dt>
//                       <dd className="text-lg font-semibold">{user.name}</dd>
//                     </div>

//                     <div>
//                       <dt className="font-medium text-muted-foreground">
//                         Roll Number
//                       </dt>
//                       <dd>{user.rollNumber}</dd>
//                     </div>

//                     <div>
//                       <dt className="font-medium text-muted-foreground">
//                         Email
//                       </dt>
//                       <dd className="truncate">{user.email}</dd>
//                     </div>

//                   </dl>
//                 </CardContent>
//               </Card>

//               <Card className="md:col-span-2">
//                 <CardHeader>
//                   <CardTitle>Your QR Code</CardTitle>
//                   <CardDescription>
//                     Present this for attendance scanning.
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent className="flex flex-col items-center">
//                   <div className="bg-white p-4 rounded-lg mb-4 shadow-md">
//                     {/* --- THIS IS THE FIX --- */}
//                     <QRCodeSVG
//                       id="qr-code-svg"
//                       value={user.qrCode}
//                       size={256}         // Increased size for clarity
//                       level="H"          // High error correction
//                       includeMargin={true} // Ensures a white border
//                     />
//                   </div>
//                   <Button variant="outline" onClick={downloadQR}>
//                     <Download className="h-4 w-4 mr-2" />
//                     Download QR Code
//                   </Button>
//                 </CardContent>
//               </Card>
//             </div>

//             <Tabs defaultValue="attendance">
//               <TabsList className="mb-4">
//                 <TabsTrigger value="attendance">Attendance History</TabsTrigger>
//               </TabsList>

//               <TabsContent value="attendance">
//                 <Card>
//                   <CardHeader>
//                     <CardTitle className="flex items-center">
//                       <Calendar className="h-5 w-5 mr-2" />
//                       Attendance Records
//                     </CardTitle>
//                   </CardHeader>
//                   <CardContent>
//                     {user.attendance && user.attendance.length > 0 ? (
//                       <Table>
//                         <TableHeader>
//                           <TableRow>
//                             <TableHead>Date</TableHead>
//                             <TableHead>Status</TableHead>
//                           </TableRow>
//                         </TableHeader>
//                         <TableBody>
//                           {user.attendance.map((record, index) => (
//                             <TableRow key={index}>
//                               <TableCell>
//                                 {format(toZonedTime(new Date(record.date), "Asia/Kolkata"), "PPP")}
//                               </TableCell>
//                               <TableCell>
//                                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
//                                   Present
//                                 </span>
//                               </TableCell>
//                             </TableRow>
//                           ))}
//                         </TableBody>
//                       </Table>
//                     ) : (
//                       <div className="text-center py-8 text-muted-foreground">
//                         No attendance records found.
//                       </div>
//                     )}
//                   </CardContent>
//                 </Card>
//               </TabsContent>
//             </Tabs>
//           </div>
//         ) : null}
//       </main>

//       <footer className="border-t py-6">
//         <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
//           © {new Date().getFullYear()} Event Management System. All rights reserved.
//         </div>
//       </footer>
//     </div>
//   );
// }


"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toZonedTime } from "date-fns-tz";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Calendar, Download, Ticket, Award, ExternalLink, QrCode } from "lucide-react";
import { format } from "date-fns";
import { getStudentById, getStudentByEmail } from "@/app/actions/user";
import { getStudentRegistrations, getStudentCertificates, getAvailableEvents } from "@/app/actions/student";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  branch: string;
  year: string;
  eventName: string;
  phoneNumber: string;
  universityRollNo: string;
  qrCode: string;
  attendance: {
    date: string;
    present: boolean;
  }[];
  cgpa: string;
  back: string;
  summary: string;
  clubs: string;
  aim: string;
  believe: string;
  expect: string;
  domain: string[];
}

function DashboardPageContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const { toast } = useToast();

  const [user, setUser] = useState<User | null | undefined>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [availableEvents, setAvailableEvents] = useState<any[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  const fetchStudentData = useCallback(async (studentId: string) => {
    setLoadingRegistrations(true);
    try {
      const [regResult, certResult, eventsResult] = await Promise.all([
        getStudentRegistrations(studentId),
        getStudentCertificates(studentId),
        getAvailableEvents(),
      ]);

      if (regResult.success) {
        setRegistrations(regResult.registrations || []);
      }
      if (certResult.success) {
        setCertificates(certResult.certificates || []);
      }
      if (eventsResult.success) {
        setAvailableEvents(eventsResult.events || []);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoadingRegistrations(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchStudentData(user.id);
    }
  }, [user?.id, fetchStudentData]);

  useEffect(() => {
    async function fetchUser() {
      if (userId) {
        setLoading(true);
        const result = await getStudentById(userId);
        if (result.success && result.user) {
          setUser(result.user);
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "Failed to fetch user data",
          });
        }
        setLoading(false);
      } else {
        const emailParam = searchParams.get("email");
        if (emailParam) {
          await handleSearch(emailParam);
        } else {
          setLoading(false);
        }
      }
    }
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, searchParams]);

  const handleSearch = useCallback(async (paramEmail?: string) => {
    const searchEmail = String(paramEmail || email || "").trim();
    if (!searchEmail) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your email",
      });
      return;
    }

    setSearchLoading(true);
    const result = await getStudentByEmail(searchEmail);

    if (result.success && result.user) {
      setUser(result.user);
    } else {
      setUser(null);
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error || "User not found",
      });
    }
    setSearchLoading(false);
  }, [email, toast]);

  const downloadQR = () => {
    if (!user) return;

    const svg = document.querySelector("#qr-code-svg") as SVGElement;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgData = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `qrcode-${user.rollNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img src="/RTU logo.png" alt="Logo" className="h-8 w-8" />
            <h1 className="text-xl font-bold">Event Management System</h1>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {!user && !loading ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Find Your Dashboard</CardTitle>
              <CardDescription>
                Enter your email address to access your dashboard and QR code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={() => handleSearch()} disabled={searchLoading}>
                  {searchLoading ? "Searching..." : "Search"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading...</p>
          </div>
        ) : user ? (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Student Dashboard</h2>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Student Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <a
                        href="https://chat.whatsapp.com/CeM1n0ZrxxH7owou3ywUmI?mode=ac_t"
                        className="hover:underline bg-gray-200 px-3 py-2 mb-2 rounded-lg text-black font-semibold"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Join WhatsApp Group
                      </a>
                      <dt className="font-medium text-muted-foreground mt-3">
                        Name
                      </dt>
                      <dd className="text-lg font-semibold">{user.name}</dd>
                    </div>

                    <div>
                      <dt className="font-medium text-muted-foreground">
                        Roll Number
                      </dt>
                      <dd>{user.rollNumber}</dd>
                    </div>

                    <div>
                      <dt className="font-medium text-muted-foreground">
                        Email
                      </dt>
                      <dd className="truncate">{user.email}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Your QR Code</CardTitle>
                  <CardDescription>
                    Present this QR code to your teacher for event attendance scanning.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-lg mb-4 shadow-md">
                    <QRCodeSVG
                      id="qr-code-svg"
                      value={user.qrCode}
                      size={256}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <Button variant="outline" onClick={downloadQR}>
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Teachers can scan this QR code to mark your attendance for events
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="attendance">
              <TabsList className="mb-4">
                <TabsTrigger value="attendance">Attendance History</TabsTrigger>
                <TabsTrigger value="registrations">My Registrations</TabsTrigger>
                <TabsTrigger value="certificates">Certificates</TabsTrigger>
                <TabsTrigger value="events">Browse Events</TabsTrigger>
              </TabsList>

              <TabsContent value="attendance">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Attendance Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {user.attendance && user.attendance.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {user.attendance.map((record, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {format(
                                  toZonedTime(new Date(record.date), "Asia/Kolkata"),
                                  "PPP"
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                  Present
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No attendance records found.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="registrations">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Ticket className="h-5 w-5 mr-2" />
                      Event Registrations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingRegistrations ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : registrations.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Event</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Payment Status</TableHead>
                            <TableHead>Attendance</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {registrations.map((reg: any) => {
                            const event = reg.eventId || {};
                            // Check if certificate exists for this event
                            const hasCertificate = certificates.some((cert: any) => 
                              cert.eventId === event._id?.toString() || 
                              cert.eventId === event.id?.toString()
                            );
                            return (
                              <TableRow key={reg._id}>
                                <TableCell className="font-medium">{event.eventName || 'N/A'}</TableCell>
                                <TableCell>
                                  {event.eventDate ? format(new Date(event.eventDate), 'PPP') : 'N/A'}
                                </TableCell>
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
                                    {reg.attendance ? 'Attended' : 'Not Attended'}
                                  </Badge>
                                  {hasCertificate && (
                                    <Badge variant="default" className="ml-2">
                                      <Award className="h-3 w-3 mr-1" />
                                      Certificate Issued
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    {event.whatsappGroupLink && (
                                      <a
                                        href={event.whatsappGroupLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                      >
                                        Join Group <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                    {user?.qrCode && !reg.attendance && (
                                      <div className="text-xs text-muted-foreground">
                                        <p>Show your QR code to teacher</p>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No registrations found. Browse events to register!
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="certificates">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Award className="h-5 w-5 mr-2" />
                      My Certificates
                    </CardTitle>
                    <CardDescription>
                      {certificates.length > 0 ? `${certificates.length} certificate(s) available` : 'No certificates yet'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingRegistrations ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : certificates.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        {certificates.map((cert: any, index: number) => (
                          <Card key={index}>
                            <CardHeader>
                              <CardTitle className="text-lg">{cert.eventName || 'Unnamed Event'}</CardTitle>
                              <CardDescription>
                                Issued: {cert.issuedAt ? format(new Date(cert.issuedAt), 'PPP') : 'Date not available'}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              {cert.certificateUrl ? (
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => {
                                    // Handle both relative and absolute URLs
                                    const url = cert.certificateUrl.startsWith('http') 
                                      ? cert.certificateUrl 
                                      : `${window.location.origin}${cert.certificateUrl}`;
                                    window.open(url, '_blank');
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Certificate
                                </Button>
                              ) : (
                                <p className="text-sm text-muted-foreground">Certificate URL not available</p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No certificates available yet.</p>
                        <p className="text-sm mt-2">Certificates are issued by teachers after event completion.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="events">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Events</CardTitle>
                    <CardDescription>Register for upcoming events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingRegistrations ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : availableEvents.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        {availableEvents.map((event: any) => {
                          const isRegistered = registrations.some(
                            (reg: any) => reg.eventId?._id === event._id || reg.eventId?.toString() === event._id?.toString()
                          );
                          return (
                            <Card key={event._id}>
                              <CardHeader>
                                <CardTitle className="text-lg">{event.eventName}</CardTitle>
                                <CardDescription>{event.motive}</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                <p className="text-sm">
                                  <Calendar className="h-4 w-4 inline mr-1" />
                                  {format(new Date(event.eventDate), 'PPP')}
                                </p>
                                {event.centerId && (
                                  <p className="text-sm text-muted-foreground">📍 {event.centerId}</p>
                                )}
                                <p className="text-sm font-semibold">
                                  {event.feeAmount ? `₹${event.feeAmount}` : 'Free'}
                                </p>
                                {isRegistered ? (
                                  <Badge variant="default">Already Registered</Badge>
                                ) : (
                                  <Link href={`/events/${event._id}/register`}>
                                    <Button className="w-full" size="sm">
                                      Register Now
                                    </Button>
                                  </Link>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No events available at the moment.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Event Management System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p>Loading dashboard...</p>}>
      <DashboardPageContent />
    </Suspense>
  );
}