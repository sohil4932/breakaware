import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Button } from '../../components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { db, dbRefs } from '../../config/firebase'
import { ref, push, set } from 'firebase/database'
import { useAuth } from '../../context/AuthContext'

interface SensorData {
  time: number;
  temperature: number;
}

interface SessionData {
  userId: string;
  startTime: number;
  endTime: number | null;
  temperatureArray: number[];
  avgBreathIn: number;
  avgBreathOut: number;
  cycleCount: number;
}

// Utility functions for breathing analysis
const findPeaks = (values: number[]) => {
  const peaks: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
      peaks.push(i);
    }
  }
  return peaks;
};

const findTroughs = (values: number[]) => {
  const troughs: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] < values[i - 1] && values[i] < values[i + 1]) {
      troughs.push(i);
    }
  }
  return troughs;
};

const analyzeBreathingRealTime = (temperatureValues: number[]) => {
  // Find peaks and troughs
  const peaks = findPeaks(temperatureValues);
  const troughs = findTroughs(temperatureValues);

  // Combine and sort events
  const events = [...peaks, ...troughs].sort((a, b) => a - b);

  let inhaleTimes: number[] = [];
  let exhaleTimes: number[] = [];
  let totalCycles = 0;

  for (let i = 1; i < events.length - 1; i++) {
    if (peaks.includes(events[i]) && troughs.includes(events[i + 1])) {
      const exhaleTime = events[i + 1] - events[i];
      const inhaleTime = events[i] - events[i - 1];

      inhaleTimes.push(inhaleTime);
      exhaleTimes.push(exhaleTime);
      totalCycles++;
    }
  }

  if (totalCycles >= 3) {
    const avgInhaleTime = inhaleTimes.reduce((a, b) => a + b, 0) / inhaleTimes.length / 1000;
    const avgExhaleTime = exhaleTimes.reduce((a, b) => a + b, 0) / exhaleTimes.length / 1000;

    return {
      avgBreathIn: avgInhaleTime.toFixed(2),
      avgBreathOut: avgExhaleTime.toFixed(2),
      cycleCount: totalCycles
    };
  }

  return null;
};

