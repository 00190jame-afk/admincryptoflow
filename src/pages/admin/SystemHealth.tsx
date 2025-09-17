import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Server, 
  Database, 
  Wifi, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'maintenance';
  uptime: string;
  responseTime: number;
  lastCheck: string;
}

const SystemHealth = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      // Mock system metrics - in real implementation, fetch from monitoring API
      const mockMetrics: SystemMetric[] = [
        { name: 'CPU Usage', value: 65, unit: '%', status: 'healthy', trend: 'stable' },
        { name: 'Memory Usage', value: 78, unit: '%', status: 'warning', trend: 'up' },
        { name: 'Disk Usage', value: 45, unit: '%', status: 'healthy', trend: 'stable' },
        { name: 'Network I/O', value: 23, unit: 'MB/s', status: 'healthy', trend: 'down' },
        { name: 'Database Connections', value: 82, unit: '', status: 'healthy', trend: 'stable' },
        { name: 'Active Sessions', value: 156, unit: '', status: 'healthy', trend: 'up' },
      ];

      const mockServices: ServiceStatus[] = [
        {
          name: 'Web Application',
          status: 'online',
          uptime: '99.9%',
          responseTime: 245,
          lastCheck: new Date().toISOString(),
        },
        {
          name: 'Database',
          status: 'online',
          uptime: '99.8%',
          responseTime: 12,
          lastCheck: new Date().toISOString(),
        },
        {
          name: 'Authentication Service',
          status: 'online',
          uptime: '100%',
          responseTime: 89,
          lastCheck: new Date().toISOString(),
        },
        {
          name: 'File Storage',
          status: 'online',
          uptime: '99.7%',
          responseTime: 156,
          lastCheck: new Date().toISOString(),
        },
        {
          name: 'Email Service',
          status: 'online',
          uptime: '99.5%',
          responseTime: 342,
          lastCheck: new Date().toISOString(),
        },
      ];

      setMetrics(mockMetrics);
      setServices(mockServices);
    } catch (error) {
      console.error('Error fetching system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
      case 'offline':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
      case 'maintenance':
        return <AlertCircle className="h-4 w-4" />;
      case 'critical':
      case 'offline':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />;
      default:
        return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  const getMetricIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'cpu usage':
        return <Cpu className="h-4 w-4" />;
      case 'memory usage':
        return <MemoryStick className="h-4 w-4" />;
      case 'disk usage':
        return <HardDrive className="h-4 w-4" />;
      case 'network i/o':
        return <Wifi className="h-4 w-4" />;
      case 'database connections':
        return <Database className="h-4 w-4" />;
      default:
        return <Server className="h-4 w-4" />;
    }
  };

  const overallHealth = metrics.every(m => m.status === 'healthy') ? 'healthy' : 
                       metrics.some(m => m.status === 'critical') ? 'critical' : 'warning';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Health</h1>
        <p className="text-muted-foreground">
          Monitor system performance, resource usage, and service availability
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
            {getStatusIcon(overallHealth)}
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(overallHealth)}>
                {overallHealth.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Online</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {services.filter(s => s.status === 'online').length}/{services.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(services.reduce((acc, s) => acc + s.responseTime, 0) / services.length)}ms
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">99.8%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="services">Service Status</TabsTrigger>
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => (
              <Card key={metric.name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {getMetricIcon(metric.name)}
                    {getTrendIcon(metric.trend)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {metric.value}{metric.unit}
                      </span>
                      <Badge className={getStatusColor(metric.status)}>
                        {metric.status}
                      </Badge>
                    </div>
                    <Progress 
                      value={metric.unit === '%' ? metric.value : (metric.value / 100) * 100} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4">
            {services.map((service) => (
              <Card key={service.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(service.status)}
                      <Badge className={getStatusColor(service.status)}>
                        {service.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Uptime</span>
                      <p className="font-semibold">{service.uptime}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Response Time</span>
                      <p className="font-semibold">{service.responseTime}ms</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Check</span>
                      <p className="font-semibold">
                        {new Date(service.lastCheck).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>
                Historical performance data and trends analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Performance charts and trend analysis will be displayed here.
                <br />
                <span className="text-sm">Historical data visualization coming soon.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemHealth;