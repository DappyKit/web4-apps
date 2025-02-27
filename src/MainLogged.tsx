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
      <div className="border-end bg-body-tertiary" style={{ width: '280px', flexShrink: 0 }}>
        <div
          className="offcanvas-md offcanvas-end bg-body-tertiary"
          id="sidebarMenu"
          aria-labelledby="sidebarMenuLabel"
        >
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
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) => `nav-link d-flex gap-2 ${isActive ? 'active' : ''}`}
                  to="/dashboard"
                >
                  <i className="bi bi-house-fill"></i>
                  Dashboard
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) => `nav-link d-flex gap-2 ${isActive ? 'active' : ''}`}
                  to="/my-apps"
                >
                  <i className="bi bi-puzzle"></i>
                  My Apps
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) => `nav-link d-flex gap-2 ${isActive ? 'active' : ''}`}
                  to="/my-templates"
                >
                  <i className="bi bi-cart"></i>
                  My Templates
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) => `nav-link d-flex gap-2 ${isActive ? 'active' : ''}`}
                  to="/all-apps"
                >
                  <i className="bi bi-people"></i>
                  All Apps
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) => `nav-link d-flex gap-2 ${isActive ? 'active' : ''}`}
                  to="/all-templates"
                >
                  <i className="bi bi-graph-up"></i>
                  All Templates
                </NavLink>
              </li>
            </ul>

            <hr className="my-3" />

            <ul className="nav flex-column mb-auto">
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) => `nav-link d-flex gap-2 ${isActive ? 'active' : ''}`}
                  to="/settings"
                >
                  <i className="bi bi-gear-wide-connected"></i>
                  Settings
                </NavLink>
              </li>
              <li className="nav-item">
                <button
                  onClick={handleLogout}
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

      <div className="flex-grow-1 d-flex flex-column" style={{ maxWidth: 'calc(100% - 280px)', minWidth: 0 }}>
        <div className="px-md-4 flex-grow-1">
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-apps"
              element={
                <ProtectedRoute>
                  <MyApps />
                </ProtectedRoute>
              }
            />
            <Route path="/apps/:id" element={<ViewApp />} />
            <Route
              path="/my-templates"
              element={
                <ProtectedRoute>
                  <MyTemplates />
                </ProtectedRoute>
              }
            />
            <Route path="/templates/:id" element={<ViewTemplate />} />
            <Route
              path="/all-apps"
              element={
                <ProtectedRoute>
                  <AllApps />
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-templates"
              element={
                <ProtectedRoute>
                  <AllTemplates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>

        <FooterLogged />
      </div>
    </main>
  )
}
