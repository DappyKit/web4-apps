export function FooterLogged(): React.JSX.Element {
  return (
    <footer className="px-3 px-md-4">
      <hr className="w-100 my-3 my-md-4" />
      <div className="container-fluid px-0">
        <div className="row mb-3 mb-md-4">
          <div className="col">
            <ul className="nav">
              <li className="nav-item">
                <a
                  target="_blank"
                  href="https://twitter.com/DappyKit"
                  className="nav-link text-lg text-muted text-primary-hover"
                  rel="noreferrer"
                >
                  <i className="bi bi-twitter-x"></i>
                </a>
              </li>
              <li className="nav-item">
                <a
                  target="_blank"
                  href="https://warpcast.com/DappyKit"
                  className="nav-link text-lg text-muted text-primary-hover"
                  rel="noreferrer"
                >
                  <i className="bi bi-eye"></i>
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-12">
            <p className="text-sm text-muted mb-2 mb-md-0">&copy; Copyright 2025 DappyKit</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
