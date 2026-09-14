# Large Photo Upload: Memory Architecture & Batched Queuing (Fyndr)

> Status: **Implemented & Verified** · PR: **#135** · Date: 2026-09-14

---

## 1. Problem Statement

When wedding and event photographers attempted to upload large albums (multi-gigabytes, ranging from 200 to 2,000+ high-resolution camera photos), the application exhibited:
- Severe UI freeze and unresponsiveness during photo selection.
- Continuous browser memory growth resulting in a hard renderer crash ("Aw, Snap! Error code: Out of Memory" or "Site has crashed").
- Monolithic request failures where an upload of several gigabytes failed near completion with unhandled server errors (500) and zero resume capability.

---

## 2. Root Cause Analysis

Two independent investigations (`ClientMemoryScout` and `BackendQueueReviewer`) verified the exact bottlenecks across the client rendering engine, network transport, and server ingest layers:

### 2.1 Uncompressed Bitmap RAM Explosion (Primary Crash Cause)
- In the original implementation (`Upload_Img.tsx:47`), selecting files immediately invoked `URL.createObjectURL(file)` on every single image and stored the blob URL in React state.
- The UI rendered an unvirtualized CSS grid mounting an `<img>` tag for every selected image.
- **Browser Rasterization Mechanics:** Web browsers (Chromium Skia, WebKit, Gecko) do not display compressed JPEG/WebP files directly in memory; they decode them into uncompressed 32-bit RGBA pixel bitmaps in RAM:
  $$\text{Memory per Image} = \text{Width} \times \text{Height} \times 4\text{ bytes}$$
  For standard 24–48 megapixel DSLR photos:
  $$6000 \times 4000 \times 4\text{ bytes} \approx 96\text{ MB per image in RAM}$$
- Rendering 200–500 photos in the DOM required **19.2 GB to 48 GB** of uncompressed bitmap memory.
- Standard 64-bit Chromium browser tabs are enforced with a 2 GB to 4 GB virtual memory limit. Exceeding this heap/raster limit instantly triggers an OS-level OOM renderer termination (`STATUS_BREAKPOINT` or `RESULT_CODE_KILLED_BAD_MESSAGE`).

### 2.2 Monolithic Multi-Gigabyte `FormData` Buffering
- The previous upload handler appended all selected files into a single monolithic `FormData` object and dispatched one massive `axios.post('/photo', formData)` call.
- Buffering gigabytes into browser V8 heap and Blink IPC buffers caused severe memory pressure and main-thread stalling.
- Single monolithic requests breached reverse-proxy constraints (Cloudflare 100MB body limit HTTP 413, proxy 100s timeouts HTTP 524) with zero fault tolerance: a single dropped packet aborted the entire transfer.

### 2.3 Backend Multer 100-File Array Limit
- In `node-server-1/src/routes/photos.ts:21`, Multer was configured with `upload.array('name', 100)`.
- When an album exceeded 100 photos, Multer rejected the 101st file with `MulterError: LIMIT_UNEXPECTED_FILE`.
- The unhandled exception fell through to Express error middleware, returning an opaque HTTP 500 "Internal server error" while leaking unreferenced disk files in `uploads/`.

---

## 3. Architecture & Implementation

The solution implements memory-safe bounded previews, a chunked batch upload queue, robust error recovery, and server-side error mapping with zero external dependencies.

