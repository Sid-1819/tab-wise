import { useEffect, useState } from 'react';
import { Target, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentTime } from '@/hooks/use-current-time';
import {
  MAX_GOAL_LENGTH,
  TIMER_PRESETS,
  blockedLabel,
  formatRemaining,
  isExpired,
  remainingMs,
  type FocusSession,
} from '@/lib/focus-mode';
import { endFocus, startFocus } from '@/lib/focus-session';
import { cn } from '@/lib/utils';

interface Props {
  /** The running session, if any. */
  session: FocusSession | null;
  /** Show the setup form. */
  setupOpen: boolean;
  onSetupClose: () => void;
  /** The window this panel belongs to. */
  windowId: number | null;
  tabCount: number;
}

const labelClass = 'text-[10px] font-medium uppercase tracking-wide text-muted-foreground';

/** Start or watch a focus session. Renders nothing when idle and not setting up. */
export function FocusCard({ session, setupOpen, onSetupClose, windowId, tabCount }: Props) {
  if (session) return <ActiveFocus session={session} windowId={windowId} />;
  if (setupOpen) return <FocusSetup onClose={onSetupClose} windowId={windowId} tabCount={tabCount} />;
  return null;
}

function FocusSetup({
  onClose,
  windowId,
  tabCount,
}: {
  onClose: () => void;
  windowId: number | null;
  tabCount: number;
}) {
  const { toast } = useToast();
  const [goal, setGoal] = useState('');
  const [minutes, setMinutes] = useState<number | null>(25);
  const [stayOnSites, setStayOnSites] = useState(false);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    if (windowId == null) return;
    setStarting(true);
    try {
      await startFocus({ windowId, minutes, goal, stayOnSites });
      onClose();
    } catch (e) {
      toast({ title: 'Could not start focus', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  return (
    <section className="mb-2 min-w-0 shrink-0 rounded-md border border-primary/30 bg-primary/5 p-2.5" data-testid="focus-setup">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <Target className="h-3 w-3" /> Start focus mode
        </p>
        <button type="button" aria-label="Cancel" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        New tabs and windows are closed until you end focus. Your {tabCount} open {tabCount === 1 ? 'tab stays' : 'tabs stay'} as they are.
      </p>

      <label className="mt-2 block">
        <span className={labelClass}>Goal (optional)</span>
        <Input
          value={goal}
          maxLength={MAX_GOAL_LENGTH}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !starting && void start()}
          placeholder="What are you finishing?"
          className="mt-0.5 h-7 px-1.5 text-xs"
        />
      </label>

      <div className="mt-2">
        <span className={labelClass}>Timer</span>
        <div role="radiogroup" aria-label="Timer" className="mt-0.5 grid grid-cols-4 gap-1">
          {TIMER_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              role="radio"
              aria-checked={minutes === p.minutes}
              onClick={() => setMinutes(p.minutes)}
              className={cn(
                'h-7 rounded-md border px-1 text-[11px] transition-colors',
                minutes === p.minutes ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:bg-accent',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-start justify-between gap-3">
        <label htmlFor="focus-stay" className="min-w-0 cursor-pointer">
          <span className="block text-xs font-medium">Stay on these sites</span>
          <span className="block text-[11px] leading-snug text-muted-foreground">
            Tabs can't navigate away from the sites they're on now. This can interrupt sign-in redirects.
          </span>
        </label>
        <Switch id="focus-stay" checked={stayOnSites} onCheckedChange={setStayOnSites} className="mt-0.5 h-5 w-9" />
      </div>

      <Button size="sm" className="mt-2.5 h-7 w-full text-[11px]" disabled={starting || windowId == null} onClick={() => void start()}>
        Start focus
      </Button>
    </section>
  );
}

function ActiveFocus({ session, windowId }: { session: FocusSession; windowId: number | null }) {
  // Tick every second while a timer is running so the countdown moves.
  const now = useCurrentTime(1000);
  const left = remainingMs(session, now);
  const otherWindow = windowId != null && windowId !== session.windowId;

  // If the alarm was missed (the worker slept through it), end the session here.
  useEffect(() => {
    if (isExpired(session, now)) void endFocus();
  }, [session, now]);

  return (
    <section className="mb-2 min-w-0 shrink-0 rounded-md border border-primary/40 bg-primary/10 p-2.5" data-testid="focus-active" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <Target className="h-3 w-3" /> Focus mode
        </p>
        <span className="text-sm font-semibold tabular-nums">{left === null ? 'On' : formatRemaining(left)}</span>
      </div>
      {session.goal ? <p className="mt-1 break-words text-xs font-medium">{session.goal}</p> : null}
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {blockedLabel(session.blocked)}
        {otherWindow ? ' · running in another window' : ''}
      </p>
      {session.stayOnSites && session.allowedHosts.length > 0 ? (
        <p className="mt-0.5 break-words text-[11px] text-muted-foreground">Staying on {session.allowedHosts.join(', ')}</p>
      ) : null}
      <Button size="sm" variant="outline" className="mt-2 h-7 w-full text-[11px]" onClick={() => void endFocus()}>
        End focus
      </Button>
    </section>
  );
}
