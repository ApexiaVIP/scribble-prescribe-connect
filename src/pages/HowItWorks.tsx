import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Search, CalendarCheck, ShieldCheck, PoundSterling,
  ArrowRight, Building2, Stethoscope, CheckCircle2,
  Clock, FileCheck, Users, Lock, HandCoins, ClipboardCheck
} from 'lucide-react';

export default function HowItWorks() {
  return (
    <Layout>
      {/* Hero */}
      <section className="gradient-hero py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <Badge variant="outline" className="mb-4">How It Works</Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            Transparent. Secure. Simple.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Scribify connects businesses with verified prescribers, holds funds securely, 
            and only releases payment once work is completed and signed off.
          </p>
        </div>
      </section>

      {/* For Businesses */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <Badge>For Businesses</Badge>
              <h2 className="text-2xl md:text-3xl font-bold mt-1">Hiring a Prescriber</h2>
            </div>
          </div>

          <div className="space-y-8">
            {[
              {
                step: '01',
                icon: Search,
                title: 'Browse & Search',
                description: 'Search verified prescribers by type (GP, pharmacist, nurse prescriber, dentist), location, availability, and sector. View rates and availability before registering.',
              },
              {
                step: '02',
                icon: Users,
                title: 'Register as a Business',
                description: 'Create a free business account to unlock full prescriber profiles including names, bios, and specialisations. No subscription fees or upfront costs.',
              },
              {
                step: '03',
                icon: CalendarCheck,
                title: 'Book & Pay Upfront',
                description: 'Select a prescriber, choose dates, and pay upfront through Scribify. Your payment is held securely in escrow — we act as a trusted intermediary between you and the prescriber.',
              },
              {
                step: '04',
                icon: ClipboardCheck,
                title: 'Timesheet Sign-Off',
                description: 'Once the work is completed, both you and the prescriber submit timesheets. You review and sign off the hours worked. Funds are only released to the prescriber after your approval.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <item.icon className="h-5 w-5 text-primary" />
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* For Prescribers */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <Badge variant="secondary">For Prescribers</Badge>
              <h2 className="text-2xl md:text-3xl font-bold mt-1">Joining as a Prescriber</h2>
            </div>
          </div>

          <div className="space-y-8">
            {[
              {
                step: '01',
                icon: ShieldCheck,
                title: 'Verify Your Registration',
                description: 'Sign up and verify your GMC, GPhC, or NMC registration number. We check it against the official register automatically.',
              },
              {
                step: '02',
                icon: FileCheck,
                title: 'Verify Your Identity',
                description: 'Upload a UK photo ID (passport, driving licence). Our AI-powered system verifies it instantly for security and trust.',
              },
              {
                step: '03',
                icon: Clock,
                title: 'Set Your Rates & Availability',
                description: 'Choose your hourly and daily rates, set your availability, and specify the regions and sectors you cover.',
              },
              {
                step: '04',
                icon: HandCoins,
                title: 'Get Paid Securely',
                description: 'When a business books you, their payment is held in escrow by Scribify. Once you complete the work and timesheets are signed off, the funds are released to you promptly.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <item.icon className="h-5 w-5 text-secondary" />
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Pricing & Fees */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Fees</h2>
            <p className="text-lg text-muted-foreground">
              No subscription. No hidden costs. You only pay when you book.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Business Fees */}
            <Card className="border-0 shadow-xl">
              <div className="h-1.5 gradient-primary" />
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle>For Businesses</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-primary/5 rounded-xl p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Platform fee per booking</p>
                  <p className="text-5xl font-extrabold text-primary">2%</p>
                  <p className="text-sm text-muted-foreground mt-1">of the prescriber's daily charge</p>
                </div>
                <ul className="space-y-3">
                  {[
                    'Free to register and browse',
                    'No subscription or monthly fees',
                    'Fee calculated on each booking',
                    'Funds held in escrow until sign-off',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Example</p>
                  <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prescriber daily rate</span>
                      <span className="font-medium">£500.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scribify fee (2%)</span>
                      <span className="font-medium">£10.00</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total you pay</span>
                      <span>£510.00</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prescriber Fees */}
            <Card className="border-0 shadow-xl">
              <div className="h-1.5 bg-secondary" />
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-secondary" />
                  <CardTitle>For Prescribers</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-secondary/5 rounded-xl p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Cost to join</p>
                  <p className="text-5xl font-extrabold text-secondary">Free</p>
                  <p className="text-sm text-muted-foreground mt-1">No fees deducted from your earnings</p>
                </div>
                <ul className="space-y-3">
                  {[
                    'Free registration and verification',
                    'Set your own hourly and daily rates',
                    'Keep 100% of your agreed rate',
                    'Payment protected via escrow',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Example</p>
                  <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Your daily rate</span>
                      <span className="font-medium">£500.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scribify deduction</span>
                      <span className="font-medium">£0.00</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>You receive</span>
                      <span>£500.00</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Escrow Explainer */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-4">
              <Lock className="h-3 w-3 mr-1" /> Payment Security
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How Escrow Works</h2>
            <p className="text-muted-foreground">
              We hold funds as a security blanket for both parties — ensuring prescribers get paid 
              and businesses only pay for completed, verified work.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
            {[
              {
                icon: PoundSterling,
                title: 'Business pays upfront',
                description: 'When a booking is confirmed, the full amount (prescriber rate + 2% Scribify fee) is charged. Funds are held securely by Scribify.',
              },
              {
                icon: Stethoscope,
                title: 'Prescriber completes the work',
                description: 'The prescriber carries out the agreed work at the business premises during the booked dates.',
              },
              {
                icon: ClipboardCheck,
                title: 'Both parties submit timesheets',
                description: 'The prescriber logs their hours. The business reviews and signs off the timesheet to confirm the work was completed.',
              },
              {
                icon: HandCoins,
                title: 'Funds released to prescriber',
                description: 'Once the business approves the timesheet, Scribify releases the prescriber\'s full rate. No deductions from the prescriber.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 mb-8 last:mb-0 relative">
                <div className="w-12 h-12 rounded-full bg-background border-2 border-primary flex items-center justify-center shrink-0 z-10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="pt-2">
                  <h3 className="font-bold mb-1">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8">
            Join Scribify today — free for prescribers, and only 2% per booking for businesses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="gradient-primary border-0">
              <Link to="/auth?mode=signup">
                Sign Up Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/browse">Browse Prescribers</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
