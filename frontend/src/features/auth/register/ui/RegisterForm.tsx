import { observer } from 'mobx-react-lite';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { RegisterStore } from 'features/auth/register/model/RegisterStore';
import { routesMasks } from 'shared/config/routesMasks';
import { useLocalStore } from 'shared/lib/useLocalStore';

export const RegisterForm = observer(function RegisterForm() {
  const store = useLocalStore(() => new RegisterStore());
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isSuccess = await store.signUp();

    if (isSuccess) {
      navigate(routesMasks.main.create());
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {store.errors.form && <p role="alert">{store.errors.form}</p>}

      <div>
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          name="email"
          type="email"
          value={store.email}
          onChange={(event) => store.setEmail(event.target.value)}
          required
        />
        {store.errors.email && <p role="alert">{store.errors.email}</p>}
      </div>

      <div>
        <label htmlFor="signup-password">Пароль</label>
        <input
          id="signup-password"
          name="password"
          type="password"
          value={store.password}
          onChange={(event) => store.setPassword(event.target.value)}
          required
        />
        {store.errors.password && <p role="alert">{store.errors.password}</p>}
      </div>

      <div>
        <label htmlFor="signup-confirm-password">Повторите пароль</label>
        <input
          id="signup-confirm-password"
          name="confirmPassword"
          type="password"
          value={store.confirmPassword}
          onChange={(event) => store.setConfirmPassword(event.target.value)}
          required
        />
        {store.errors.confirmPassword && <p role="alert">{store.errors.confirmPassword}</p>}
      </div>

      <button type="submit" disabled={!store.canSubmit}>
        Зарегистрироваться
      </button>

      <p>
        Уже есть аккаунт? <Link to={routesMasks.login.create()}>Войти</Link>
      </p>
    </form>
  );
});
