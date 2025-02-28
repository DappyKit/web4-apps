import './dashboard.css'
import { FooterLogged } from './FooterLogged'
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { MyApps } from './pages/MyApps'
import { MyTemplates } from './pages/MyTemplates'
import { AllApps } from './pages/AllApps'
import { AllTemplates } from './pages/AllTemplates'
import { Settings } from './pages/Settings'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useDispatch } from 'react-redux'
import { logout } from './redux/reducers/authSlice'
import { useDisconnect } from 'wagmi'
import { ViewApp } from './pages/ViewApp'
import { ViewTemplate } from './pages/ViewTemplate'
import { memo } from 'react'

interface NavItemProps {
  to: string
  icon: string
  children: React.ReactNode
}

/**
 * Navigation item component with active state handling
 */
const NavItem = memo(({ to, icon, children }: NavItemProps) => (
  <li className="nav-item">
    <NavLink className={({ isActive }) => `nav-link d-flex gap-2${isActive ? ' active text-primary' : ''}`} to={to}>
      <i className={`bi bi-${icon}`}></i>
      {children}
    </NavLink>
  </li>
))

NavItem.displayName = 'NavItem'

/**
 * Navigation configuration
 */
const NAV_ITEMS = [
  { to: '/dashboard', icon: 'house-fill', label: 'Dashboard' },
  { to: '/my-apps', icon: 'puzzle', label: 'My Apps' },
  { to: '/my-templates', icon: 'cart', label: 'My Templates' },
  { to: '/all-apps', icon: 'people', label: 'All Apps' },
  { to: '/all-templates', icon: 'graph-up', label: 'All Templates' },
]

/**
 * Route configuration
 */
const ROUTES = [
  { path: '/', element: <Dashboard /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/my-apps', element: <MyApps /> },
  { path: '/my-templates', element: <MyTemplates /> },
  { path: '/all-apps', element: <AllApps /> },
  { path: '/all-templates', element: <AllTemplates /> },
  { path: '/settings', element: <Settings /> },
]

/**
 * Sidebar navigation component
 */
const SidebarNav = memo(({ onLogout }: { onLogout: () => void }) => (
  <div className="border-end bg-body-tertiary sidebar d-none d-md-block">
    <div className="offcanvas-md offcanvas-end bg-body-tertiary" id="sidebarMenu" aria-labelledby="sidebarMenuLabel">
      <div className="offcanvas-header">
        <h5 className="offcanvas-title" id="sidebarMenuLabel">
          Web4 Apps
        </h5>
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="offcanvas"
          data-bs-target="#sidebarMenu"
          aria-label="Close"
        ></button>
      </div>
      <div className="offcanvas-body d-md-flex flex-column p-0 pt-lg-3 overflow-y-auto">
        <ul className="nav flex-column">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavItem key={to} to={to} icon={icon}>
              {label}
            </NavItem>
          ))}
        </ul>

        <hr className="my-3" />

        <ul className="nav flex-column mb-auto">
          <NavItem to="/settings" icon="gear-wide-connected">
            Settings
          </NavItem>
          <li className="nav-item">
            <button
              onClick={onLogout}
              className="nav-link d-flex gap-2 text-danger border-0 bg-transparent w-100 text-start"
            >
              <i className="bi bi-box-arrow-right"></i>
              Logout
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
))

SidebarNav.displayName = 'SidebarNav'

/**
 * Main content component
 */
const MainContent = memo(() => (
  <div className="flex-grow-1 d-flex flex-column w-100">
    <header className="d-md-none p-3 border-bottom bg-body-tertiary">
      <div className="d-flex justify-content-between align-items-center">
        <a href="#" className="text-decoration-none">
          <span className="fs-4">Web4 Apps</span>
        </a>
        <button
          className="btn btn-sm btn-outline-secondary"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#sidebarMenu"
          aria-controls="sidebarMenu"
        >
          <i className="bi bi-list"></i>
        </button>
      </div>
    </header>
    <div className="px-3 px-md-4 flex-grow-1">
      <Routes>
        {ROUTES.map(({ path, element }) => (
          <Route key={path} path={path} element={<ProtectedRoute>{element}</ProtectedRoute>} />
        ))}
        <Route path="/apps/:id" element={<ViewApp />} />
        <Route path="/templates/:id" element={<ViewTemplate />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
    <FooterLogged />
  </div>
))

MainContent.displayName = 'MainContent'

/**
 * Main component for authenticated users
 * Provides navigation sidebar and routes to different sections of the application
 * @returns {React.JSX.Element} The main authenticated user interface
 */
export function MainLogged(): React.JSX.Element {
  const { disconnect } = useDisconnect()
  const dispatch = useDispatch()

  /**
   * Handles user logout with confirmation
   * Disconnects wallet and clears authentication state
   */
  const handleLogout = (): void => {
    if (window.confirm('Are you sure you want to logout?')) {
      disconnect()
      dispatch(logout())
    }
  }

  return (
    <main className="d-flex min-vh-100">
      <SidebarNav onLogout={handleLogout} />
      <MainContent />
    </main>
  )
}
