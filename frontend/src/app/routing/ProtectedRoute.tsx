import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { sessionStore } from 'entities/session';
import { routesMasks } from 'shared/config/routesMasks';

type ProtectedRouteProps = {
  children: ReactNode;
};

export const ProtectedRoute = observer(function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    sessionStore.checkAuth().finally(() => {
      if (isMounted) {
        setIsChecking(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isChecking) {
    return null;
  }

  if (!sessionStore.isAuth) {
    return <Navigate to={routesMasks.login.create()} replace />;
  }

  return <>{children}</>;
});
