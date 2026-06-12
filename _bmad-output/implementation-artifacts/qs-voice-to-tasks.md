# Story QS: Voice-to-Tasks (qs-voice-to-tasks)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer using Gitty on mobile,
I want to record or upload audio and have it transcribed,
so that I can capture a stream-of-consciousness brain dump as structured tasks without having to type on a small keyboard.

## Context

This feature addresses a real friction point: typing a long list of ideas on mobile is slow and breaks the flow of thought. Voice capture is faster and more natural. The transcript is preserved as `YYYY-MM-DD-transcript.md` in the repository, so the AI agent can later process it the same way it processes `captured-ideas-{username}.md`.

**Scope (MVP):**
- Live mic recording OR audio file upload
- Transcription via OpenAI Whisper API (user-provided key)
- Transcript review screen where user can manually promote lines to tasks
- Transcript saved as `YYYY-MM-DD-{username}-transcript.md` to repo on next sync
- API key stored in settings (same AES-GCM encrypted storage as GitHub PAT)

**Out of scope for MVP:**
- Automatic task extraction via LLM (adds complexity + cost; user can do this manually or via AI agent)
- Streaming transcription
- Multiple language selection UI (Whisper auto-detects; no manual override needed)

## Acceptance Criteria

1. Given I open Settings, when I navigate to "Voice & Transcription", then I can enter and save my OpenAI API key; the key is stored encrypted (AES-GCM) and displayed masked.

2. Given no OpenAI API key is stored, when I tap the voice capture button, then I see an inline prompt: "Add your OpenAI key in Settings → Voice & Transcription to enable transcription."

3. Given an OpenAI API key is stored, when I tap the voice capture button (microphone icon in the capture area), then a `VoiceTranscriptionSheet` bottom sheet opens with two options: "Record" and "Upload audio file".

4. Given I tap "Record", when the sheet opens, then:
   - The browser `MediaRecorder` API starts recording from the microphone (permission prompt if not yet granted)
   - A live timer displays elapsed time (MM:SS)
   - A waveform visualizer or pulsing indicator shows active recording
   - A "Stop" button ends the recording

5. Given I tap "Upload audio file", when the file picker opens, then I can select a local audio file (mp3, m4a, wav, webm, ogg — up to 25 MB); if the file exceeds 25 MB the user sees a clear error message.

6. Given I have a recording or uploaded file, when transcription runs, then:
   - A loading state shows "Transcribing…" with a spinner
   - On success: the transcript text is shown in an editable textarea for review
   - On API error: a clear error message is shown (e.g., "Transcription failed: Invalid API key") with a "Try again" option

7. Given the transcript is shown for review, when I tap "Save & Add to Repo", then:
   - A new task is added to the Zustand store for this repo with title `"Voice transcript — {date}"` and the full transcript text in the body
   - A `YYYY-MM-DD-{username}-transcript.md` file is queued for next sync (stored as a `pendingTranscript` entry in the store, written to the repo as a separate file alongside `captured-ideas-{username}.md`)
   - The sheet closes, the new task appears in the list

8. Given the transcript file is queued, when the next sync runs, then `sync-service.ts` writes `YYYY-MM-DD-{username}-transcript.md` to the repo alongside the tasks file; existing transcript files are never overwritten (date uniqueness is sufficient).

9. Given the `VoiceTranscriptionSheet`, when the user swipes down or taps the backdrop, then the sheet closes; if a recording was in progress it is stopped cleanly (no dangling MediaRecorder).

10. Given `useReducedMotion()` is active, when the sheet opens/closes and the recording indicator animates, then all animations fall back to instant transitions.

## Tasks / Subtasks

