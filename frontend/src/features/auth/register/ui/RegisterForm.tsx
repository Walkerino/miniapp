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
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-card__title">
        <h1>Sign Up</h1>
        <p>Create an account to manage miniapps</p>
      </div>

      {store.errors.form && (
        <p className="auth-card__alert" role="alert">
          {store.errors.form}
        </p>
      )}

      <div className="auth-field">
        <label htmlFor="signup-name">Name</label>
        <input
          id="signup-name"
          name="name"
          type="text"
          placeholder="Amir"
          value={store.name}
          onChange={(event) => store.setName(event.target.value)}
          required
        />
        {store.errors.name && (
          <p className="auth-field__error" role="alert">
            {store.errors.name}
          </p>
        )}
      </div>

      <div className="auth-field">
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
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
        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
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

      <div className="auth-field">
        <label htmlFor="signup-confirm-password">Confirm Password</label>
        <input
          id="signup-confirm-password"
          name="confirmPassword"
          type="password"
          placeholder="********"
          value={store.confirmPassword}
          onChange={(event) => store.setConfirmPassword(event.target.value)}
          required
        />
        {store.errors.confirmPassword && (
          <p className="auth-field__error" role="alert">
            {store.errors.confirmPassword}
          </p>
        )}
      </div>

      <button className="auth-card__submit" type="submit" disabled={!store.canSubmit}>
        Sign Up
      </button>

      <p className="auth-card__signup">
        Already have an account? <Link to={routesMasks.login.create()}>Sign In</Link>
      </p>
    </form>
  );
});
