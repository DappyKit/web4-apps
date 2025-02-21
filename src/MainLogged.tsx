import './dashboard.css'
import { FooterLogged } from './FooterLogged'
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { MyApps } from './pages/MyApps'
import { MyTemplates } from './pages/MyTemplates'
import { AllApps } from './pages/AllApps'
import { AllTemplates } from './pages/AllTemplates'
import { Settings } from './pages/Settings'

export function MainLogged() {
  return (
    <main className="d-flex min-vh-100">
      <div className="border-end bg-body-tertiary" style={{ width: '280px' }}>
        <div className="offcanvas-md offcanvas-end bg-body-tertiary" id="sidebarMenu"
          aria-labelledby="sidebarMenuLabel">
          <div className="offcanvas-header">
            <h5 className="offcanvas-title" id="sidebarMenuLabel">Web4 Apps</h5>
            <button type="button" className="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#sidebarMenu"
              aria-label="Close"></button>
          </div>
          <div className="offcanvas-body d-md-flex flex-column p-0 pt-lg-3 overflow-y-auto">
            <ul className="nav flex-column">
              <li className="nav-item">
                <NavLink className={({ isActive }) =>
                  `nav-link d-flex gap-2 ${isActive ? 'active' : ''}`}
                to="/dashboard">
                  <i className="bi bi-house-fill"></i>
                  Dashboard
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className={({ isActive }) =>
                  `nav-link d-flex gap-2 ${isActive ? 'active' : ''}`}
                to="/my-apps">
                  <i className="bi bi-puzzle"></i>
                  My Apps
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className={({ isActive }) =>
                  `nav-link d-flex gap-2 ${isActive ? 'active' : ''}`}
                to="/my-templates">
                  <i className="bi bi-cart"></i>
                  My Templates
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className={({ isActive }) =>
                  `nav-link d-flex gap-2 ${isActive ? 'active' : ''}`}
                to="/all-apps">
                  <i className="bi bi-people"></i>
                  All Apps
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className={({ isActive }) =>
                  `nav-link d-flex gap-2 ${isActive ? 'active' : ''}`}
                to="/all-templates">
                  <i className="bi bi-graph-up"></i>
                  All Templates
                </NavLink>
              </li>
            </ul>

            <hr className="my-3"/>

            <ul className="nav flex-column mb-auto">
              <li className="nav-item">
                <NavLink className={({ isActive }) =>
                  `nav-link d-flex gap-2 ${isActive ? 'active' : ''}`}
                to="/settings">
                  <i className="bi bi-gear-wide-connected"></i>
                  Settings
                </NavLink>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex-grow-1 d-flex flex-column">
        <div className="px-md-4 flex-grow-1">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-apps" element={<MyApps />} />
            <Route path="/my-templates" element={<MyTemplates />} />
            <Route path="/all-apps" element={<AllApps />} />
            <Route path="/all-templates" element={<AllTemplates />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>

        <FooterLogged />
      </div>
    </main>
  )
}
