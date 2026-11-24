import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TOUR_STEPS, markTourSeen, readTourSeen } from '@/lib/tour';
import { cn } from '@/lib/utils';

/** Three short steps explaining Workspaces, shown once. Always dismissible. */
export function TourCard() {
  const [seen, setSeen] = useState(true); // hidden until we know
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void readTourSeen().then((s) => !cancelled && setSeen(s));
    return () => {
      cancelled = true;
    };
  }, []);

  if (seen) return null;
  const last = step === TOUR_STEPS.length - 1;
  const current = TOUR_STEPS[step];
  const finish = () => {
    setSeen(true);
    void markTourSeen();
  };

  return (
    <section
      className="mb-2 shrink-0 rounded-md border border-primary/30 bg-primary/5 p-2"
      aria-label="What's new in Tab Wise 3.0"
      data-testid="tour"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3 w-3" /> New in 3.0 · {step + 1} of {TOUR_STEPS.length}
        </p>
        <button
          type="button"
          aria-label="Skip the tour"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={finish}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 text-xs font-medium">{current.title}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{current.body}</p>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-1" aria-hidden>
          {TOUR_STEPS.map((_, i) => (
            <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i === step ? 'bg-primary' : 'bg-muted-foreground/30')} />
          ))}
        </div>
        <div className="flex gap-1">
          {step > 0 ? (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : null}
          <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => (last ? finish() : setStep(step + 1))}>
            {last ? 'Got it' : 'Next'}
          </Button>
        </div>
      </div>
    </section>
  );
}
