"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getEventById } from '@/app/actions/events';
import { createPaymentOrder, verifyPaymentAndRegister } from '@/app/actions/payment';
import { getStudentByEmail } from '@/app/actions/user';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Script from 'next/script';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function EventRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [studentId, setStudentId] = useState<string>('');
  const [studentEmail, setStudentEmail] = useState<string>('');
  const [lookingUpStudent, setLookingUpStudent] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventData = await getEventById(params.eventId as string);
        if (eventData) {
          setEvent(eventData);
        } else {
          toast({ variant: "destructive", title: "Error", description: "Event not found" });
          router.push('/events');
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to load event" });
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [params.eventId, router, toast]);

  const handleEmailLookup = async () => {
    if (!studentEmail.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your email" });
      return;
    }

    setLookingUpStudent(true);
    try {
      const result = await getStudentByEmail(studentEmail.trim());
      if (result.success && result.user) {
        setStudentId(result.user.id);
        toast({ title: "Success", description: "Student found! You can now register." });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error || "Student not found. Please register first." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to lookup student" });
    } finally {
      setLookingUpStudent(false);
    }
  };

  const handleRegister = async () => {
    if (!studentId) {
      toast({ variant: "destructive", title: "Error", description: "Please provide your Student ID" });
      return;
    }

    setProcessing(true);
    try {
      const result = await createPaymentOrder(event._id, studentId);
      
      if (!result.success) {
        const errorMessage = 'error' in result ? result.error : "Failed to create payment order";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setProcessing(false);
        return;
      }

      // If free event, registration is complete (result has registration property)
      if ('registration' in result) {
        toast({ title: "Success", description: "Registration successful! Check your email." });
        router.push('/student-dashboard');
        return;
      }

      // Initialize Razorpay payment (result has orderId, amount, currency, keyId)
      if (!('orderId' in result) || !result.orderId) {
        toast({ variant: "destructive", title: "Error", description: "Failed to create payment order" });
        setProcessing(false);
        return;
      }

      const options = {
        key: result.keyId,
        amount: result.amount,
        currency: result.currency,
        name: event.eventName,
        description: `Registration for ${event.eventName}`,
        order_id: result.orderId,
        handler: async function (response: any) {
          try {
            const verifyResult = await verifyPaymentAndRegister(
              result.orderId!,
              response.razorpay_payment_id,
              response.razorpay_signature,
              event._id,
              studentId
            );

            if (verifyResult.success) {
              toast({ title: "Success", description: "Payment successful! Registration confirmed." });
              router.push('/student-dashboard');
            } else {
              const errorMessage = 'error' in verifyResult ? verifyResult.error : "Payment verification failed";
              toast({ variant: "destructive", title: "Error", description: errorMessage });
            }
          } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Payment verification failed" });
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          contact: '',
          email: '',
        },
        theme: {
          color: '#2563eb',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        toast({ variant: "destructive", title: "Payment Failed", description: response.error.description });
        setProcessing(false);
      });
      razorpay.open();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to initiate payment" });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{event.eventName}</CardTitle>
              <CardDescription>{event.motive}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Event Date</Label>
                <p>{new Date(event.eventDate).toLocaleDateString()}</p>
              </div>
              {event.centerId && (
                <div>
                  <Label>Venue</Label>
                  <p>{event.centerId}</p>
                </div>
              )}
              <div>
                <Label>Registration Fee</Label>
                <p className="text-2xl font-bold">
                  {event.feeAmount ? `₹${event.feeAmount}` : 'Free'}
                </p>
              </div>
              {event.capacity && (
                <div>
                  <Label>Capacity</Label>
                  <p>{event.capacity} participants</p>
                </div>
              )}
              {!studentId ? (
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <p className="text-sm text-muted-foreground">
                    Enter your registered email to lookup your account
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailLookup()}
                    />
                    <Button
                      onClick={handleEmailLookup}
                      disabled={lookingUpStudent || !studentEmail.trim()}
                    >
                      {lookingUpStudent ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Lookup'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Not registered? <Link href="/student-register" className="text-blue-600 hover:underline">Register here</Link>
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                    <p className="text-sm text-green-800">
                      ✓ Student account found. Ready to register!
                    </p>
                  </div>
                  <Button
                    onClick={handleRegister}
                    disabled={processing || !studentId}
                    className="w-full"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      event.feeAmount ? `Pay ₹${event.feeAmount} & Register` : 'Register for Free'
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

