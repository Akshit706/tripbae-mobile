import { Capacitor } from '@capacitor/core';

const SHARE_API = 'https://travelbae-backend-sg.onrender.com/share';

async function shareHtmlFile(html, destination, title) {
  const fileName = `tripbae-${(destination || 'trip').replace(/\s+/g, '-').toLowerCase()}-picks.html`;
  if (Capacitor.isNativePlatform()) {
    const { Share } = await import('@capacitor/share');
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({
      path: fileName,
      data: html,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
    await Share.share({ title, url: uri, dialogTitle: 'Share my plan' });
    return;
  }
  const blob = new Blob([html], { type: 'text/html' });
  const file = new File([blob], fileName, { type: 'text/html' });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Upload share HTML, then open the native share sheet (Android WebView cannot rely on navigator.share). */
export async function shareTripPicks({ html, destination, onCopied }) {
  const title = `My TripBae picks for ${destination}`;
  const text = `Check out what I'm planning for ${destination}! Tell me what you think. 🧳`;
  let shareUrl = null;
  try {
    const resp = await fetch(SHARE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, destination }),
    });
    if (resp.ok) ({ url: shareUrl } = await resp.json());
  } catch { /* fall through to file share */ }

  if (shareUrl) {
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url: shareUrl, dialogTitle: 'Share my plan' });
      return;
    }
    if (navigator.share) {
      await navigator.share({ title, text, url: shareUrl });
      return;
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      onCopied?.();
      return;
    }
    window.prompt('Copy this link:', shareUrl);
    return;
  }

  await shareHtmlFile(html, destination, title);
}
