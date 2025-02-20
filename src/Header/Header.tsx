export function Header() {
  return (
    <header>
      <div className="w-lg-75 mx-2 mx-lg-auto position-relative z-2 px-lg-3 py-0 shadow-5 rounded-3 rounded-lg-pill bg-dark">
        <nav className="navbar navbar-expand-lg navbar-dark p-0" id="navbar">
          <div className="container px-sm-0">
            <a className="navbar-brand d-inline-block w-lg-64" href="/">
              <img src="/logo-1.png" className="h-rem-10" alt="Logo" /> <span className="mx-1">Web4 Apps</span>
            </a>

            <div className={`collapse navbar-collapse`} id="navbarCollapse">
              <ul className="navbar-nav gap-2 mx-lg-auto" />

              <div className="navbar-nav align-items-lg-center justify-content-end gap-2 ms-lg-4 w-lg-64">
                <a
                  className="sign-in-header nav-item nav-link rounded-pill d-none d-lg-block"
                  href="#"
                  onClick={e => { e.preventDefault() }}
                >
                  <appkit-button />
                </a>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  )
}
