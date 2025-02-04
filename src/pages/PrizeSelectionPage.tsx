import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti'; // Import Confetti
import './SelectionPage.css';
import emergencyKitImage from '../assets/emergencyKit.png';
import paperPadImage from '../assets/paper.png';

type LocationState = {
  selectedWaste?: string;
};

const PrizeSelectionPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedWaste = 'Unknown' }: LocationState = location.state || {};

  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<string>('');
  const [recordId, setRecordId] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(30);
  const [showConfetti, setShowConfetti] = useState<boolean>(false); // New state for confetti

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(1, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (loading) {
      setCountdown(80);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(timer);
    };
  }, [loading]);

  const handlePrizeSelection = async (selectedPrize: string): Promise<void> => {
    setLoading(true);
    setStatusMessage(
      selectedWaste === 'Plastic Bottles'
        ? 'Please Insert Bottle...'
        : 'Please Weigh the Paper...'
    );

    try {
      const response = await fetch('http://13.212.247.100/add_waste_prize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Waste: selectedWaste,
          Prize: selectedPrize,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecordId(data.id);
        pollSensorResponse(data.id);
      } else {
        const error = await response.json();
        setModalMessage(`Error: ${error.error}`);
        setShowModal(true);
        setLoading(false);
      }
    } catch (error) {
      setModalMessage('An unknown error occurred. Please try again.');
      setShowModal(true);
      setLoading(false);
    }
  };

  const pollSensorResponse = (recordId: number): void => {
    const timeout = 80000;
    const interval = 5000;
    const endTime = Date.now() + timeout;

    const checkResponse = async () => {
      try {
        const pollResponse = await fetch(
          `http://13.212.247.100/check_sensor_response/${recordId}`
        );
        const pollData = await pollResponse.json();

        if (pollResponse.ok && pollData.SensorResponse) {
          if (pollData.SensorResponse === 'verified') {
            await updateStatus(recordId, 'Complete');
            setLoading(false);
            setShowConfetti(true); // Trigger confetti
            setModalMessage('🎉🎉Congratulations!🎉🎉 \nYour prize has been successfully redeemed.');
            setShowModal(true);
          } else if (pollData.SensorResponse === 'cancelled') {
            await updateStatus(recordId, 'Failed');
            setLoading(false);
            setModalMessage('The process was cancelled. Please try again.');
            setShowModal(true);
          }
        } else if (Date.now() < endTime) {
          setTimeout(checkResponse, interval);
        } else {
          await updateStatus(recordId, 'Failed');
          setLoading(false);
          setModalMessage('No response received. Status set to "Failed".');
          setShowModal(true);
        }
      } catch (error) {
        setModalMessage('An error occurred while checking the sensor response.');
        setShowModal(true);
        setLoading(false);
      }
    };

    checkResponse();
  };

  const updateStatus = async (recordId: number, status: string): Promise<void> => {
    await fetch(`http://13.212.247.100/update_status/${recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Status: status }),
    });
  };

  const handleCancel = async (): Promise<void> => {
    if (recordId) {
      await updateStatus(recordId, 'Failed');
    }
    setLoading(false);
    navigate('/');
  };

  const closeModal = (): void => {
    setShowModal(false);
    setShowConfetti(false); // Stop confetti when modal is closed
    navigate('/');
  };

  return (
    <div className="selection-page">
      <h1 className="selection-title">Please Select Your Prize</h1>
      <p className="selection-subtitle">You selected: {selectedWaste}</p>

      {loading && (
        <div className="overlay">
          <div className="spinner"></div>
          <p>{statusMessage}</p>
          <p>Time Remaining: {formatTime(countdown)}</p>
          <button className="cancel-button" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Status</h2>
            <p>{modalMessage}</p>
            <button onClick={closeModal}>OK</button>
          </div>
        </div>
      )}

      {showConfetti && <Confetti />} {/* Add confetti here */}

      <div className="card-container">
        <div className="card" onClick={() => handlePrizeSelection('Emergency Kit')}>
          <img src={emergencyKitImage} alt="Emergency Kit" className="card-image" />
          <h2>Option 1</h2>
          <p>Emergency Kit</p>
        </div>
        <div className="card" onClick={() => handlePrizeSelection('Paper Pad')}>
          <img src={paperPadImage} alt="Paper Pad" className="card-image" />
          <h2>Option 2</h2>
          <p>Paper Pad</p>
        </div>
      </div>
    </div>
  );
};

export default PrizeSelectionPage;
