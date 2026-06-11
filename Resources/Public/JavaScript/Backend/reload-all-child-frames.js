export function reloadAllChildFrames() {
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    iframe.contentWindow.location.reload();
  });
}
