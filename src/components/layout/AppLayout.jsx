import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import OnboardingGate from './OnboardingGate';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <OnboardingGate />
    </div>
  );
}