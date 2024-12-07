import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/button'
import {
  ChevronLeft,
  ChevronRight,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Thermometer
} from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Failed to log out:', error)
    }
  }

  const menuItems = [
    {
      title: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      onClick: () => navigate('/'),
      path: '/'
    },
    {
      title: 'Session History',
      icon: <History className="h-5 w-5" />,
      onClick: () => navigate('/history'),
      path: '/history'
    },
    {
      title: 'Logout',
      icon: <LogOut className="h-5 w-5" />,
      onClick: handleLogout
    }
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar - Desktop */}
      <div
        className={`fixed top-0 left-0 h-full bg-white shadow-lg transition-all duration-300 hidden lg:block
          ${isSidebarOpen ? 'w-64' : 'w-20'}`}
      >
        <div className="p-4 flex items-center space-x-3">
          <Thermometer className="h-8 w-8 text-blue-600 space-x-3 flex-shrink-0" />
          {isSidebarOpen && (
            <h2 className="text-xl font-bold whitespace-nowrap">BreathAware</h2>
          )}
        </div>
        <nav className="mt-8">
          {menuItems.map((item, index) => (
            <button
              key={index}
              className={`w-full p-4 text-left hover:bg-gray-100 transition-colors flex items-center space-x-3
                ${isSidebarOpen ? 'justify-start ' : 'justify-center'} 
                 ${item.path && location.pathname === item.path
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-100'
                  }
                `}
              onClick={item.onClick}
            >
              {item.icon}
              {isSidebarOpen && <span>{item.title}</span>}
            </button>
          ))}

          
 
        </nav>
      </div>

      {/* Sidebar - Mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300
          ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div
          className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transition-transform duration-300
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 flex items-center space-x-2">
            <Thermometer className="h-8 w-8 text-blue-600" />
            <h2 className="text-xl font-bold">BreathAware</h2>
          </div>
          <nav className="mt-8">
            {menuItems.map((item) => (
              <button
                key={item.title}
                onClick={() => {
                  item.onClick()
                  setIsMobileMenuOpen(false)
                }}
                className={`flex items-center w-full px-4 py-2 text-gray-700 rounded-lg transition-colors
                   ${item.path && location.pathname === item.path
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-100'
                  }`}
              >
                <span className={`${item.path && location.pathname === item.path
                    ? 'text-blue-700'
                    : 'text-gray-500'
                  }`}>
                  {item.icon}
                </span>
                <span className="ml-3">{item.title}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`transition-all duration-300
          ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} 
          ${isSidebarOpen ? 'lg:w-[calc(100%-16rem)]' : 'lg:w-[calc(100%-5rem)]'}
          w-full`}
      >
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded hover:bg-gray-100 hidden lg:block"
            >
              {isSidebarOpen ?
                <ChevronLeft className="h-5 w-5" /> :
                <ChevronRight className="h-5 w-5" />
              }
            </button>
            <div className="text-right">
              <Button variant="outline" onClick={handleLogout} className="hidden lg:inline-flex">
                Logout
              </Button>
            </div>
          </div>
        </header>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
