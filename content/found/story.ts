import { episode1 } from "./episode1";
import { episode2 } from "./episode2";
import type { Part, Story, Thread } from "./types";

/* ===========================================================================
   Low Battery, whole: Episode 1 with every later episode laid over it.

   Each later part only adds. A thread it names that already exists gets the
   new messages appended (Mum's Monday backlog lands in Mum's thread); every
   other list is concatenated. Everything a later part adds is gated on that
   episode's flag, so the merged story plays Episode 1 exactly as before.
   =========================================================================== */

function mergeThreads(base: readonly Thread[], more: readonly Thread[] = []): Thread[] {
  const out = base.map((t) => ({ ...t, messages: [...t.messages] }));
  for (const t of more) {
    const existing = out.find((x) => x.id === t.id);
    if (existing) existing.messages.push(...t.messages);
    else out.push({ ...t, messages: [...t.messages] });
  }
  return out;
}

function layer(story: Story, part: Part): Story {
  return {
    ...story,
    threads: mergeThreads(story.threads, part.threads),
    photos: [...story.photos, ...(part.photos ?? [])],
    wifi: [...(part.wifi ?? []), ...story.wifi],
    searches: [...story.searches, ...(part.searches ?? [])],
    memos: [...story.memos, ...(part.memos ?? [])],
    devices: [...story.devices, ...(part.devices ?? [])],
    evidence: [...story.evidence, ...(part.evidence ?? [])],
    locks: [...story.locks, ...(part.locks ?? [])],
    deductions: [...story.deductions, ...(part.deductions ?? [])],
    events: [...story.events, ...(part.events ?? [])],
    replies: [...story.replies, ...(part.replies ?? [])],
    headlines: [...story.headlines, ...(part.headlines ?? [])],
    stages: [...story.stages, ...(part.stages ?? [])],
    actions: [...story.actions, ...(part.actions ?? [])],
    vault: {
      thread: { ...story.vault.thread, messages: [...story.vault.thread.messages, ...(part.vaultMessages ?? [])] },
      notes: [...story.vault.notes, ...(part.vaultNotes ?? [])],
    },
    end2: part.end2 ?? story.end2,
  };
}

export const story: Story = layer(episode1, episode2);
