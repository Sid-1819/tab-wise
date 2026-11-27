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
    <section className="mb-2 min-w-0 shrink-0 rounded-lg border bg-card p-3" data-testid="focus-setup">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-[13px] font-semibold leading-none">
          <Target className="h-3.5 w-3.5" aria-hidden /> Focus
        </h4>
        <button type="button" aria-label="Cancel" className="shrink-0 rounded text-muted-foreground hover:text-foreground" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        New tabs are blocked until you end focus. Your {tabCount} open {tabCount === 1 ? 'tab stays' : 'tabs stay'}.
      </p>

      <Input
        value={goal}
        maxLength={MAX_GOAL_LENGTH}
        onChange={(e) => setGoal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !starting && void start()}
        placeholder="What are you finishing?"
        aria-label="Goal (optional)"
        className="mt-2.5 h-8 px-2 text-xs"
      />

      <div role="radiogroup" aria-label="Timer" className="mt-2 grid grid-cols-4 gap-1">
        {TIMER_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            role="radio"
            aria-checked={minutes === p.minutes}
            onClick={() => setMinutes(p.minutes)}
            className={cn(
              'h-7 rounded-md border px-1 text-[11px] transition-colors',
              minutes === p.minutes
                ? 'border-foreground/30 bg-foreground/10 font-medium'
                : 'border-border text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-2.5">
        <label htmlFor="focus-stay" className="flex cursor-pointer items-center justify-between gap-3 text-xs">
          <span>Stay on current sites</span>
          <Switch id="focus-stay" checked={stayOnSites} onCheckedChange={setStayOnSites} />
        </label>
        {stayOnSites ? (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Tabs can't navigate to other sites. This can interrupt sign-in redirects.
          </p>
        ) : null}
      </div>

      <Button size="sm" className="mt-3 h-8 w-full text-xs" disabled={starting || windowId == null} onClick={() => void start()}>
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

  const total = session.endsAt != null ? session.endsAt - session.startedAt : null;
  const fraction = left != null && total && total > 0 ? Math.min(1, Math.max(0, left / total)) : null;
  const clock = left === null ? formatRemaining(Math.max(0, now - session.startedAt)) : formatRemaining(left);

  const details = [
    blockedLabel(session.blocked),
    session.stayOnSites && session.allowedHosts.length > 0
      ? `staying on ${session.allowedHosts.length} site${session.allowedHosts.length === 1 ? '' : 's'}`
      : null,
    otherWindow ? 'in another window' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="mb-2 min-w-0 shrink-0 overflow-hidden rounded-lg border bg-card" data-testid="focus-active" aria-live="polite">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-semibold leading-none tabular-nums">{clock}</span>
            <span className="text-[11px] text-muted-foreground">{left === null ? 'focused' : 'left'}</span>
          </div>
          <p className="mt-1.5 truncate text-xs font-medium" title={session.goal || undefined}>
            {session.goal || 'Focus mode'}
          </p>
          <p
            className="mt-0.5 truncate text-[11px] text-muted-foreground"
            title={session.stayOnSites ? session.allowedHosts.join(', ') : undefined}
          >
            {details}
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-7 shrink-0 px-3 text-xs" onClick={() => void endFocus()}>
          End
        </Button>
      </div>
      {fraction !== null ? (
        <div className="h-0.5 w-full bg-muted" aria-hidden>
          <div className="h-full bg-foreground/60 transition-[width] duration-1000 ease-linear" style={{ width: `${fraction * 100}%` }} />
        </div>
      ) : null}
    </section>
  );
}
