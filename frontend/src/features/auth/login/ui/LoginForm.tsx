import { observer } from 'mobx-react-lite';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { LoginStore } from 'features/auth/login/model/LoginStore';
import { routesMasks } from 'shared/config/routesMasks';
import { useLocalStore } from 'shared/lib/useLocalStore';

export const LoginForm = observer(function LoginForm() {
  const store = useLocalStore(() => new LoginStore());
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isSuccess = await store.login();

    if (isSuccess) {
      navigate(routesMasks.main.create());
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {store.errors.form && <p role="alert">{store.errors.form}</p>}

      <div>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          name="email"
          type="email"
          value={store.email}
          onChange={(event) => store.setEmail(event.target.value)}
          required
        />
        {store.errors.email && <p role="alert">{store.errors.email}</p>}
      </div>

      <div>
        <label htmlFor="login-password">Пароль</label>
        <input
          id="login-password"
          name="password"
          type="password"
          value={store.password}
          onChange={(event) => store.setPassword(event.target.value)}
          required
        />
        {store.errors.password && <p role="alert">{store.errors.password}</p>}
      </div>

      <button type="submit" disabled={!store.canSubmit}>
        Войти
      </button>

      <p>
        Нет аккаунта? <Link to={routesMasks.signup.create()}>Зарегистрироваться</Link>
      </p>
    </form>
  );
});
