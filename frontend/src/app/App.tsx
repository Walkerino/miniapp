import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { routesMasks } from 'shared/config/routesMasks';

const PAGE_TITLE_SUFFIX = 'MiniApps';

function getPageTitle(pathname: string) {
  if (pathname === routesMasks.main.mask) {
    return `Dashboard | ${PAGE_TITLE_SUFFIX}`;
  }

  if (pathname === routesMasks.login.mask) {
    return `Sign In | ${PAGE_TITLE_SUFFIX}`;
  }

  if (pathname === routesMasks.signup.mask) {
    return `Sign Up | ${PAGE_TITLE_SUFFIX}`;
  }

  if (pathname === routesMasks.profile.mask) {
    return `Profile | ${PAGE_TITLE_SUFFIX}`;
  }

  if (pathname === routesMasks.admin.mask) {
    return `Admin | ${PAGE_TITLE_SUFFIX}`;
  }

  if (pathname === routesMasks.miniapps.createMask) {
    return `New MiniApp | ${PAGE_TITLE_SUFFIX}`;
  }

  if (/^\/miniapps\/[^/]+\/edit$/i.test(pathname)) {
    return `Edit MiniApp | ${PAGE_TITLE_SUFFIX}`;
  }

  if (
    pathname === routesMasks.miniapps.listMask ||
    pathname === routesMasks.miniapps.legacyListMask
  ) {
    return `MiniApps | ${PAGE_TITLE_SUFFIX}`;
  }

  return PAGE_TITLE_SUFFIX;
}

function App() {
  const location = useLocation();

  useEffect(() => {
    document.title = getPageTitle(location.pathname);
  }, [location.pathname]);

  return (
    <div className="app">
      <main className="page-transition" key={location.pathname}>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
