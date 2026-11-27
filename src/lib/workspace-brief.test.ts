import { describe, expect, it } from 'vitest';
import { buildBrief } from './workspace-brief';
import { addNote, addResources, createWorkspace, updateContext } from './workspace-model';

const NOW = new Date(2026, 10, 9, 12).getTime();
const ok = (u: string) => u.startsWith('http');

describe('buildBrief', () => {
  it('includes only what exists and is valid markdown-ish', () => {
    let ws = createWorkspace('Billing [API]', NOW - 1000);
    ws = updateContext(ws, { nextAction: 'Fix retry', blockers: 'API key' }, NOW);
    ws = addResources(ws, [{ url: 'https://stripe.com/docs(x)', title: 'Docs [v2]' }, { url: 'javascript:alert(1)' }], (u) => ok(u) || u.startsWith('javascript'), NOW).workspace;
    ws = addNote(ws, 'Decision: use queue\nsecond line', NOW);
    const md = buildBrief(ws, NOW);
    expect(md).toContain('# Billing \\[API\\]');
    expect(md).toContain('**Next action:** Fix retry');
    expect(md).toContain('**Blocked by:** API key');
    expect(md).not.toContain('Focus:');
    expect(md).toContain('[Docs \\[v2\\]](https://stripe.com/docs%28x%29)');
    expect(md).not.toContain('javascript:');
    expect(md).toContain('- Decision: use queue\n  second line');
    expect(md).toContain('## Recent activity');
    expect(md).toContain('2026-11-09');
  });

  it('omits empty sections and caps long lists', () => {
    let ws = createWorkspace('Tiny', NOW);
    expect(buildBrief(ws, NOW)).not.toContain('## ');
    ws = addResources(ws, Array.from({ length: 20 }, (_, i) => ({ url: `https://a.com/${i}` })), ok, NOW).workspace;
    const md = buildBrief(ws, NOW);
    expect(md.match(/^- \[/gm)?.length).toBe(15);
    expect(md).toContain('…and 5 more');
  });
});
