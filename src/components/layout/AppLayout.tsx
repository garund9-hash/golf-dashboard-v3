import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useGolf } from '../../context/GolfContext';
import {
  ChartIcon,
  FlagIcon,
  HomeIcon,
  MapIcon,
  MenuIcon,
  CloseIcon,
  TransferIcon,
} from './Icons';
import { ToastStack } from '../ui/ToastStack';

const nav = [
  { to: '/', label: 'Dashboard', icon: HomeIcon, end: true },
  { to: '/trends', label: 'Performance Trends', icon: ChartIcon },
  { to: '/courses', label: 'Course Statistics', icon: MapIcon },
  { to: '/import-export', label: 'Import / Export', icon: TransferIcon },
];

export function AppLayout() {
  const { profile } = useGolf();
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);

  return (
    <div className="app-shell">
      <div
        className={`overlay ${menuOpen ? 'visible' : ''}`}
        onClick={close}
        aria-hidden={!menuOpen}
      />

      <header className="mobile-bar">
        <div className="brand">
          <div className="brand-mark">
            <FlagIcon />
          </div>
          <div className="brand-text">
            <strong>Fairway</strong>
          </div>
        </div>
        <button
          type="button"
          className="menu-btn"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <FlagIcon />
          </div>
          <div className="brand-text">
            <strong>Fairway</strong>
            <span>Golf Analytics</span>
          </div>
        </div>

        <nav aria-label="Main">
          <ul className="nav-list">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  onClick={close}
                >
                  <item.icon />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="player-name">{profile.name}</div>
          <div className="player-meta">
            Handicap {profile.handicap.toFixed(1)} · Goal {profile.goalHandicap.toFixed(1)}
          </div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      <ToastStack />
    </div>
  );
}
