"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight, Package, Calendar, MapPin } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <div className="container mx-auto px-6 py-20 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-8 animate-in zoom-in duration-500">
        <CheckCircle2 size={48} strokeWidth={1.5} />
      </div>

      <h1 className="text-4xl md:text-5xl font-light mb-4 text-center tracking-tight">Order placed successfully!</h1>
      <p className="text-muted-foreground text-lg font-light mb-12 text-center max-w-md">
        Thank you for shopping with Aeris. Order <span className="font-medium text-foreground">#ORD-99234</span> is being processed.
      </p>

      <div className="w-full max-w-xl bg-secondary/30 rounded-[2.5rem] p-8 md:p-10 border border-border/50 mb-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0 border border-border">
            <Calendar size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Estimated delivery</p>
            <p className="text-sm font-medium">May 10, 2026</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0 border border-border">
            <Package size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Delivery method</p>
            <p className="text-sm font-medium">Express delivery (1-2 days)</p>
          </div>
        </div>

        <div className="flex gap-4 md:col-span-2">
          <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0 border border-border">
            <MapPin size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Shipping address</p>
            <p className="text-sm font-medium">234 Market Street, Hanoi</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Link 
          href="/profile" 
          className="flex-1 h-14 rounded-full border border-border flex items-center justify-center text-sm font-medium hover:bg-secondary transition-colors"
        >
          Track order
        </Link>
        <Link 
          href="/" 
          className="flex-1 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium hover:opacity-90 transition-opacity gap-2 group"
        >
          Continue shopping
          <ArrowRight size={18} strokeWidth={1.5} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
