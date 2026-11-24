import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { backupFileName, buildBackup, mergeWorkspaces, parseBackup } from '@/lib/backup';
import {
  clearActivityLog,
  clearLeaveState,
  formatBytes,
  summarize,
  type StorageSummary,
} from '@/lib/data-controls';
import { DEFAULT_SETTINGS, getSettings, updateSettings, watchSettings, type Settings } from '@/lib/settings';
import { addMissingWorkspaces, deleteWorkspace, getWorkspaces, upsertWorkspace } from '@/lib/workspace-storage';
import type { Workspace } from '@/types/workspace';

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : 'Unknown error';
}

async function countRemembered(): Promise<number> {
  const r = await chrome.storage.local.get(['windowCache']);
  const cache = r.windowCache;
  return cache && typeof cache === 'object' ? Object.keys(cache).length : 0;
}

/** Everything the user controls about their data, in one place. */
export function PrivacyDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [bytes, setBytes] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    () =>
      Promise.all([getWorkspaces(), countRemembered(), chrome.storage.local.getBytesInUse(null)]).then(
        ([list, remembered, used]) => ({ summary: summarize(list, remembered), used }),
      ),
    [],
  );
  const refresh = useCallback(() => {
    void load().then((r) => {
      setSummary(r.summary);
      setBytes(r.used);
    });
  }, [load]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const stop = watchSettings(setSettings);
    void load().then((r) => {
      if (cancelled) return;
      setSummary(r.summary);
      setBytes(r.used);
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, load]);

  const toggle = async (patch: Partial<Settings>) => {
    try {
      setSettings(await updateSettings(patch));
    } catch (e) {
      toast({ title: 'Could not save setting', description: errMsg(e), variant: 'destructive' });
    }
  };

  const exportBackup = async () => {
    try {
      const [list, s] = await Promise.all([getWorkspaces(), getSettings()]);
      const blob = new Blob([JSON.stringify(buildBackup(list, s), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: 'Backup downloaded', description: `${list.length} workspace${list.length === 1 ? '' : 's'} saved to a file on your computer.` });
    } catch (e) {
      toast({ title: 'Could not export', description: errMsg(e), variant: 'destructive' });
    }
  };

  const importBackup = async (file: File) => {
    try {
      const parsed = parseBackup(await file.text());
      if (!parsed.ok) {
        toast({ title: 'Could not import', description: parsed.error, variant: 'destructive' });
        return;
      }
      const existing = await getWorkspaces();
      const result = mergeWorkspaces(existing, parsed.workspaces);
      // Upsert changed ones, add the rest; nothing existing is removed.
      const changed = result.merged.filter((w) => {
        const had = existing.find((e) => e.id === w.id);
        return had && had !== w && w.updatedAt > had.updatedAt;
      });
      for (const w of changed) await upsertWorkspace(w);
      await addMissingWorkspaces(result.merged);
      toast({
        title: 'Backup imported',
        description: `${result.added} added, ${result.updated} updated, ${result.unchanged} already up to date.`,
      });
      refresh();
    } catch (e) {
      toast({ title: 'Could not import', description: errMsg(e), variant: 'destructive' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const rewriteAll = async (fn: (w: Workspace) => Workspace, done: string) => {
    try {
      for (const w of await getWorkspaces()) {
        const next = fn(w);
        if (next !== w) await upsertWorkspace(next);
      }
      toast({ title: done });
      refresh();
    } catch (e) {
      toast({ title: 'Could not clear', description: errMsg(e), variant: 'destructive' });
    }
  };

  const forgetWindows = async () => {
    await chrome.storage.local.remove('windowCache');
    await rewriteAll(clearLeaveState, 'Forgot where your windows were left');
  };

  const deleteAll = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      for (const w of await getWorkspaces()) await deleteWorkspace(w.id);
      setConfirmDelete(false);
      toast({ title: 'All workspaces deleted' });
      refresh();
    } catch (e) {
      toast({ title: 'Could not delete', description: errMsg(e), variant: 'destructive' });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirmDelete(false);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          aria-label="Privacy and data"
          title="Privacy and data"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] gap-2 p-3">
        <DialogHeader className="pr-6">
          <DialogTitle className="text-sm">Privacy &amp; data</DialogTitle>
          <DialogDescription className="text-xs">
            Everything stays in this browser. TabWise never uploads your tabs, titles or notes.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="flex flex-col gap-3 pr-2 text-xs">
            <section className="flex flex-col gap-2">
              <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Controls</h3>
              <label className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-medium">Remember where I left off</span>
                  <span className="block text-muted-foreground">
                    Notes which tabs were open when a window closes, and suggests projects from open tabs. Uses
                    titles and addresses only, never page content.
                  </span>
                </span>
                <Switch
                  checked={settings.autoCapture}
                  onCheckedChange={(v) => void toggle({ autoCapture: v })}
                  aria-label="Remember where I left off"
                />
              </label>
              <label className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-medium">Let the TabWise website see my workspaces</span>
                  <span className="block text-muted-foreground">
                    Only tabwise.visionly.dev can ask, and only while you have it open. Your browser shows the
                    data on the page; TabWise doesn’t send it anywhere.
                  </span>
                </span>
                <Switch
                  checked={settings.websiteAccess}
                  onCheckedChange={(v) => void toggle({ websiteAccess: v })}
                  aria-label="Let the TabWise website see my workspaces"
                />
              </label>
            </section>

            <section className="flex flex-col gap-1" data-testid="stores">
              <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                What TabWise stores on this device
              </h3>
              {summary ? (
                <ul className="flex flex-col gap-0.5 text-muted-foreground" data-testid="stores-list">
                  <li>
                    {summary.workspaces} workspace{summary.workspaces === 1 ? '' : 's'} ({summary.archived} archived)
                  </li>
                  <li>
                    {summary.pages} saved page{summary.pages === 1 ? '' : 's'} (title + address) and {summary.notes}{' '}
                    note{summary.notes === 1 ? '' : 's'} you wrote
                  </li>
                  <li>{summary.activityEvents} activity entries (what you saved, left, resumed)</li>
                  <li>
                    {summary.rememberedWindows} open window{summary.rememberedWindows === 1 ? '' : 's'} remembered
                    right now
                  </li>
                  {bytes != null ? <li>{formatBytes(bytes)} used in total</li> : null}
                </ul>
              ) : (
                <p className="text-muted-foreground">Loading…</p>
              )}
            </section>

            <section className="flex flex-col gap-1.5">
              <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Backup</h3>
              <p className="text-muted-foreground">
                A plain file on your computer. Importing merges: it adds what’s missing and never deletes anything.
              </p>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 flex-1 text-[11px]" onClick={() => void exportBackup()}>
                  <Download className="mr-1 h-3 w-3" /> Export backup
                </Button>
                <Button size="sm" variant="outline" className="h-7 flex-1 text-[11px]" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1 h-3 w-3" /> Import backup
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  aria-label="Import backup file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importBackup(f);
                  }}
                />
              </div>
            </section>

            <section className="flex flex-col gap-1.5">
              <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Forget</h3>
              <Button size="sm" variant="outline" className="h-7 justify-start text-[11px]" onClick={() => void rewriteAll(clearActivityLog, 'Activity history cleared')}>
                Clear activity history
              </Button>
              <Button size="sm" variant="outline" className="h-7 justify-start text-[11px]" onClick={() => void forgetWindows()}>
                Forget where my windows were left
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 justify-start text-[11px] text-destructive"
                onClick={() => void deleteAll()}
                onBlur={() => setConfirmDelete(false)}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                {confirmDelete ? 'Click again to delete every workspace (export first!)' : 'Delete all workspaces'}
              </Button>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
