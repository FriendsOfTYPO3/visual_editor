async function resolveCrossOriginBackendUrl(url) {
  const response = await fetch(TYPO3.settings.ajaxUrls.visual_editor_resolve_cross_origin_backend_url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({url}),
  });

  if (!response.ok) {
    throw new Error(`Could not resolve cross-origin backend URL: ${response.status}`);
  }

  const data = await response.json();
  if (!data.url) {
    throw new Error('Missing backend URL in resolver response');
  }

  return data.url;
}

export function initializeCrossOriginNavigations() {

  navigation.addEventListener("navigate", (event) => {
    const newUrl = new URL(event.destination.url);
    if (newUrl.origin !== window.location.origin) {
      event.preventDefault();

      if (window.veInfo.allowedOrigins.includes(newUrl.origin)) {
        resolveCrossOriginBackendUrl(event.destination.url)
          .then((backendUrl) => {
            window.top.location = backendUrl;
          })
          .catch((error) => {
            console.error(error);
            window.open(event.destination.url, '_blank').focus();
          });
        return;
      }

      // open in new Tab and force switch to
      window.open(event.destination.url, '_blank').focus();
    }
  });
}
