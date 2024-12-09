import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { ref, get, remove } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Button } from "../../components/ui/button";
import {Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

interface SessionData {
  userId: string;
  startTime: number;
  endTime: number | null;
  temperatureArray: number[];
  avgBreathIn: number;
  avgBreathOut: number;
  cycleCount: number;
}

interface SessionWithId extends SessionData {
  id: string;
}

const SessionHistory = () => {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<SessionWithId[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionWithId | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSessions = async () => {
      if (!currentUser) return;

      const sessionsRef = ref(db, 'sessions');
      
      try {
        // Get all sessions and filter client-side
        const snapshot = await get(sessionsRef);
        if (snapshot.exists()) {
          const sessionsData: SessionWithId[] = [];
          snapshot.forEach((childSnapshot) => {
            const session = childSnapshot.val();
            // Only include sessions belonging to current user
            if (session.userId === currentUser.uid) {
              sessionsData.push({
                ...session,
                id: childSnapshot.key as string
              });
            }
          });
          // Sort sessions by start time, most recent first
          sessionsData.sort((a, b) => b.startTime - a.startTime);
          setSessions(sessionsData);
          
          // Select the most recent session by default
          if (sessionsData.length > 0) {
            setSelectedSession(sessionsData[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };

    fetchSessions();
  }, [currentUser]);

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (startTime: number, endTime: number | null) => {
    if (!endTime) return 'Ongoing';
    const duration = Math.floor((endTime - startTime) / 1000); // duration in seconds
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  const getTimeDisplay = (timestamp: number) => {
    if (!selectedSession) return '0s';
    const seconds = Math.floor((timestamp - selectedSession.startTime) / 1000);
    return `${seconds}s`;
  };

  const handleDeleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent session selection when clicking delete
    setDeletingSessionId(sessionId);
    
    try {
      const sessionRef = ref(db, `sessions/${sessionId}`);
      await remove(sessionRef);
      
      // Update local state
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      
      toast({
        title: "Success",
        description: "Session deleted successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingSessionId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-screen overflow-hidden">
        {/* Sessions List - Left Side */}
        <div className="w-1/3 h-full border-r border-gray-200 overflow-hidden flex flex-col">
          <h2 className="text-xl font-semibold mb-4 p-4">Session History</h2>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    selectedSession?.id === session.id
                      ? 'bg-blue-100 border-blue-500'
                      : 'bg-white hover:bg-gray-50'
                  } border relative`}
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">
                        Session {new Date(session.startTime).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Start: {formatDateTime(session.startTime)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Duration: {formatDuration(session.startTime, session.endTime)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Cycles: {session.cycleCount}
                      </div>
                     
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      disabled={deletingSessionId === session.id}
                      className="ml-2 shrink-0"
                    >
                      {deletingSessionId === session.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                         "Delete"
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Session Details - Right Side */}
        <div className="w-2/3 h-full overflow-y-auto p-4">
          {selectedSession ? (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">
                Session Details - {new Date(selectedSession.startTime).toLocaleDateString()}
              </h2>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-medium text-gray-900">Average Breath In</h3>
                  <p className="text-3xl font-bold mt-2">{selectedSession.avgBreathIn.toFixed(1)}s</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-medium text-gray-900">Average Breath Out</h3>
                  <p className="text-3xl font-bold mt-2">{selectedSession.avgBreathOut.toFixed(1)}s</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-medium text-gray-900">Cycle Count</h3>
                  <p className="text-3xl font-bold mt-2">{selectedSession.cycleCount}</p>
                </div>
              </div>

              {/* Temperature Chart */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Temperature Over Time</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={ selectedSession.temperatureArray.map((temp, index) => ({
                        time: selectedSession.startTime + (index * 1000), // Assuming 1 second intervals
                        temperature: temp
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={getTimeDisplay}
                        label={{ value: 'Time (seconds)', position: 'bottom' }}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => `${value}°C`}
                        label={{ value: 'Temperature (°C)', angle: -90, position: 'left' }}
                      />
                      <Tooltip
                        labelFormatter={(label) => getTimeDisplay(Number(label))}
                        formatter={(value: any) => [`${value}°C`, 'Temperature']}
                      />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Select a session to view details</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SessionHistory;
