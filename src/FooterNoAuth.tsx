export function FooterNoAuth(): React.JSX.Element {
  return (
    <footer className="pt-16 pt-md-24 pb-6 pb-md-10">
      <div className="container mw-screen-xl px-3 px-md-4">
        <div className="row mt-3 mt-md-5 mb-4 mb-md-7">
          <div className="col">
            <ul className="nav mx-n4">
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
        <div className="row">
          <div className="col-12">
            <p className="text-sm text-muted mb-2 mb-md-0">&copy; Copyright 2025 DappyKit</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
