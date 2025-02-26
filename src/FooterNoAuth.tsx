export function FooterNoAuth(): React.JSX.Element {
  return (
    <footer className="pt-24 pb-10">
      <div className="container mw-screen-xl">
        <div className="row mt-5 mb-7">
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
          <div className="col-auto">
            <p className="text-sm text-muted">&copy; Copyright 2025 DappyKit</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
