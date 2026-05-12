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
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-card__title">
        <h1>Sign In</h1>
        <p>Welcome back! Please sign in to your account</p>
      </div>

      {store.errors.form && (
        <p className="auth-card__alert" role="alert">
          {store.errors.form}
        </p>
      )}

      <div className="auth-field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          name="email"
          type="email"
          placeholder="your@mail.com"
          value={store.email}
          onChange={(event) => store.setEmail(event.target.value)}
          required
        />
        {store.errors.email && (
          <p className="auth-field__error" role="alert">
            {store.errors.email}
          </p>
        )}
      </div>

      <div className="auth-field">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          name="password"
          type="password"
          placeholder="********"
          value={store.password}
          onChange={(event) => store.setPassword(event.target.value)}
          required
        />
        {store.errors.password && (
          <p className="auth-field__error" role="alert">
            {store.errors.password}
          </p>
        )}
      </div>

      <div className="auth-card__row">
        <label className="auth-card__remember">
          <input type="checkbox" />
          <span>Remember Me</span>
        </label>
        <button className="auth-card__ghost" type="button">
          Forgot Password?
        </button>
      </div>

      <button className="auth-card__submit" type="submit" disabled={!store.canSubmit}>
        Sign In
      </button>

      <p className="auth-card__signup">
        Don&apos;t have an account? <Link to={routesMasks.signup.create()}>Sign Up</Link>
      </p>
    </form>
  );
});
