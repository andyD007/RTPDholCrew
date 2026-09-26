"use client";

/**
 * Browser-side media prep: downscale big phone photos before upload (keeps
 * requests small and fast) and grab a poster frame from videos.
 */
export async function downscaleImage(file: File, maxEdge: number): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file; // HEIC/AVIF: let the server handle it
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 4 * 1024 * 1024) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.9));
}

export async function extractVideoPoster(file: File): Promise<{ blob: Blob; width: number; height: number; duration: number } | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Unsupported video"));
    });
    video.currentTime = Math.min(1, (video.duration || 2) / 3);
    await new Promise<void>((resolve) => (video.onseeked = () => resolve()));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? { blob, width: video.videoWidth, height: video.videoHeight, duration: video.duration } : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
