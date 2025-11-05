// File: app/events/[eventId]/page.tsx

"use client";

import { generatePosterAction } from '@/app/actions/generation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
// ✅ 1. Import `use` from React
import { useEffect, useState, use } from 'react';
import { toast } from 'sonner';

type EventType = {
  _id: string;
  eventName: string;
};

// ✅ 2. Update the type definition for params
export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  // ✅ 3. Unwrap the params promise with the `use()` hook
  const { eventId } = use(params);

  const [event, setEvent] = useState<EventType | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const createAndSetPoster = async () => {
      setLoading(true);
      try {
        // ✅ 4. Use the unwrapped `eventId` variable here
        const result = await generatePosterAction(eventId);
        if (result.success && result.posterUrl && result.event) {
          setPosterUrl(result.posterUrl);
          setEvent(result.event);
        } else {
          toast.error(result.error || "Failed to generate poster.");
        }
      } catch (error) {
        console.error("Failed to generate poster:", error);
        toast.error("An error occurred while creating the poster.");
      } finally {
        setLoading(false);
      }
    };
    createAndSetPoster();
    // ✅ 5. Use the unwrapped `eventId` in the dependency array
  }, [eventId]);
  
  const handleDownload = () => {
    if (!posterUrl || !event) return;

    setIsDownloading(true);
    const link = document.createElement("a");
    link.href = posterUrl;
    link.download = `${event.eventName.replace(/ /g, '_')}_poster.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsDownloading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-3 text-lg">Generating Your Poster...</span>
      </div>
    );
  }
  
  if (!posterUrl || !event) {
    return notFound();
  }

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white">
      {/* --- STICKY HEADER WITH ACTION BUTTONS --- */}
      <header className="sticky top-0 w-full bg-gray-900/80 backdrop-blur-md z-50 border-b border-gray-700">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 p-4">
          <Link href="/events">
            <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Events
            </Button>
          </Link>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="text-white border-white/50 hover:bg-white hover:text-gray-900 w-full"
              onClick={handleDownload} 
              disabled={isDownloading}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Poster
            </Button>
            <Link href={`/events/${event._id}/register`} className="w-full">
              <Button size="default" className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-full">
                Register for this Event
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      {/* --- MAIN POSTER DISPLAY AREA --- */}
      <main className="flex justify-center w-full p-6 sm:p-8 md:p-12">
        <div className="w-full max-w-2xl">
          <img 
            src={posterUrl} 
            alt={`${event.eventName} Poster`}
            className="w-full h-auto rounded-lg shadow-2xl border border-gray-700"
          />
        </div>
      </main>
    </div>
  );
}