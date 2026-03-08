import { Outlet } from 'react-router-dom';

export function MarketingLayout() {
  return (
    <div className="min-h-screen bg-cream">
      <Outlet />
    </div>
  );
}
