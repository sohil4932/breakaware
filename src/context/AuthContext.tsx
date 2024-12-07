import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithPhone: (phoneNumber: string) => Promise<any>;
  verifyOTP: (verificationId: string, otp: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithPhone = async (phoneNumber: string) => {
    try {
      // Clear any existing reCAPTCHA
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (recaptchaContainer) {
        recaptchaContainer.innerHTML = '';
      }

      // Create new reCAPTCHA verifier
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: any) => {
          console.log('reCAPTCHA solved:', response);
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          const recaptchaContainer = document.getElementById('recaptcha-container');
          if (recaptchaContainer) {
            recaptchaContainer.innerHTML = '';
          }
        }
      });

      await recaptchaVerifier.render();
      console.log('reCAPTCHA rendered',auth,phoneNumber,recaptchaVerifier);
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      return confirmationResult;
    } catch (error: any) {
      console.log('Phone sign in error:', error);
      
      // Clear reCAPTCHA on error
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (recaptchaContainer) {
        recaptchaContainer.innerHTML = '';
      }

      // Handle specific error cases
      if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many login attempts. Please try again after some time or use a different phone number.');
      } else if (error.code === 'auth/invalid-phone-number') {
        throw new Error('Invalid phone number. Please enter a valid number.');
      } else if (error.code === 'auth/captcha-check-failed') {
        throw new Error('reCAPTCHA verification failed. Please try again.');
      }

      throw error;
    }
  };

  const verifyOTP = async (verificationId: string, otp: string) => {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      return signInWithCredential(auth, credential);
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    }
  };

  const logout = () => {
    return auth.signOut();
  };

  const value = {
    currentUser,
    loading,
    signInWithPhone,
    verifyOTP,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
