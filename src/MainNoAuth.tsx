import React from 'react'
import { Link } from 'react-router-dom'
import { Accordion } from 'react-bootstrap'

/**
 * Main component for unauthenticated users
 * Displays the landing page with Web4 Apps introduction and hackathon information
 * @returns {React.JSX.Element} The landing page component
 */
export function MainNoAuth(): React.JSX.Element {
  // const dispatch = useAppDispatch()

  return (
    <main>
      {/* Hero Section */}
      <div className="pt-40 pt-sm-56 pb-10 pb-lg-0 mt-n40 position-relative gradient-bottom-right start-indigo middle-purple end-yellow">
        <div className="container px-4">
          <div className="row align-items-center g-4 g-sm-10">
            <div className="col-lg-8">
              <h1 className="ls-tight fw-bolder display-3 text-white mb-3 mb-sm-5 pt-4 pt-sm-0">
                Web4 Apps. Crypto meets AI.
              </h1>
              <p className="w-100 w-sm-75 lead text-white">
                Create apps using natural language. Interact with complex technologies effortlessly.
              </p>

              <div className="d-lg-none d-flex justify-content-center align-items-center mt-5">
                <appkit-button />
              </div>
            </div>
          </div>
          <div className="mt-10 d-none d-lg-block pb-5">{/*<img src="/preview-1.png" alt="Preview" />*/}</div>
        </div>
      </div>

      {/* Hackathon Announcement Section */}
      <div className="py-8 py-lg-10 position-relative bg-dark-soft">
        <div className="container px-4">
          <div className="row justify-content-center text-center mb-6">
            <div className="col-lg-8">
              <h2 className="display-5 fw-bold mb-4">Web4 Developers Hackathon</h2>
              <p className="lead text-muted mb-0">
                Join our community of Web4 developers and build the future of decentralized applications
              </p>
            </div>
          </div>

          <div className="row mt-5 g-5">
            <div className="col-lg-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-5">
                  <div className="icon-circle mb-4 bg-primary-soft text-primary">
                    <i className="bi bi-calendar-event d-flex align-items-center justify-content-center"></i>
                  </div>
                  <h3 className="h4 mb-3">Key Dates</h3>
                  <ul className="list-unstyled mb-0">
                    <li className="d-flex align-items-center mb-3">
                      <i className="bi bi-check-circle-fill text-success me-2 d-flex align-items-center"></i>
                      <span>
                        <strong>Start:</strong> March 28, 2025
                      </span>
                    </li>
                    <li className="d-flex align-items-center mb-3">
                      <i className="bi bi-check-circle-fill text-success me-2 d-flex align-items-center"></i>
                      <span>
                        <strong>End:</strong> June 1, 2025
                      </span>
                    </li>
                    <li className="d-flex align-items-center">
                      <i className="bi bi-check-circle-fill text-success me-2 d-flex align-items-center"></i>
                      <span>
                        <strong>Results:</strong> By July 2025
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-5">
                  <div className="icon-circle mb-4 bg-warning-soft text-warning">
                    <i className="bi bi-trophy d-flex align-items-center justify-content-center"></i>
                  </div>
                  <h3 className="h4 mb-3">Template Creator Prizes</h3>
                  <ul className="list-unstyled mb-0">
                    <li className="d-flex align-items-center mb-3">
                      <div className="badge bg-primary me-2">1st</div>
                      <span>7,000 OP Tokens</span>
                    </li>
                    <li className="d-flex align-items-center">
                      <div className="badge bg-secondary me-2">2nd</div>
                      <span>3,000 OP Tokens</span>
                    </li>
                  </ul>
                  <div className="mt-4">
                    <p className="text-muted small mb-0">Create useful templates to qualify for the main prizes.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-5">
                  <div className="icon-circle mb-4 bg-success-soft text-success">
                    <i className="bi bi-code-slash d-flex align-items-center justify-content-center"></i>
                  </div>
                  <h3 className="h4 mb-3">App Creator Prizes</h3>
                  <ul className="list-unstyled mb-0">
                    <li className="d-flex align-items-center mb-3">
                      <i className="bi bi-star-fill text-warning me-2 d-flex align-items-center"></i>
                      <span>Top 200 creators: <strong>50 OP</strong> Tokens each</span>
                    </li>
                  </ul>
                  <div className="mt-4">
                    <p className="text-muted small mb-0">
                      The more apps you create, the higher your chance of winning!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row mt-6">
            <div className="col-12 text-center">
              <Link to="/top-creators" className="btn btn-lg btn-outline-primary rounded-pill ms-3">
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-8 py-lg-10">
        <div className="container px-4">
          <div className="row justify-content-center text-center mb-6">
            <div className="col-lg-8">
              <h2 className="display-5 fw-bold mb-4">How To Participate</h2>
              <p className="lead text-muted mb-0">Join our Web4 developers community and start building now</p>
            </div>
          </div>

          <div className="row mt-5 g-5">
            <div className="col-md-4">
              <div className="text-center">
                <div className="icon-circle icon-circle-lg bg-primary-soft text-primary mb-4">
                  <span className="h3 fw-bold">1</span>
                </div>
                <h3 className="h4 mb-3">Connect Your Wallet</h3>
                <p className="text-muted mb-0">
                  Sign in with your wallet to authenticate and participate in the hackathon.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="text-center">
                <div className="icon-circle icon-circle-lg bg-primary-soft text-primary mb-4">
                  <span className="h3 fw-bold">2</span>
                </div>
                <h3 className="h4 mb-3">Create Templates or Apps</h3>
                <p className="text-muted mb-0">
                  Develop useful templates or create multiple applications to increase your chances of winning.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="text-center">
                <div className="icon-circle icon-circle-lg bg-primary-soft text-primary mb-4">
                  <span className="h3 fw-bold">3</span>
                </div>
                <h3 className="h4 mb-3">Win OP Tokens</h3>
                <p className="text-muted mb-0">
                  The best templates and most prolific app creators will be rewarded with OP tokens.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-8 py-lg-10 bg-light">
        <div className="container px-4">
          <div className="row justify-content-center text-center mb-6">
            <div className="col-lg-8">
              <h2 className="display-5 fw-bold mb-4">Frequently Asked Questions</h2>
              <p className="lead text-muted mb-0">Everything you need to know about the Web4 Developers Hackathon</p>
            </div>
          </div>

          <div className="row mt-5">
            <div className="col-lg-8 mx-auto">
              <Accordion defaultActiveKey="0">
                <Accordion.Item eventKey="0">
                  <Accordion.Header>Who can participate in the hackathon?</Accordion.Header>
                  <Accordion.Body>
                    The hackathon is open to all Web4 developers. Whether you&apos;re experienced in blockchain
                    development or just getting started, you&apos;re welcome to join and compete for prizes.
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="1">
                  <Accordion.Header>How are winners selected?</Accordion.Header>
                  <Accordion.Body>
                    For template creators, winners are selected based on the usefulness, quality, and creativity of the
                    templates. For app creators, the more apps you create, the higher your chance of winning.
                  </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="2">
                  <Accordion.Header>When will prizes be distributed?</Accordion.Header>
                  <Accordion.Body>
                    Prizes will be distributed after the results are announced in July 2025. Winners will receive their
                    OP tokens directly to their registered wallet addresses.
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
