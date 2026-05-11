import { Navigate, type RouteObject } from 'react-router-dom';

import App from 'app/App';
import { HomePage } from 'pages/home';
import { LoginPage } from 'pages/login';
import { MiniappEditorPage } from 'pages/miniapp-editor';
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
