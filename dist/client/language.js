(() => {
  const preferenceKey = 'kall-language';
  let preferredLanguage;
  try {
    preferredLanguage = localStorage.getItem(preferenceKey);
  } catch {
    // Browser storage can be disabled.
  }

  const browserLanguage = (navigator.languages?.length
    ? navigator.languages
    : [navigator.language])
    .map(language => language?.toLowerCase().split('-')[0])
    .find(language => language === 'es' || language === 'en');

  if (location.pathname === '/' && new URLSearchParams(location.search).get('lang') !== 'en' &&
      (preferredLanguage === 'es' ||
        (preferredLanguage !== 'en' && browserLanguage === 'es'))) {
    location.replace('/es/' + location.search + location.hash);
  }

  document.addEventListener('click', event => {
    const language = event.target.closest?.('[data-language-choice]')?.dataset.languageChoice;
    if (!language) return;
    try {
      localStorage.setItem(preferenceKey, language);
    } catch {
      // The language link still works without storage. Use an explicit override
      // for English so browser detection does not immediately send it back.
      if (language === 'en') {
        event.preventDefault();
        location.assign('/?lang=en');
      }
    }
  });
})();
