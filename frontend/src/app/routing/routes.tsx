import { Navigate, type RouteObject } from 'react-router-dom';

import App from 'app/App';
import { AdminPage } from 'pages/admin';
import { HomePage } from 'pages/home';
import { LoginPage } from 'pages/login';
import { MiniappEditorPage } from 'pages/miniapp-editor';
import { MiniappsPage } from 'pages/miniapps';
import { ProfilePage } from 'pages/profile';
import { SignUpPage } from 'pages/signup';
import { routesMasks } from 'shared/config/routesMasks';
import { GuestRoute, ProtectedRoute } from './ProtectedRoute';

export const routes: RouteObject[] = [
  {
    path: routesMasks.main.mask,
    element: <App />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },
      {
        path: routesMasks.miniapps.listMask,
        element: (
          <ProtectedRoute>
            <MiniappsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: routesMasks.miniapps.legacyListMask,
        element: <Navigate to={routesMasks.miniapps.list()} replace />,
      },
      {
        path: routesMasks.miniapps.createMask,
        element: (
          <ProtectedRoute>
            <MiniappEditorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: routesMasks.miniapps.editMask,
        element: (
          <ProtectedRoute>
            <MiniappEditorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: routesMasks.profile.mask,
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: routesMasks.admin.mask,
        element: (
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: routesMasks.login.mask,
        element: (
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        ),
      },
      {
        path: routesMasks.signup.mask,
        element: (
          <GuestRoute>
            <SignUpPage />
          </GuestRoute>
        ),
      },
      { path: '*', element: <Navigate to={routesMasks.main.mask} replace /> },
    ],
  },
];
