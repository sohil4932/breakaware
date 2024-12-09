import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';

const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signInWithPhone } = useAuth();

  const formatPhoneNumber = (number: string) => {
    // Remove any non-digit characters
    const cleaned = number.replace(/\D/g, '');
    
    // Add India country code (+91) if not present
    if (!cleaned.startsWith('91')) {
      return `+91${cleaned}`;
    }
    return `+${cleaned}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      const formattedNumber = formatPhoneNumber(phoneNumber);
      console.log('Formatted number:', formattedNumber); // For debugging
      
      const confirmationResult = await signInWithPhone(formattedNumber);
      sessionStorage.setItem('verificationId', confirmationResult.verificationId);
      sessionStorage.setItem('phoneNumber', formattedNumber); // Store phone number for later use
      
      navigate('/verify-otp');
    } catch (error: any) {
      setError('Failed to sign in: ' + error.message);
      console.error('Sign in error:', error); // For debugging
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-4 p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center">Login</h2>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">+91</span>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/\D/g, '');
                  setPhoneNumber(value);
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Enter your 10-digit number"
                maxLength={10}
                pattern="[0-9]{10}"
                required
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">Format: 10-digit number (e.g., 9876543210)</p>
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={loading || phoneNumber.length !== 10}
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </Button>
        </form>
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default Login;