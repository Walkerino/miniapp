import { Navigate, type RouteObject } from 'react-router-dom';

import App from 'app/App';
import { ProtectedRoute } from 'app/routing/ProtectedRoute';
import { HomePage } from 'pages/home';
import { LoginPage } from 'pages/login';
import { SignUpPage } from 'pages/signup';
import { routesMasks } from 'shared/config/routesMasks';

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
      { path: routesMasks.login.mask, element: <LoginPage /> },
      { path: routesMasks.signup.mask, element: <SignUpPage /> },
      { path: '*', element: <Navigate to={routesMasks.main.mask} replace /> },
    ],
  },
];
