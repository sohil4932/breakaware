import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { ref, set, serverTimestamp, getDatabase } from 'firebase/database';


const db = getDatabase();


const OTPVerification = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { verifyOTP } = useAuth();

  useEffect(() => {
    // Redirect to login if no verification ID is present
    const verificationId = sessionStorage.getItem('verificationId');
    if (!verificationId) {
      navigate('/login');
    }
  }, [navigate]);

  const storeUserData = async (userId: string) => {
    const phoneNumber = sessionStorage.getItem('phoneNumber');
    if (!phoneNumber) return;

    const userRef = ref(db, `users/${userId}`);
    await set(userRef, {
      phoneNumber,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      
      const verificationId = sessionStorage.getItem('verificationId');
      if (!verificationId) {
        throw new Error('Verification ID not found');
      }

      const result = await verifyOTP(verificationId, otp);
      
      // Store user data after successful verification
      if (result.user) {
        await storeUserData(result.user.uid);
      }

      // Clear session storage
      sessionStorage.removeItem('verificationId');
      sessionStorage.removeItem('phoneNumber');

      // Navigate to dashboard
      navigate('/');
    } catch (error: any) {
      console.error('OTP verification error:', error);
      setError(error.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-4 p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center">Verify OTP</h2>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Enter OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setOtp(value);
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              pattern="[0-9]{6}"
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default OTPVerification;