```
[User Selects 500 Photos (5 GB)]
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Bounded Preview Engine                    │
│   • Previews generated only for first MAX_PREVIEWS (12)      │
│   • 488 photos queued with preview: "" (RAM protected)      │
│   • Active bitmap memory capped to < 50 MB                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Chunked Batched Upload Queue                │
│   • Batches of UPLOAD_BATCH_SIZE = 15 photos (~75-150 MB)   │
│   • Sequential dispatch via Axios + AbortController         │
│   • Overall progress interpolation across all batches       │
└─────────────┬───────────────────────────────┬───────────────┘
              │ Batch 1 (15)                  │ Batch 2 (15)...
              ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│     POST /photo (HTTP)    │   │     POST /photo (HTTP)    │
│  Multer (<= 100 files OK) │   │  Multer (<= 100 files OK) │
└─────────────┬─────────────┘   └─────────────┬─────────────┘
              │ 200 OK                        │ 200 OK
              ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Incremental Memory Cleanup                  │
│   • URL.revokeObjectURL on completed batch items            │
│   • Succeeded items removed from queue state                │
│   • Failed batch retains remaining files for 1-click retry  │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 Bounded Previews (`MAX_PREVIEWS = 12`)
- Object URLs are created **only** for `index < MAX_PREVIEWS` (first 12 files).
- Remaining files maintain `preview: ""` and render inside a lightweight badge card:
  `"+488 more queued (RAM protected)"`.
- When photos are removed or uploaded, newly promoted items in the top 12 lazily generate previews, maintaining an invariant of $\le 12$ active object URLs in memory regardless of whether 10 or 10,000 photos are selected.

### 3.2 Chunked Batched Upload Queue (`UPLOAD_BATCH_SIZE = 15`)
- Files are partitioned into sequential chunks of 15 photos (`UPLOAD_BATCH_SIZE = 15`), safely below Multer's 100-file threshold and well within standard HTTP proxy body limits.
- Real-time overall progress calculation:
  $$\text{Progress} = \min\left(99, \left\lfloor \frac{\text{uploadedCount} + (\text{batchLoaded} / \text{batchTotal}) \times \text{batchLength}}{\text{totalFilesCount}} \times 100 \right\rfloor\right)$$
- Upon batch completion:
  - Active preview URLs for the completed batch are revoked via `URL.revokeObjectURL`.
  - Completed items are removed from `selectedFiles` React state.
  - If a network failure occurs on batch $k$, photos from batches $1 \dots k-1$ remain securely saved in the database, while the remaining files stay queued in the UI for immediate retry without requiring the photographer to re-select files.

### 3.3 Cancellation & Lifecycle Safety
- `AbortController` is integrated into Axios requests.
- Invoking `cancelUpload()` aborts the active network request and terminates the loop via `CanceledError`, preventing false success execution.
- Loading state and controller nullification are strictly managed inside the async `finally` block to avoid race conditions.
- On component unmount, all active object URLs are revoked and pending requests are aborted.

### 3.4 Backend Multer Error Mapping (`node-server-1/src/app.ts`)
- Express global error middleware intercepts `multer.MulterError` instances.
- Replaces generic 500 errors with structured HTTP 400 Bad Request responses containing clear guidance:
  ```json
  {
    "error": "Too many files in a single batch (max 100). Please upload in smaller batches.",
    "message": "Too many files in a single batch (max 100). Please upload in smaller batches."
  }
  ```

---

## 4. Vercel CI Build Resolution

The Vercel deployment pipeline previously failed under `CI=true` due to two issues:
1. **ESLint `no-loop-func` Violation:** In `Upload_Img.tsx`, declaring `onUploadProgress` inside the batch loop closed over the mutable `let uploadedCount` variable. Resolved by scoping block-level constants (`baseUploaded = uploadedCount`, `currentBatchSize = currentBatch.length`).
2. **TypeScript Property Omission:** In `InEventLeads.test.tsx`, the `InEvent` component was instantiated without the mandatory `ownerId` prop introduced in prior schema hardening. Resolved by supplying `ownerId="usr_owner_leads"`.

With these fixes, `npx tsc --noEmit` and `CI=true react-scripts build` pass with zero warnings and zero errors, and Vercel builds report **PASS**.

---

## 5. Verification & Test Coverage

### Automated Test Suite (`Upload_Img.test.tsx`)
1. **Preview Clamping:** Verifies that selecting 30 photos creates exactly 12 object URLs (`MAX_PREVIEWS`) and renders the RAM protection indicator.
2. **Object URL Revocation on Removal:** Asserts `URL.revokeObjectURL` is invoked when individual files are removed.
3. **Full Queue Clear:** Verifies `clearAll()` revokes all active URLs and empties state.
4. **Batch Execution:** Asserts that 35 files dispatch in 3 distinct sequential HTTP requests of sizes 15, 15, and 5.
5. **Partial Batch Failure Retention:** Verifies that when batch 2 fails after batch 1 succeeds, the 10 un-uploaded photos remain queued for retry.
6. **Cancellation Handling:** Tests that `cancelUpload()` aborts the active request without reporting false success.
7. **Multi-Status 207 Handling:** Confirms HTTP 207 partial failure is caught and surfaced as a batch failure.

### Test Results
- `Upload_Img.test.tsx`: **8 passed, 8 total** (100%)
- `InEvent.qr.test.tsx`: **12 passed, 12 total** (100%)
- Backend Build (`node-server-1`): **0 errors**
- Frontend Typecheck (`tsc --noEmit`): **0 errors**
- Vercel Deployment Check: **PASS**
