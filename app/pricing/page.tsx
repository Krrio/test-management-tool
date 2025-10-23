"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowRight, Check, ChevronRight } from "lucide-react"
import { LayoutGroup, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Pricing_04 from "@/components/ui/pricing-4"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

const PLAN_DATA = {
  monthly: [
    {
      name: "Starter",
      price: "$0",
      cadence: "Free forever",
      description: "Complete solution for your personal QA workflow.",
      features: [
        {
          title: "Unlimited projects",
          description: "Spin up as many workspaces as you need with shared modules.",
        },
        {
          title: "Advanced project tracking",
          description: "Monitor coverage with detailed analytics and dashboards.",
        },
        {
          title: "Automated task management",
          description: "Streamline execution with intelligent assignments.",
        },
        {
          title: "Priority support",
          description: "Get help faster with dedicated support channels.",
        },
      ],
      cta: "Subscribe",
      buttonHref: "/sign-up",
      gradient: "from-purple-500 to-blue-500",
    },
    {
      name: "Growth",
      price: "$29",
      cadence: "per month",
      description: "Scalable collaboration for high-performing QA teams.",
      features: [
        {
          title: "Unlimited team members",
          description: "Scale without limits using shared workspaces and permissions.",
        },
        {
          title: "Analytics dashboard",
          description: "Gain deep insight with real-time reporting and trend analysis.",
        },
        {
          title: "Workflow automation",
          description: "Trigger actions with custom rules and CI integrations.",
        },
        {
          title: "Dedicated success manager",
          description: "Partner with experts for onboarding and best practices.",
        },
      ],
      cta: "Start trial",
      buttonHref: "/sign-up",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "$89",
      cadence: "per month",
      description: "Enterprise-grade security, governance and premium onboarding.",
      features: [
        {
          title: "SSO & SCIM provisioning",
          description: "Integrate identity and automate lifecycle management.",
        },
        {
          title: "Custom roles & approvals",
          description: "Control every change with tailored workflows and gates.",
        },
        {
          title: "Dedicated environment",
          description: "Deploy privately with guaranteed uptime SLAs.",
        },
        {
          title: "Guided migration",
          description: "Move legacy suites with white-glove support.",
        },
      ],
      cta: "Contact us",
      buttonHref: "/contact",
    },
  ],
  yearly: [
    {
      name: "Starter",
      price: "$0",
      cadence: "Free forever",
      description: "Complete solution for your personal QA workflow.",
      features: [
        {
          title: "Unlimited projects",
          description: "Spin up as many workspaces as you need with shared modules.",
        },
        {
          title: "Advanced project tracking",
          description: "Monitor coverage with detailed analytics and dashboards.",
        },
        {
          title: "Automated task management",
          description: "Streamline execution with intelligent assignments.",
        },
        {
          title: "Priority support",
          description: "Get help faster with dedicated support channels.",
        },
      ],
      cta: "Subscribe",
      buttonHref: "/sign-up",
      gradient: "from-purple-500 to-blue-500",
    },
    {
      name: "Growth",
      price: "$299",
      cadence: "per year",
      description: "Scalable collaboration for high-performing QA teams.",
      features: [
        {
          title: "Unlimited team members",
          description: "Scale without limits using shared workspaces and permissions.",
        },
        {
          title: "Analytics dashboard",
          description: "Gain deep insight with real-time reporting and trend analysis.",
        },
        {
          title: "Workflow automation",
          description: "Trigger actions with custom rules and CI integrations.",
        },
        {
          title: "Dedicated success manager",
          description: "Partner with experts for onboarding and best practices.",
        },
      ],
      cta: "Start trial",
      buttonHref: "/sign-up",
      highlighted: true,
      savings: "Save 16%",
    },
    {
      name: "Enterprise",
      price: "Custom",
      cadence: "Annual contract",
      description: "Enterprise-grade security, governance and premium onboarding.",
      features: [
        {
          title: "SSO & SCIM provisioning",
          description: "Integrate identity and automate lifecycle management.",
        },
        {
          title: "Custom roles & approvals",
          description: "Control every change with tailored workflows and gates.",
        },
        {
          title: "Dedicated environment",
          description: "Deploy privately with guaranteed uptime SLAs.",
        },
        {
          title: "Guided migration",
          description: "Move legacy suites with white-glove support.",
        },
      ],
      cta: "Contact us",
      buttonHref: "/contact",
    },
  ],
}

const CADENCES = [
  { key: "monthly" as const, label: "Monthly billing" },
  { key: "yearly" as const, label: "Annual billing", badge: "Save 16%" },
]

type CadenceKey = keyof typeof PLAN_DATA

export default function PricingPage() {
  const [cadence, setCadence] = useState<CadenceKey>("monthly")
  const plans = PLAN_DATA[cadence]

  return (
    <main className="relative min-h-[calc(100vh-4rem)] w-full overflow-x-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_500px_at_60%_20%,rgba(180,200,210,0.2),transparent),radial-gradient(700px_400px_at_20%_80%,rgba(160,200,255,0.12),transparent)]"></div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px] opacity-10"></div>

      {/* Main frame (full-bleed) */}
      <div className="relative z-10 min-h-[calc(100vh-4rem)] w-full bg-black">
        <div className="relative min-h-[calc(100vh-4rem)] max-w-[calc(100%-2rem)] mx-auto bg-black/80 text-white overflow-hidden rounded-[32px] shadow-xl">
          {/* In-frame light accents: top-right large soft glow + bottom-left blob */}
          <div className="pointer-events-none absolute inset-0 z-0">
            {/* top-right elliptical glow (matches reference smear) */}
            <div
              className="absolute right-[-10%] top-[-18%] h-[160%] w-[72%] blur-3xl"
              style={{
                background:
                  "radial-gradient(75% 62% at 80% 12%, rgba(255,255,255,0.92) 0%, rgba(243,248,246,0.62) 24%, rgba(206,232,218,0.32) 48%, rgba(0,0,0,0) 72%)",
              }}
            />
            {/* subtle edge reinforcement to mimic corner highlight */}
            <div
              className="absolute right-[-6%] top-[-8%] h-[120%] w-[50%] blur-[40px] opacity-45"
              style={{
                background:
                  "radial-gradient(55% 60% at 100% 0%, rgba(255,255,255,0.7), rgba(0,0,0,0) 60%)",
              }}
            />
            {/* bottom-left small blob */}
            <div
              className="absolute left-[-14%] bottom-[-16%] h-[58%] w-[52%] blur-2xl"
              style={{
                background:
                  "radial-gradient(56% 56% at 50% 50%, rgba(180,210,255,0.42), rgba(180,210,255,0.22) 42%, rgba(0,0,0,0) 70%)",
              }}
            />
          </div>
          {/* Content area */}
          <div className="w-full flex flex-col items-center justify-center max-w-7xl mx-auto">
            <div className="w-full flex flex-row items-start justify-between mt-10">
              <h2 className="text-6xl font-funky leading-16">
                We&apos;ve got a plan <br />
                that&apos;s perfect for you
              </h2>
                <div className="flex flex-row flex-wrap items-center gap-2">
                  <div className="*:data-[slot=avatar]:ring-background flex -space-x-2">
                    <Avatar className="border border-gray-200">
                      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn"/>
                      <AvatarFallback>CN</AvatarFallback>
                    </Avatar> 
                  <Avatar className="border border-gray-200">
                    <AvatarImage
                      src="https://github.com/maxleiter.png"
                      alt="@maxleiter"
                    />
                    <AvatarFallback>LR</AvatarFallback>
                  </Avatar>
                  <Avatar className="border border-gray-200">
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <Avatar className="border border-gray-200">
                    <AvatarImage
                      src="https://github.com/maxleiter.png"
                      alt="@maxleiter"
                    />
                    <AvatarFallback>LR</AvatarFallback>
                  </Avatar>
                  <Avatar className="border border-gray-200">
                    <AvatarImage
                      src="https://github.com/evilrabbit.png"
                      alt="@evilrabbit"
                    />
                    <AvatarFallback>ER</AvatarFallback>
                  </Avatar>
                </div>
                  <div className="flex flex-col items-start justify-center">
                    <div className="flex items-center gap-1 text-sm font-semibold text-white">
                      {[...Array(5)].map((_, idx) => (
                        <img key={idx} src="/star.svg" alt="star" className="h-6 w-6 invert" />
                      ))}
                      <span className="ml-2">5.0</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-white/70">
                      <span className="inline-block h-px w-12 bg-white/30" />
                      <span>from 4,000+ reviews</span>
                    </div>
                  </div>
              </div>
            </div>
            <div className="w-full flex flex-col items-start justify-between mt-10">
              <div className="w-full">
                <LayoutGroup>
                  <div className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 text-sm shadow-[0_10px_30px_rgba(15,23,42,0.18)] backdrop-blur-md font-devis">
                    {CADENCES.map((cadenceOption) => {
                      const isActive = cadence === cadenceOption.key
                      return (
                        <button
                          key={cadenceOption.key}
                          type="button"
                          onClick={() => setCadence(cadenceOption.key)}
                          className={cn(
                            "relative flex items-center gap-2 rounded-md px-4 py-2 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                            isActive ? "text-slate-900" : "text-white/70"
                          )}
                          aria-pressed={isActive}
                        >
                          {isActive ? (
                            <motion.span
                              layoutId="billingToggle"
                              className="absolute inset-0 rounded-md bg-white shadow-[0_8px_25px_rgba(15,23,42,0.28)]"
                              transition={{ type: "spring", stiffness: 420, damping: 32 }}
                            />
                          ) : null}
                          <span className="relative z-10">{cadenceOption.label}</span>
                          {cadenceOption.badge ? (
                            <span
                              className={cn(
                                "relative z-10 inline-flex items-center rounded-md px-2 py-1 text-[0.7rem] font-semibold transition-colors",
                                isActive ? "bg-black/5 text-slate-900" : "bg-white/10 text-white/80"
                              )}
                            >
                              {cadenceOption.badge}
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </LayoutGroup>  
              </div>
            <div className="w-full flex flex-col sm:flex-row items-center justify-center mt-10 max-md:space-y-4 mb-4 sm:space-x-8 font-devis">
                    <Card className="h-full w-full">
                      <CardHeader>
                        <CardTitle className="text-2xl">Basic plan</CardTitle>
                        <CardDescription className="flex flex-row items-end space-x-2">
                          <div className="flex items-end">
                            <p className="text-5xl font-bold leading-none mt-4">$10</p>
                          </div>
                          <div className="flex flex-col justify-end leading-tight text-sm">
                            <p>per user</p>
                            <p>per month</p>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">Basic features up to 10 users.</p>
                        <Button className="mt-8 w-full h-12 rounded-lg font-bold cursor-pointer">Get Started</Button>
                      </CardContent>
                      <Separator />
                      <CardFooter className="flex flex-col space-y-2 items-start justify-center">
                        <p className="uppercase font-bold tracking-tight">Features</p>
                        <p className="flex flex-col justify-end leading-tight text-sm">Everything in our free plan plus...</p>
                        <div className=" mt-2 flex flex-col space-y-2">
                          <ul className="space-y-2">
                            <li className="flex flex-row items-center justify-start">
                              <Image src="/images/verified.png" alt="check-icon" width={28} height={16} className="mr-2 mt-1 invert"/>
                              Access to basic features
                            </li>
                            <li className="flex flex-row items-center justify-start">
                              <Image src="/images/verified.png" alt="check-icon" width={28} height={16} className="mr-2 mt-1 invert"/>
                              Basic reporting and analytics
                            </li>
                            <li className="flex flex-row items-center justify-start">
                              <Image src="/images/verified.png" alt="check-icon" width={28} height={16} className="mr-2 mt-1 invert"/>
                              Up to 10 individual users
                            </li>
                            <li className="flex flex-row items-center justify-start">
                              <Image src="/images/verified.png" alt="check-icon" width={28} height={16} className="mr-2 mt-1 invert"/>
                              20GB individual data each user
                            </li>
                          </ul>
                        </div>
                      </CardFooter>
                    </Card>

                    {/* // druga karta */}

                    <Card className="h-full w-full">
                      <CardHeader>
                        <CardTitle className="text-2xl">Bussines plan</CardTitle>
                        <CardAction>
                          <Badge className="font-bold">
                            Popular
                          </Badge>
                        </CardAction>
                        <CardDescription className="flex flex-row items-end space-x-2">
                          <div className="flex items-end">
                            <p className="text-5xl font-funkty font-bold leading-none mt-4">$20</p>
                          </div>
                          <div className="flex flex-col justify-end leading-tight text-sm">
                            <p>per user</p>
                            <p>per month</p>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">Basic features up to 20 users.</p>
                        <Button className="mt-8 w-full h-12 rounded-lg font-bold cursor-pointer">Get Started</Button>
                      </CardContent>
                      <Separator />
                      <CardFooter className="flex flex-col space-y-2 items-start justify-center">
                        <p className="uppercase font-bold tracking-tight">Features</p>
                        <p className="flex flex-col justify-end leading-tight text-sm">Everything in Basic plus...</p>
                        <div className="mt-2 flex flex-col space-y-2">
                          <ul className="space-y-2">
                            <li className="flex flex-row items-center justify-start">
                              <Image src="/images/verified.png" alt="check-icon" width={28} height={16} className="mr-2 mt-1 invert"/>
                              Access to basic features
                            </li>
                            <li className="flex flex-row items-center justify-start">
                              <Image src="/images/verified.png" alt="check-icon" width={28} height={20} className="mr-2 mt-1 invert"/>
                              Basic reporting and analytics
                            </li>
                            <li className="flex flex-row items-center justify-start">
                              <Image src="/images/verified.png" alt="check-icon" width={28} height={16} className="mr-2 mt-1 invert"/>
                              Up to 10 individual users
                            </li>
                            <li className="flex flex-row items-center justify-start">
                              <Image src="/images/verified.png" alt="check-icon" width={28} height={16} className="mr-2 mt-1 invert"/>
                              20GB individual data each user
                            </li>
                          </ul>
                        </div>
                      </CardFooter>
                    </Card>

                    {/* // trzecia karta */}

                    <Card className="h-full w-full">
                      <CardHeader>
                        <CardTitle className="text-2xl">Enterprise plan</CardTitle>
                        <CardDescription className="flex flex-row items-end space-x-2">
                          <div className="flex items-end">
                            <p className="text-5xl font-bold leading-none mt-4">$40</p>
                          </div>
                          <div className="flex flex-col justify-end leading-tight text-sm">
                            <p>per user</p>
                            <p>per month</p>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">Advanced features + unlimited users.</p>
                        <Button className="mt-8 w-full rounded-lg h-12 font-bold cursor-pointer">Get Started</Button>
                      </CardContent>
                      <Separator />
                      <CardFooter className="flex flex-col space-y-2 items-start justify-center">
                        <p className="uppercase font-bold tracking-tight">Features</p>
                        <p className="flex flex-col justify-end leading-tight text-sm">Everything in Bussines plus...</p>
                        <div className=" mt-2 flex flex-col space-y-2">
                          <ul className="space-y-2">
                            <li className="flex flex-row items-center justify-start">
                              <Image src="/images/verified.png" alt="check-icon" width={28} height={16} className="mr-2 mt-1 invert"/>
                              Access to basic features
                            </li>
                            <li className="flex flex-row items-center justify-start">
                              <Image src="/images/verified.png" alt="check-icon" width={28} height={16} className="mr-2 mt-1 invert"/>
                              Basic reporting and analytics
                            </li>
                            <li className="flex flex-row items-center justify-start">
                              <Image src="/images/verified.png" alt="check-icon" width={28} height={16} className="mr-2 mt-1 invert"/>
                              Up to 10 individual users
                            </li>
                            <li className="flex flex-row items-center justify-start">
                              <Image src="/images/verified.png" alt="check-icon" width={28} height={16} className="mr-2 mt-1 invert"/>
                              20GB individual data each user
                            </li>
                          </ul>
                        </div>
                      </CardFooter>
                    </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
