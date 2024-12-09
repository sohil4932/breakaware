import Login from "../module/auth/Login"
import Register from "../module/auth/Register"
import OTPVerification from "../module/auth/OtpVerification"
import Dashboard from "../module/dashboard/Dashboard"
import SessionHistory from "../module/sessions/SessionHistory"

export const publicRoutes = [
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/register",
    element: <Register />
  },
  {
    path: "/verify-otp",
    element: <OTPVerification />
  }
]

export const privateRoutes = [
  {
    path: "/",
    element: <Dashboard />
  },
  {
    path: "/history",
    element: <SessionHistory />
  }
]
