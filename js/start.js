'use strict';
(async () => {
  // Logged in on this phone: the app opens at once from the phone's copy (see loadBoot).
  if (session.get()) {
    try {
      await loadBoot(true);
    } catch {
      S.user = null;
    }
  }
  render();
  // The business name for the login screen comes in the background; the screen does not wait for it.
  if (!S.user) {
    api('GET', '/public')
      .then((d) => {
        S.business = d.business_name;
        document.title = S.business;
        if (!S.user && $('.login h1')) $('.login h1').textContent = S.business;
      })
      .catch(() => {});
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
