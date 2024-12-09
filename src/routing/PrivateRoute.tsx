import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

interface PrivateRouteProps {
  children: React.ReactNode
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { currentUser, loading } = useAuth()
  
  if (loading) {
    return <div>Loading...</div>
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

export default PrivateRoute
