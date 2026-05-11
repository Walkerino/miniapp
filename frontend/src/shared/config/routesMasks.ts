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
  miniapps: {
    createMask: '/miniapps/new',
    editMask: '/miniapps/:miniappId/edit',
    create: () => '/miniapps/new',
    edit: (miniappId: string) => `/miniapps/${miniappId}/edit`,
  },
};
