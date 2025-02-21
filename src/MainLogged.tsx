import './dashboard.css'

export function MainLogged() {
  return (
    <main>
      <div className="container-fluid">
        <div className="row">
          <div className="sidebar border border-right col-md-3 col-lg-2 p-0 bg-body-tertiary">
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
                    <a className="nav-link d-flex  gap-2 active" aria-current="page" href="#">
                      <i className="bi bi-house-fill"></i>
                        Dashboard
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link d-flex gap-2" href="#">
                      <i className="bi bi-puzzle"></i>
                      My Apps
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link d-flex gap-2" href="#">
                      <i className="bi bi-cart"></i>
                      My Templates
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link d-flex gap-2" href="#">
                      <i className="bi bi-people"></i>
                      All Apps
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link d-flex gap-2" href="#">
                      <i className="bi bi-graph-up"></i>
                      All Templates
                    </a>
                  </li>
                </ul>



                <hr className="my-3"/>

                <ul className="nav flex-column mb-auto">
                  <li className="nav-item">
                    <a className="nav-link d-flex gap-2" href="#">
                      <i className="bi bi-gear-wide-connected"></i>
                      Settings
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
            <div
              className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
              <h1 className="h2">Dashboard</h1>
            </div>

            Hello world
          </main>
        </div>
      </div>
    </main>
  )
}
