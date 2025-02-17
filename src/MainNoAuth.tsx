export function MainNoAuth() {
  // const dispatch = useAppDispatch()

  return (
    <main>
      <div className="pt-56 pb-10 pt-lg-56 pb-lg-0 mt-n40 position-relative gradient-bottom-right start-indigo middle-purple end-yellow">
        <div className="container">
          <div className="row align-items-center g-10">
            <div className="col-lg-8">
              <h1 className="ls-tight fw-bolder display-3 text-white mb-5">
                Web4 Apps. Crypto meets AI.
              </h1>
              <p className="w-xl-75 lead text-white">
                Create apps using natural language. Interact with complex technologies effortlessly.
              </p>

              <div className="d-block d-md-none d-flex justify-content-center align-items-center mt-5">
                {/*<SignInButton onSuccess={(res: StatusAPIResponse) => onLogin(dispatch, res)} />*/}
              </div>
            </div>
          </div>
          <div className="mt-10 d-none d-lg-block pb-5">
            <img src="/preview-1.png" alt="Preview" />
          </div>
        </div>
      </div>
    </main>
  )
}
