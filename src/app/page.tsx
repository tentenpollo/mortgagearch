import Link from "next/link";
import { FileText, Shield, Upload, Clock, ArrowRight } from "lucide-react";

const features = [
  {
    icon: <Upload className="h-6 w-6" />,
    title: "Secure Upload Links",
    description:
      "Generate tokenized links for borrowers to upload documents directly — no accounts needed.",
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: "Document Management",
    description:
      "Review, approve, or reject uploaded documents with full audit trail visibility.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Broker-First Security",
    description:
      "All documents are scoped per broker. Session-based auth with enterprise-grade infrastructure.",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Complete Audit Log",
    description:
      "Every action is tracked — uploads, reviews, approvals — with timestamps and actor info.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-950 via-brand-900 to-slate-900">
      {/* Nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 ring-1 ring-brand-400/30">
            <FileText className="h-5 w-5 text-brand-300" />
          </div>
          <span className="text-lg font-bold text-white">MortgageArch</span>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur-sm transition-all hover:bg-white/20 hover:ring-white/30"
        >
          Broker Login
          <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-sm text-brand-300 ring-1 ring-brand-400/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Production-ready document intake
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            Mortgage document intake,{" "}
            <span className="bg-gradient-to-r from-brand-400 to-indigo-300 bg-clip-text text-transparent">
              simplified
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-300 text-balance">
            MortgageArch gives brokers a secure, streamlined way to collect
            borrower documents, review submissions, and track every action with
            a full audit trail.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-glow transition-all hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-500/25"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-brand-400/30 hover:bg-white/10"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300 ring-1 ring-brand-400/20 transition-colors group-hover:bg-brand-500/30 group-hover:text-brand-200">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <p className="text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} MortgageArch. Built for modern
          mortgage brokers.
        </p>
      </footer>
    </div>
  );
}
