import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const buttonVariants = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-500",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-300",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-slate-300",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500",
} as const;

type ButtonVariant = keyof typeof buttonVariants;

export function buttonClassName(variant: ButtonVariant = "primary", ...classNames: ClassValue[]) {
  return cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    buttonVariants[variant],
    classNames
  );
}

export function Button({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClassName("primary", className)} {...props}>
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-3xl border bg-white shadow-sm", className)}>{children}</div>;
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)}>{children}</h3>;
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-6 pt-0", className)}>{children}</div>;
}

export function LoadingState({ children, label }: { children?: React.ReactNode; label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 p-8 text-slate-600">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-b-brand-600" />
      {label ? <span>{label}</span> : null}
      {!label && children ? <span>{children}</span> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  if (title || description) {
    return (
      <div>
        {title ? <h2 className="text-lg font-semibold text-slate-950">{title}</h2> : null}
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
    );
  }

  return <h2 className="mb-4 text-xl font-semibold">{children}</h2>;
}

const statusToneColors = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-sky-100 text-sky-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
} as const;

const statusColors: Record<string, string> = {
  UPLOADED: statusToneColors.neutral,
  OCR_PENDING: statusToneColors.warning,
  OCR_RUNNING: statusToneColors.warning,
  OCR_DONE: statusToneColors.info,
  OCR_FAILED: statusToneColors.danger,
  AI_PENDING: statusToneColors.info,
  AI_RUNNING: statusToneColors.info,
  AI_DONE: statusToneColors.info,
  AI_FAILED: statusToneColors.danger,
  PENDING_REVIEW: statusToneColors.warning,
  APPROVED: statusToneColors.success,
  FILED: statusToneColors.success,
  REJECTED: statusToneColors.danger,
};

export function StatusBadge({
  status,
  tone,
  children,
}: {
  status?: string;
  tone?: keyof typeof statusToneColors;
  children?: React.ReactNode;
}) {
  const colorClass = tone
    ? statusToneColors[tone]
    : status
      ? statusColors[status] || statusToneColors.neutral
      : statusToneColors.neutral;
  const content = children ?? (status ? status.replace(/_/g, " ") : null);

  if (!content) return null;

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", colorClass)}>
      {content}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
}) {
  return (
    <Card className="card-pad border-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7.5 4.5h9A1.5 1.5 0 0118 6v12a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 18V6a1.5 1.5 0 011.5-1.5z" />
        </svg>
      </div>
      <h3 className="mt-5 text-lg font-semibold text-slate-950">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
