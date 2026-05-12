export const routesMasks = {
  main: {
    mask: '/',
    create: () => '/',
  },
  login: {
    mask: '/login',
    create: () => '/login',
  },
  signup: {
    mask: '/signup',
    create: () => '/signup',
  },
  profile: {
    mask: '/profile',
    create: () => '/profile',
  },
  admin: {
    mask: '/admin',
    create: () => '/admin',
  },
  miniapps: {
    listMask: '/miniapps',
    legacyListMask: '/miniApps',
    createMask: '/miniapps/new',
    editMask: '/miniapps/:miniappId/edit',
    list: () => '/miniapps',
    create: () => '/miniapps/new',
    edit: (miniappId: string) => `/miniapps/${miniappId}/edit`,
  },
};
