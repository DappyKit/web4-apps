export function FooterLogged(): React.JSX.Element {
  return (
    <footer className="px-md-4">
      <hr className="w-100 my-4"/>
      <div className="container-fluid px-0">
        <div className="row mb-4">
          <div className="col">
            <ul className="nav">
              <li className="nav-item">
                <a
                  target="_blank"
                  href="https://twitter.com/DappyKit"
                  className="nav-link text-lg text-muted text-primary-hover" rel="noreferrer"
                >
                  <i className="bi bi-twitter-x"></i>
                </a>
              </li>
              <li className="nav-item">
                <a
                  target="_blank"
                  href="https://warpcast.com/DappyKit"
                  className="nav-link text-lg text-muted text-primary-hover" rel="noreferrer"
                >
                  <i className="bi bi-eye"></i>
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-auto">
            <p className="text-sm text-muted mb-0">&copy; Copyright 2025 DappyKit</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
