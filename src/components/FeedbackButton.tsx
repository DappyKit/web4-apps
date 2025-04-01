import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { FeedbackModal } from './FeedbackModal'

/**
 * Button component that opens a feedback modal
 * @returns React component
 */
export function FeedbackButton(): React.JSX.Element {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setShowModal(true)
        }}
        className="feedback-button"
        aria-label="Provide feedback"
        style={{
          background: '#7c3aed',
          borderColor: '#7c3aed',
        }}
      >
        <i className="bi bi-chat-quote"></i>
      </Button>

      <FeedbackModal
        show={showModal}
        onHide={() => {
          setShowModal(false)
        }}
      />

      <style>{`
        .feedback-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1030;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          opacity: 1;
          color: white;
        }
        
        .feedback-button i {
          font-size: 1.2rem;
          line-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          margin: 0;
          padding: 0;
        }

        @media (max-width: 768px) {
          .feedback-button {
            bottom: 15px;
            right: 15px;
            width: 45px;
            height: 45px;
          }
          
          .feedback-button i {
            font-size: 1rem;
          }
        }
      `}</style>
    </>
  )
}
