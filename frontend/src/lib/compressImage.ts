export async function compressImage(
  source: string | Blob | File,
  { maxWidth = 1280, quality = 0.7 }: { maxWidth?: number; quality?: number } = {}
): Promise<string> {
  const img = new Image();
  const url = source instanceof Blob || source instanceof File ? URL.createObjectURL(source) : source;
  img.src = url;

  await img.decode();

  const canvas = document.createElement('canvas');
  const scale = Math.min(maxWidth / img.width, 1);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (source instanceof Blob || source instanceof File) URL.revokeObjectURL(url);

  return canvas.toDataURL('image/jpeg', quality);
}