const Dashboard = () => {
  const { currentUser } = useAuth()
  const [status, setStatus] = useState<string>('')
  const [currentData, setCurrentData] = useState({
    temperature: 'N/A',
    avgBreathIn: '0.0',
    avgBreathOut: '0.0',
    cycleCount: '0'
  })
  const [sensorData, setSensorData] = useState<SensorData[]>([]) // For display
  const [allTemperatures, setAllTemperatures] = useState<SensorData[]>([]) // For storage
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [chartStartTime, setChartStartTime] = useState<number | null>(null)
  const deviceRef = useRef<any>(null)
  const characteristicRef = useRef<any>(null)
  
  // Add refs for breath calculations
  const lastTemperature = useRef<number | null>(null);
  const breathDirection = useRef<'in' | 'out' | null>(null);
  const breathStartTime = useRef<number | null>(null);
  const breathInTimes = useRef<number[]>([]);
  const breathOutTimes = useRef<number[]>([]);
  const cycleCount = useRef<number>(0);
  const temperatureThreshold = 0.05; // Adjust this value based on your sensor's sensitivity
  const sessionStartTime = useRef<number | null>(null);
  const sessionData = useRef<SessionData | null>(null);


  const getTimeDisplay = (timestamp: number) => {
    if (!chartStartTime) return '0s';
    const seconds = Math.floor((timestamp - chartStartTime) / 1000);
    return `${seconds}s`;
  };

  const calculateBreathing = (temperature: number) => {
    if (lastTemperature.current === null) {
      lastTemperature.current = temperature;
      breathStartTime.current = Date.now();
      return;
    }

    const now = Date.now();
    const tempDiff = temperature - lastTemperature.current;

    // Detect breath direction changes
    if (Math.abs(tempDiff) >= temperatureThreshold) {
      if (tempDiff > 0 && breathDirection.current !== 'in') {
        // Starting to breathe in
        if (breathDirection.current === 'out' && breathStartTime.current) {
          // Complete out breath, calculate duration
          const duration = now - breathStartTime.current;
          breathOutTimes.current.push(duration);

          // Update cycle count when completing an out breath
          cycleCount.current += 1;
          setCurrentData(prev => ({
            ...prev,
            cycleCount: cycleCount.current.toString()
          }));
        }
        breathDirection.current = 'in';
        breathStartTime.current = now;
      } else if (tempDiff < 0 && breathDirection.current !== 'out') {
        // Starting to breathe out
        if (breathDirection.current === 'in' && breathStartTime.current) {
          // Complete in breath, calculate duration
          const duration = now - breathStartTime.current;
          breathInTimes.current.push(duration);
        }
        breathDirection.current = 'out';
        breathStartTime.current = now;
      }

      // Calculate and update averages
      if (breathInTimes.current.length > 0) {
        const avgIn = breathInTimes.current.reduce((a, b) => a + b, 0) / breathInTimes.current.length / 1000;
        setCurrentData(prev => ({
          ...prev,
          avgBreathIn: avgIn.toFixed(1)
        }));
      }

      if (breathOutTimes.current.length > 0) {
        const avgOut = breathOutTimes.current.reduce((a, b) => a + b, 0) / breathOutTimes.current.length / 1000;
        setCurrentData(prev => ({
          ...prev,
          avgBreathOut: avgOut.toFixed(1)
        }));
      }

      // Update last temperature
      lastTemperature.current = temperature;
    }
  };

  const handleTemperatureChange = (event: any) => {
    const value = event.target.value.getInt32(0, true);
    const temperature = (value / 100).toFixed(2);
    const timestamp = Date.now();
    const parsedTemp = parseFloat(temperature);
    
    // Update current temperature display
    setCurrentData(prev => ({ ...prev, temperature }));
    
    // Create new temperature data point
    const newDataPoint = {
      time: timestamp,
      temperature: parsedTemp
    };
    
    // Update sensor data and analyze breathing
    setSensorData(prev => {
      const newData = [...prev, newDataPoint];
      // Keep only last 50 points
      const updatedData = newData.length > 50 ? newData.slice(-50) : newData;
      
      // Analyze breathing patterns if we have enough data points
      if (updatedData.length > 10) {
        const tempValues = updatedData.map(d => d.temperature);
        const metrics = analyzeBreathingRealTime(tempValues);
        
        if (metrics) {
          setCurrentData(prev => ({
            ...prev,
            avgBreathIn: metrics.avgBreathIn,
            avgBreathOut: metrics.avgBreathOut,
            cycleCount: metrics.cycleCount.toString()
          }));

          // If session is active, update the session data
          if (isSessionActive && sessionData.current) {
            const updatedSessionData: SessionData = {
              userId: sessionData.current.userId,
              startTime: sessionData.current.startTime,
              endTime: sessionData.current.endTime,
              temperatureArray: [...sessionData.current.temperatureArray, parsedTemp],
              avgBreathIn: parseFloat(metrics.avgBreathIn),
              avgBreathOut: parseFloat(metrics.avgBreathOut),
              cycleCount: metrics.cycleCount
            };
            sessionData.current = updatedSessionData;
          }
        }
      }
      
      return updatedData;
    });
    
    // Update all temperatures array for storage
    setAllTemperatures(prev => [...prev, newDataPoint]);
    
    // Calculate breathing metrics
    calculateBreathing(parsedTemp);
    
    // Update Firebase
    updateSessionData();
  };

  const updateSessionData = async () => {
    if (!sessionId || !currentUser || !isSessionActive) return;

    try {
      const sessionRef = ref(db, `sessions/${sessionId}`);
      // Use allTemperatures array for storing complete data
      const allTemps = allTemperatures.map(d => Number(d.temperature));
      
      // Create complete session data object
      const updatedSessionData = {
        userId: currentUser.uid,
        startTime: sessionStartTime.current,
        endTime: null,
        temperatureArray: allTemps, // Store all temperatures
        avgBreathIn: Number(currentData.avgBreathIn) || 0,
        avgBreathOut: Number(currentData.avgBreathOut) || 0,
        cycleCount: Number(currentData.cycleCount) || 0
      };

      // Update Firebase with complete session data
      await set(sessionRef, updatedSessionData);
      

    } catch (error) {
      console.error('Error updating session data:', error);
    }
  };

  const startNewSession = async () => {
    if (!currentUser) return;

    // Reset all tracking variables
    lastTemperature.current = null;
    breathDirection.current = null;
    breathStartTime.current = null;
    breathInTimes.current = [];
    breathOutTimes.current = [];
    cycleCount.current = 0;
    setSensorData([]); // Clear display data
    setAllTemperatures([]); // Clear storage data
    setCurrentData({
      temperature: 'N/A',
      avgBreathIn: '0.0',
      avgBreathOut: '0.0',
      cycleCount: '0'
    });
    
    const startTime = Date.now();
    sessionStartTime.current = startTime;
    setChartStartTime(startTime);

    try {
      const newSessionRef = push(dbRefs.sessions);
      const sessionData: SessionData = {
        userId: currentUser.uid,
        startTime: startTime,
        endTime: null,
        temperatureArray: [],
        avgBreathIn: 0,
        avgBreathOut: 0,
        cycleCount: 0
      };

      await set(newSessionRef, sessionData);
      setSessionId(newSessionRef.key);
      setIsSessionActive(true);
      setStatus('Session started');
      
     
    } catch (error) {
      console.error('Error starting session:', error);
      setStatus('Error starting session');
    }
  };

  const stopSession = async () => {
    if (!sessionId || !currentUser) return;

    try {
      const sessionRef = ref(db, `sessions/${sessionId}`);
      const finalSessionData = {
        userId: currentUser.uid,
        startTime: sessionStartTime.current,
        endTime: Date.now(),
        temperatureArray: allTemperatures.map(d => Number(d.temperature)), // Save all collected temperatures
        avgBreathIn: Number(currentData.avgBreathIn) || 0,
        avgBreathOut: Number(currentData.avgBreathOut) || 0,
        cycleCount: Number(currentData.cycleCount) || 0
      };

      await set(sessionRef, finalSessionData);
      console.log('Session ended. Total temperatures saved:', allTemperatures.length);
      
      setIsSessionActive(false);
      setSessionId(null);
      setStatus('Session stopped');
      setChartStartTime(null);
    } catch (error) {
      console.error('Error stopping session:', error);
      setStatus('Error stopping session');
    }
  };

  const handleConnect = async () => {
    try {
      setStatus('Requesting Bluetooth Device...');
      
      if (!navigator?.bluetooth) {
        throw new Error('Web Bluetooth API is not supported by this browser.');
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['0000181a-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['0000181a-0000-1000-8000-00805f9b34fb']
      });

      deviceRef.current = device;
      device.addEventListener('gattserverdisconnected', handleDisconnect);

      setStatus('Connecting to GATT Server...');
      const server = await device.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      setStatus('Getting Primary Service...');
      const service = await server.getPrimaryService('0000181a-0000-1000-8000-00805f9b34fb');

      setStatus('Getting Characteristics...');
      const temperatureCharacteristic = await service.getCharacteristic('00002a6e-0000-1000-8000-00805f9b34fb');
      characteristicRef.current = temperatureCharacteristic;

      setIsConnected(true);
      setStatus('Device connected. Click Start to begin session.');

    } catch (error: any) {
      console.error('Failed to connect:', error);
      setStatus('Failed to connect: ' + error.message);
    }
  };

  const handleDisconnect = async () => {
    if (isSessionActive) {
      await stopSession();
    }
    
    if (deviceRef.current?.gatt?.connected) {
      await deviceRef.current.gatt.disconnect();
    }
    
    deviceRef.current = null;
    characteristicRef.current = null;
    setIsConnected(false);
    setStatus('Device disconnected');
  };

  const startDataCollection = async () => {
    if (!characteristicRef.current) return;

    await startNewSession();
    characteristicRef.current.startNotifications();
    characteristicRef.current.addEventListener('characteristicvaluechanged', handleTemperatureChange);
  };

  const stopDataCollection = async () => {
    if (!characteristicRef.current) return;

    try {
      characteristicRef.current.stopNotifications();
      characteristicRef.current.removeEventListener('characteristicvaluechanged', handleTemperatureChange);
      await stopSession();
      
      // Clear the chart data after stopping
      setSensorData([]);
    } catch (error) {
      console.error('Error stopping data collection:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (deviceRef.current?.gatt?.connected) {
        handleDisconnect();
      }
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Connection Status and Buttons */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-start md:items-center flex-col md:flex-row w-full">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Device Connection</h3>
              <p className="text-sm text-gray-500">{status || 'Not connected'}</p>
            </div>
            <div className="space-x-4 mt-4  md:mt-0">
              {!isConnected && (
                <Button onClick={handleConnect} size={'sm'}>
                  Connect Device
                </Button>
              )}
              {isConnected && !isSessionActive && (
                <Button onClick={startDataCollection} className="bg-green-600 hover:bg-green-700">
                  Start Session
                </Button>
              )}
              {isConnected && isSessionActive && (
                <Button onClick={stopDataCollection} className="bg-yellow-600 hover:bg-yellow-700">
                  Stop Session
                </Button>
              )}
              {isConnected && (
                <Button onClick={handleDisconnect} className="bg-red-600 hover:bg-red-700">
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Current Readings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900">Temperature</h3>
            <p className="text-3xl font-bold mt-2">{currentData.temperature}°C</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900">Average Breath</h3>
            <p className="text-2xl font-bold mt-2">
              In: {currentData.avgBreathIn}s
              <br />
              Out: {currentData.avgBreathOut}s
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900">Cycle Count</h3>
            <p className="text-3xl font-bold mt-2">{currentData.cycleCount}</p>
          </div>
        </div>

        {/* Temperature Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Temperature Over Time</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sensorData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => getTimeDisplay(value)}
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={(value) => `${value}°C`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}°C`, 'Temperature']}
                  labelFormatter={(label) => getTimeDisplay(label)}
                />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#2563eb"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
