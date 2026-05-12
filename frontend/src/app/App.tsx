import { Outlet, useLocation } from 'react-router-dom';

function App() {
  const location = useLocation();

  return (
    <div className="app">
      <main className="page-transition" key={location.pathname}>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
