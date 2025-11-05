"use client"
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { User, ShieldCheck, CalendarDays } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img src="/RTU logo.png" alt="Logo" className="h-8 w-8" />
            <h1 className="text-xl font-bold">Event Management System</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-10">
        <section className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Rajasthan Technical University</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Streamline attendance tracking for placement activities with our QR code system.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/student-register">
              <Button size="lg" className="w-full sm:w-auto">Student Registration</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">Admin Access</Button>
            </Link>
          </div>
        </section>

        {/* Updated Grid to fit 3 items */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">

          {/* View All Events Card */}
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader className="flex items-center space-x-2">
              <CalendarDays className="text-primary" />
              <div>
                <CardTitle>View All Events</CardTitle>
                <CardDescription>Browse and register for upcoming events</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p>Find all scheduled events, workshops, and placement drives in one place.</p>
            </CardContent>
            <CardFooter>
              <Link href="/events" className="w-full">
                <Button className="w-full">Browse Events</Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Student Dashboard Card */}
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader className="flex items-center space-x-2">
              <User className="text-primary" />
              <div>
                <CardTitle>Student Dashboard</CardTitle>
                <CardDescription>View attendance and activity history</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p>Track your placement attendance, view history, and access your QR code.</p>
            </CardContent>
            <CardFooter>
              <Link href="/student-dashboard" className="w-full">
                <Button variant="outline" className="w-full">Student Dashboard</Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Core Team Dashboard Card (RESTORED) */}
           <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader className="flex items-center space-x-2">
              <ShieldCheck className="text-primary" />
              <div>
                <CardTitle>faculty Team Dashboard</CardTitle>
                <CardDescription>Admin tools and attendance control</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p>Access student records, track placement attendance, and manage events efficiently.</p>
            </CardContent>
            <CardFooter>
              <Link href="/admin/scanner" className="w-full">
                <Button className="w-full">Faculty Dashboard</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div>
          <Link href='/send-mail' className='flex justify-center p-2'>
          <Button className='max-w-4xl mx-auto mt-5'>
            Recruiter Invitation
          </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground flex flex-col items-center">
          <span>© {new Date().getFullYear()} Event Management System. All rights reserved.</span>
          <a className="text-sm">Developed By Placement Team</a>
        </div>
      </footer>
    </div>
  );
}