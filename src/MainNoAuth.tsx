/**
 * Main component for unauthenticated users
 * Displays the landing page with Web4 Apps introduction
 * @returns {React.JSX.Element} The landing page component
 */
export function MainNoAuth(): React.JSX.Element {
  // const dispatch = useAppDispatch()

  return (
    <main>
      <div className="pt-32 pt-sm-56 pb-10 pb-lg-0 mt-n40 position-relative gradient-bottom-right start-indigo middle-purple end-yellow">
        <div className="container px-4">
          <div className="row align-items-center g-4 g-sm-10">
            <div className="col-lg-8">
              <h1 className="ls-tight fw-bolder display-3 text-white mb-3 mb-sm-5">Web4 Apps. Crypto meets AI.</h1>
              <p className="w-100 w-sm-75 lead text-white">
                Create apps using natural language. Interact with complex technologies effortlessly.
              </p>

              <div className="d-flex justify-content-center align-items-center mt-5">
                <appkit-button />
              </div>
            </div>
          </div>
          <div className="mt-10 d-none d-lg-block pb-5">{/*<img src="/preview-1.png" alt="Preview" />*/}</div>
        </div>
      </div>
    </main>
  )
}
