import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const PRICE_LOOKUP: Record<string, Record<string, string | undefined>> = {
  monthly: {
    starter: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    basic: process.env.STRIPE_PRICE_BASIC_MONTHLY,
    business: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    growth: process.env.STRIPE_PRICE_GROWTH_MONTHLY,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  },
  yearly: {
    starter: process.env.STRIPE_PRICE_STARTER_YEARLY,
    basic: process.env.STRIPE_PRICE_BASIC_YEARLY,
    business: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
    growth: process.env.STRIPE_PRICE_GROWTH_YEARLY,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
  },
};

type CheckoutRequestBody = {
  plan: string;
  cadence: "monthly" | "yearly";
};

export async function POST(request: NextRequest) {
  let body: CheckoutRequestBody;

  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { plan, cadence } = body;

  if (!plan || !cadence) {
    return NextResponse.json({ error: "Missing plan or cadence." }, { status: 400 });
  }

  const normalizedPlan = plan.toLowerCase();

  const priceId = PRICE_LOOKUP[cadence]?.[normalizedPlan];

  if (!priceId) {
    return NextResponse.json({ error: "Selected plan is not available for Stripe checkout." }, { status: 400 });
  }

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${origin}/pricing?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      metadata: {
        plan,
        cadence,
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Unable to create checkout session." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Failed to create Stripe checkout session:", error);
    return NextResponse.json({ error: "Stripe checkout failed." }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
