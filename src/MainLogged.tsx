import './dashboard.css'
import { FooterLogged } from './FooterLogged'
import { NavLink, Routes, Route, Navigate, Link } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { MyApps } from './pages/MyApps'
import { MyTemplates } from './pages/MyTemplates'
import { AllApps } from './pages/AllApps'
import { AllTemplates } from './pages/AllTemplates'
import { Settings } from './pages/Settings'
import { TopAppCreators } from './pages/TopAppCreators'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useDispatch } from 'react-redux'
import { logout } from './redux/reducers/authSlice'
import { useDisconnect } from 'wagmi'
import { ViewApp } from './pages/ViewApp'
import { ViewTemplate } from './pages/ViewTemplate'
import { memo, useState, useCallback } from 'react'
import { Offcanvas, Button } from 'react-bootstrap'

interface NavItemProps {
  to: string
  icon: string
  children: React.ReactNode
  onClick?: () => void
}

/**
 * Navigation item component with active state handling
 */
const NavItem = memo(({ to, icon, children, onClick }: NavItemProps) => (
  <li className="nav-item">
    <NavLink
      className={({ isActive }) => `nav-link d-flex gap-2${isActive ? ' active text-primary' : ''}`}
      to={to}
      onClick={onClick}
    >
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
  { to: '/top-creators', icon: 'trophy', label: 'Top Creators' },
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
  { path: '/top-creators', element: <TopAppCreators /> },
  { path: '/settings', element: <Settings /> },
]

/**
 * Sidebar navigation component
 */
const SidebarNav = memo(
  ({
    onLogout,
    showMobileMenu,
    handleCloseMobileMenu,
  }: {
    onLogout: () => void
    showMobileMenu: boolean
    handleCloseMobileMenu: () => void
  }) => (
    <>
      {/* Desktop sidebar - visible only on md screens and up */}
      <div className="border-end bg-body-tertiary sidebar d-none d-md-block">
        <div className="d-md-flex flex-column p-0 pt-lg-3 overflow-y-auto h-100">
          <ul className="nav flex-column">
            {NAV_ITEMS.map(({ to, icon, label }) => (
              <NavItem key={to} to={to} icon={icon}>
                {label}
              </NavItem>
            ))}
          </ul>

          <hr className="my-3" />

          <ul className="nav flex-column mb-auto">
            {/*<NavItem to="/settings" icon="gear-wide-connected">*/}
            {/*  Settings*/}
            {/*</NavItem>*/}
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

      {/* Mobile sidebar - using React-Bootstrap Offcanvas */}
      <Offcanvas
        show={showMobileMenu}
        onHide={handleCloseMobileMenu}
        placement="end"
        className="d-md-none bg-body-tertiary"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Web4 Apps</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <div className="d-flex flex-column overflow-y-auto">
            <ul className="nav flex-column">
              {NAV_ITEMS.map(({ to, icon, label }) => (
                <NavItem key={to} to={to} icon={icon} onClick={handleCloseMobileMenu}>
                  {label}
                </NavItem>
              ))}
            </ul>

            <hr className="my-3" />

            <ul className="nav flex-column mb-auto">
              <NavItem to="/settings" icon="gear-wide-connected" onClick={handleCloseMobileMenu}>
                Settings
              </NavItem>
              <li className="nav-item">
                <button
                  onClick={() => {
                    handleCloseMobileMenu()
                    onLogout()
                  }}
                  className="nav-link d-flex gap-2 text-danger border-0 bg-transparent w-100 text-start"
                >
                  <i className="bi bi-box-arrow-right"></i>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  ),
)

SidebarNav.displayName = 'SidebarNav'

/**
 * Main content component with mobile menu toggle
 */
const MainContent = memo(({ handleShowMobileMenu }: { handleShowMobileMenu: () => void }) => (
  <div className="flex-grow-1 d-flex flex-column w-100">
    <header className="d-md-none p-3 border-bottom bg-body-tertiary">
      <div className="d-flex justify-content-between align-items-center">
        <Link to="/" className="text-decoration-none">
          <span className="fs-4">Web4 Apps</span>
        </Link>
        <Button variant="outline-secondary" size="sm" onClick={handleShowMobileMenu}>
          <i className="bi bi-list"></i>
        </Button>
      </div>
    </header>
    <div className="px-3 px-md-4 flex-grow-1">
      <Routes>
        {ROUTES.map(({ path, element }) => (
          <Route key={path} path={path} element={<ProtectedRoute>{element}</ProtectedRoute>} />
        ))}
        <Route path="/top-creators" element={<TopAppCreators />} />
        <Route
          path="/apps/:id"
          element={
            <ProtectedRoute>
              <ViewApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates/:id"
          element={
            <ProtectedRoute>
              <ViewTemplate />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
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
  const [showMobileMenu, setShowMobileMenu] = useState(false)

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

  /**
   * Handles showing the mobile menu
   */
  const handleShowMobileMenu = useCallback((): void => {
    setShowMobileMenu(true)
  }, [])

  /**
   * Handles closing the mobile menu
   */
  const handleCloseMobileMenu = useCallback((): void => {
    setShowMobileMenu(false)
  }, [])

  return (
    <main className="d-flex min-vh-100">
      <SidebarNav
        onLogout={handleLogout}
        showMobileMenu={showMobileMenu}
        handleCloseMobileMenu={handleCloseMobileMenu}
      />
      <MainContent handleShowMobileMenu={handleShowMobileMenu} />
    </main>
  )
}
