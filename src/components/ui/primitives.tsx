import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const buttonClassName =
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2";

export function Button({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(buttonClassName, className)} {...props}>
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border bg-white shadow-sm", className)}>
      {children}
    </div>
  );
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

export function LoadingState({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      {children && <span className="ml-3">{children}</span>}
    </div>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold">{title}</h1>
      {description && <p className="text-gray-600 mt-1">{description}</p>}
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold mb-4">{children}</h2>;
}

const statusColors: Record<string, string> = {
  UPLOADED: "bg-gray-100 text-gray-800",
  OCR_PENDING: "bg-yellow-100 text-yellow-800",
  OCR_RUNNING: "bg-yellow-100 text-yellow-800",
  OCR_DONE: "bg-blue-100 text-blue-800",
  OCR_FAILED: "bg-red-100 text-red-800",
  AI_PENDING: "bg-purple-100 text-purple-800",
  AI_RUNNING: "bg-purple-100 text-purple-800",
  AI_DONE: "bg-indigo-100 text-indigo-800",
  AI_FAILED: "bg-red-100 text-red-800",
  PENDING_REVIEW: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  FILED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  const colorClass = statusColors[status] || "bg-gray-100 text-gray-800";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", colorClass)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
