# LEGACY Rich Text Editor

This document captures the current RichTextEditor stack and the “Read More” behavior so other engineers can extend it safely.

## Features shipped

1. **TipTap-based RichTextEditor**
   * Supports Heading 1-5, Paragraph, bold/italic/underline/strikethrough, bullet/ordered lists, quotes, text alignment, link insert/remove, media insert, color picker, special characters, paste-as-text, horizontal rule, clear formatting, undo/redo, and toolbar toggle.
   * Shared via `components/editor/RichTextEditor.tsx` and used in every blog/lesson builder step, lesson list row, and the advanced lesson editor.
   * Media assets are inserted through `useMediaLibrary` + `components/media/MediaLibraryDialog`, reusing Supabase storage.

2. **Read More workflow**
   * The toolbar exposes a “Read More” button that inserts `<div class="read-more-marker" data-read-more></div>` at the cursor; `lib/read-more.ts` exports the canonical string alongside helpers `splitReadMore` and `removeReadMoreMarker`.
   * Blog previews (`components/preview/BlogPreview.tsx`) and public `/blog` listing cards now display only the content before the marker and show a “Continue reading” badge when it’s present.
   * Public lesson pages (`app/education/lessons/[id]/page.tsx`) strip the marker before rendering, so readers never see the raw divider.
   * Backend APIs (`app/api/blog/route.ts`, `app/api/lessons/[id]/route.ts`) now return `excerpt_preview`, `content_preview`, and flags so other consumers can reuse the same split without recomputing it.

## What to do when editing content pipelines

* Whenever the editor inserts or reads HTML, use `READ_MORE_MARKER` from `lib/read-more` (not a hard-coded string) so previews and APIs stay in sync.
* If you need to expose the preview on another page (course overview, lesson card, newsletter, etc.), call `splitReadMore` to grab the before/after sections and treat `hasReadMore` as a flag for showing “Continue reading”.
* When wiring new APIs or serializers, strip the marker for public-facing HTML or expose `*_preview` fields so the raw HTML remains unchanged yet the UI can show a clean snippet.
* If you ever change the marker string (e.g., add an attribute), update `lib/read-more.ts` and rerun `npm run build` to make sure type checks (and the admin preview) still pass.

## Testing & rollout

* `npm run build` will surface any TypeScript issues introduced by the editor; the only remaining warnings currently come from `@supabase/realtime-js`.
* After deployment, verify the blog list cards, builder preview, and course/lesson listings all hide the marker and reflect “Continue reading” cues. That guarantees the new fields reach the public UI.
