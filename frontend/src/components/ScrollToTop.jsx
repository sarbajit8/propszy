import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Ensures that whenever the user navigates or redirects to any page,
 * the viewport automatically resets to the top (0, 0).
 * If a hash anchor exists (e.g. #overview), it will scroll to that element.
 */
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  const prevPathnameRef = useRef(null);
  const prevPageRef = useRef(null);

  // Disable automatic browser scroll restoration so SPA navigations always start at top
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
    const currentPage = new URLSearchParams(search).get('page');
    const pathChanged = prevPathnameRef.current !== pathname;
    const pageChanged = prevPageRef.current !== currentPage;

    prevPathnameRef.current = pathname;
    prevPageRef.current = currentPage;

    // If navigating to a hash anchor on the same or new page
    if (hash) {
      const targetId = hash.replace('#', '');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      // Retry in case dynamic components take a short moment to mount
      const timeoutId = setTimeout(() => {
        const lateEl = document.getElementById(targetId);
        if (lateEl) {
          lateEl.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo(0, 0);
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    // If pathname or pagination page changed, scroll to top
    if (pathChanged || pageChanged) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // Ensure deferred layout rendering also stays at top
      const frameId = requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });

      return () => cancelAnimationFrame(frameId);
    }
  }, [pathname, search, hash]);

  return null;
}
