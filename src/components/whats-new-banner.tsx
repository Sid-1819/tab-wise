import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { changelogUrl, type PendingWhatsNew } from '@/lib/release-landing';

interface WhatsNewBannerProps {
  pending: PendingWhatsNew;
  onOpen: () => void;
  onDismiss: () => void;
}

export function WhatsNewBanner({ pending, onOpen, onDismiss }: WhatsNewBannerProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm">
      <a
        href={changelogUrl(pending.from, pending.to)}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 truncate underline-offset-2 hover:underline"
        onClick={onOpen}
      >
        What’s new in {pending.to}
      </a>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        onClick={onDismiss}
        title="Dismiss"
        aria-label="Dismiss what’s new"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
