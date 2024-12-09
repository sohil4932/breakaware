import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { publicRoutes, privateRoutes } from "./routing/routes"
import PrivateRoute from "./routing/PrivateRoute"
import { AuthProvider } from "./context/AuthContext"

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          {publicRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
          
          {/* Protected Routes */}
          {privateRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={
              <PrivateRoute>
                {route.element}
              </PrivateRoute>
            } />
          ))}
          
          {/* Redirect unknown routes to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App