- [ ] Task 1: Settings — store and display OpenAI API key (AC: #1, #2)
  - [ ] Add `openaiApiKey: string` to `SyncState` in `src/stores/useSyncStore.ts`; encrypt/decrypt via existing `StorageService` AES-GCM pattern
  - [ ] Add `setOpenaiApiKey(key: string)` action; include in `partialize`
  - [ ] Add "Voice & Transcription" section to `src/components/layout/SettingsSheet.tsx` with a masked `<input type="password">` for the key and a save button

- [ ] Task 2: Whisper transcription service (AC: #6)
  - [ ] Create `src/services/transcription/whisper-service.ts`
  - [ ] `transcribeAudio(audioBlob: Blob, apiKey: string, mimeType: string): Promise<string>` — sends `multipart/form-data` POST to `https://api.openai.com/v1/audio/transcriptions` with `model: whisper-1`
  - [ ] Maps OpenAI error codes to user-friendly messages (401 → "Invalid API key", 413 → "File too large (max 25 MB)", network error → "Transcription failed — check your connection")

- [ ] Task 3: VoiceTranscriptionSheet component (AC: #3, #4, #5, #6, #9, #10)
  - [ ] Create `src/features/capture/components/VoiceTranscriptionSheet.tsx`
  - [ ] Follow `CreateTaskSheet.tsx` as canonical bottom sheet pattern: spring animation `{ stiffness: 400, damping: 35 }`, swipe-down-to-dismiss, tap-backdrop-to-close
  - [ ] State machine: `idle → recording | file-selected → transcribing → review | error`
  - [ ] "Record" tab: uses `MediaRecorder` with `audio/webm` (or `audio/mp4` on iOS Safari); live timer with `setInterval`; pulsing `motion.div` indicator (respects `useReducedMotion`)
  - [ ] "Upload" tab: `<input type="file" accept="audio/*">` with 25 MB client-side size check
  - [ ] Review screen: editable `<textarea>` showing transcript; "Save & Add to Repo" button + "Discard" button
  - [ ] Calls `whisper-service.ts` for transcription
  - [ ] On component unmount: call `mediaRecorder.stop()` if state is `recording` to avoid dangling streams

- [ ] Task 4: Store — pendingTranscript queue + task creation (AC: #7, #8)
  - [ ] Add `pendingTranscripts: PendingTranscript[]` to `SyncState`
    ```typescript
    interface PendingTranscript {
      date: string        // ISO date YYYY-MM-DD
      username: string
      repoFullName: string
      content: string
    }
    ```
  - [ ] Add `addPendingTranscript(transcript: PendingTranscript)` action
  - [ ] Add `clearPendingTranscriptsForRepo(repoFullName: string)` action (called after sync)
  - [ ] In `VoiceTranscriptionSheet` save handler: call `addTask(...)` + `addPendingTranscript(...)`

- [ ] Task 5: Sync service — write transcript file (AC: #8)
  - [ ] In `src/services/github/sync-service.ts`, after writing `captured-ideas-{username}.md`, iterate over `pendingTranscripts` for the current repo
  - [ ] For each, write `YYYY-MM-DD-{username}-transcript.md` to the same branch (use existing `createOrUpdateFile` pattern)
  - [ ] After successful write, call `clearPendingTranscriptsForRepo`

- [ ] Task 6: Voice capture entry point (AC: #3)
  - [ ] Add a microphone icon button to `src/App.tsx` in the capture area (near the FAB); only visible when an OpenAI key is configured
  - [ ] Opens `VoiceTranscriptionSheet` when tapped
  - [ ] When no key is configured: button still visible but tapping shows an inline SnackBar/toast with setup prompt (AC #2)

- [ ] Task 7: Tests
  - [ ] `src/services/transcription/whisper-service.test.ts` — mock `fetch`; test success, 401, 413, network error paths
  - [ ] `src/stores/useSyncStore.test.ts` — `setOpenaiApiKey`, `addPendingTranscript`, `clearPendingTranscriptsForRepo`
  - [ ] `src/features/capture/components/VoiceTranscriptionSheet.test.tsx` — render test, tab switching, no-key guard, file size error, discard closes sheet

## Dev Notes

### Architecture Guardrails

1. **API calls stay in services** — `VoiceTranscriptionSheet` calls `whisper-service.ts`, never `fetch()` directly. Consistent with the GitHub service layer pattern.
2. **Key storage** — OpenAI key follows the exact same AES-GCM encryption path as the GitHub PAT. Look at `src/services/storage/auth-storage.ts` (or `StorageService`) for the pattern and reuse it. Do NOT store the key in plain Zustand state.
3. **Bottom sheet pattern** — `CreateTaskSheet.tsx` is the canonical example. Copy its spring config, backdrop, swipe-to-dismiss, and `useReducedMotion` fallback exactly.
4. **IDB write-through** — the task created from the transcript must go through `addTask` (which handles IDB persistence), not a raw store mutation.
5. **No sync logic in components** — `pendingTranscripts` is written to the store in the sheet; the sync service reads and clears it. Components never call sync-service directly.

### Key Files to Reference

| File | Why |
|------|-----|
| `src/features/capture/components/CreateTaskSheet.tsx` | Canonical bottom sheet pattern to copy |
| `src/stores/useSyncStore.ts` | Add new state fields here; study `repoSkipCi` for per-feature flag pattern |
| `src/services/github/sync-service.ts` | Add transcript file write after tasks write |
| `src/components/layout/SettingsSheet.tsx` | Add "Voice & Transcription" row here |
| `src/features/sync/components/SyncImportBanner.tsx` | Pattern for inline dismissible banners |

### Whisper API Specifics

- **Endpoint:** `POST https://api.openai.com/v1/audio/transcriptions`
- **Required fields:** `file` (audio blob), `model` (`whisper-1`)
- **Max file size:** 25 MB (enforce client-side before upload to avoid quota waste)
- **Supported formats:** mp3, mp4, mpeg, mpga, m4a, wav, webm — all fine via MediaRecorder or file upload
- **Cost:** ~$0.006 / minute — not worth a usage warning in UI
- **Auth:** `Authorization: Bearer {apiKey}` header
- **Response:** `{ text: string }` — plain transcription, no segments/timestamps needed for MVP
- **iOS note:** Safari's `MediaRecorder` produces `audio/mp4`; Chrome produces `audio/webm`. Both accepted by Whisper. Set `mimeType` accordingly based on `MediaRecorder.isTypeSupported()`.

### iOS Safari / Mobile Considerations

- `MediaRecorder` is available on iOS 14.3+ via Safari. Prompt for microphone permission via `navigator.mediaDevices.getUserMedia({ audio: true })` before creating the recorder.
- `visualViewport` keyboard handling is NOT needed here (the sheet does not have text inputs that trigger the keyboard during recording). The review textarea may push the sheet — apply the same `visualViewport.resize` listener from `CreateTaskSheet.tsx` pattern if needed.
- File upload via `<input type="file">` works on iOS — test that `accept="audio/*"` doesn't block common formats.

### Project Structure Notes

- New files:
  - `src/services/transcription/whisper-service.ts` + `.test.ts`
  - `src/features/capture/components/VoiceTranscriptionSheet.tsx` + `.test.tsx`
- Modified files:
  - `src/stores/useSyncStore.ts` (3 new fields + 3 new actions + partialize)
  - `src/components/layout/SettingsSheet.tsx` (new Voice section)
  - `src/services/github/sync-service.ts` (transcript file writes)
  - `src/App.tsx` (mic button + sheet state)

### References

- [Source: captured-ideas-tholo91.md] — Original idea: "Speech to tasks, a Transcript will be created and one can automatically convert it to tasks (while keeping the Transcript as a 2026-MM-DD-transcript.md)"
- [Source: _bmad-output/planning-artifacts/epic-8-planning.md#Parked Items] — "Speech-to-tasks: Future roadmap feature"
- [Source: src/features/capture/components/CreateTaskSheet.tsx] — Bottom sheet pattern to copy
- [Source: src/stores/useSyncStore.ts#repoSkipCi] — Per-feature persisted boolean/data pattern
- [Source: src/services/github/sync-service.ts] — Where transcript file write goes

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
