export function MainLogged() {
  // const auth = useAppSelector(selectAuth)

  return (
    <main>
      <div className="pt-56 pb-10 pt-lg-56 pb-lg-0 mt-n40 mx-lg-auto w-lg-75">
        <div className="container">
          <button
            className="btn btn-primary btn-xs"
            onClick={() => {
              // setShowFramesModal(true)
            }}
          >
            <i className="bi bi-plus"></i> Add Frame
          </button>

          <button
            className="btn btn-outline-primary btn-xs mx-3"
            onClick={() => {
              // setShowKeysModal(true)
            }}
          >
            <i className="bi bi-key"></i> Add Key
          </button>

          <button
            className="btn btn-outline-primary btn-xs"
            onClick={() => {
              // setTopFramesModal(true)
            }}
          >
            <i className="bi"></i> Top Frames
          </button>

          <div className="mt-8">
            NOPE
          </div>
        </div>
      </div>
    </main>
  )
}
