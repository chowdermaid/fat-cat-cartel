import * as React from "react";
import { cn } from "@/lib/utils";

type StepperContextValue = {
  value: number;
  setValue: (value: number) => void;
};

const StepperContext = React.createContext<StepperContextValue | null>(null);

function useStepper() {
  const context = React.useContext(StepperContext);
  if (!context) {
    throw new Error("Stepper components must be used within Stepper.");
  }
  return context;
}

function Stepper({
  value,
  defaultValue = 1,
  onValueChange,
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;
  const setValue = React.useCallback(
    (nextValue: number) => {
      if (value === undefined) setInternalValue(nextValue);
      onValueChange?.(nextValue);
    },
    [onValueChange, value],
  );

  return (
    <StepperContext.Provider value={{ value: currentValue, setValue }}>
      <div className={cn("space-y-4", className)}>{children}</div>
    </StepperContext.Provider>
  );
}

function StepperNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid gap-2 sm:grid-cols-4", className)}
      role="tablist"
      {...props}
    />
  );
}

function StepperItem({
  step,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { step: number }) {
  const { value } = useStepper();
  return (
    <div
      className={cn("group flex min-w-0 items-center gap-2", className)}
      data-state={value === step ? "active" : value > step ? "completed" : "inactive"}
      {...props}
    />
  );
}

function StepperTrigger({
  step,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { step: number }) {
  const { value, setValue } = useStepper();
  return (
    <button
      type="button"
      role="tab"
      aria-selected={value === step}
      className={cn(
        "flex min-h-14 w-full min-w-0 items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        value === step && "border-primary bg-primary/10 text-primary",
        value > step && "border-primary/40",
        className,
      )}
      onClick={() => setValue(step)}
      {...props}
    />
  );
}

function StepperIndicator({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold text-muted-foreground group-data-[state=active]:border-primary group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground group-data-[state=completed]:border-primary group-data-[state=completed]:bg-primary/15 group-data-[state=completed]:text-primary",
        className,
      )}
      {...props}
    />
  );
}

function StepperPanel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-h-80", className)} {...props} />;
}

function StepperContent({
  value,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: number }) {
  const { value: currentValue } = useStepper();
  if (currentValue !== value) return null;
  return <div className={cn("space-y-4", className)} role="tabpanel" {...props} />;
}

export {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperTrigger,
};
