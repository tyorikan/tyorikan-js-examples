"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CloudSQLConfig } from "@/services/cloud-sql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";

interface TestResult {
  directVpc: {
    p99: number;
    p95: number;
    p50: number;
    throughputValue: number;
    throughputUnit: string;
	qps: number;
  };
  managedConnectionPooling: {
    p99: number;
    p95: number;
    p50: number;
    throughputValue: number;
    throughputUnit: string;
	qps: number;
  };
}

interface ChartData {
  name: string;
  directVpc: number;
  managedConnectionPooling: number;
  p99?: number;
  p95?: number;
  p50?: number;
}

type ChartDataSet = ChartData[];

interface PerformanceChartProps {
  data: ChartDataSet;
  title: string;
  description: string;
  dataKey: string;
  name: string;
  unit: string;
}

// Helper function to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
};

// Custom tooltip component
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip bg-white p-2 border border-gray-300 rounded-md">
        <p className="label">{`${label}`}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${formatNumber(entry.value)}`}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

// Custom YAxis tick component
const CustomYAxisTick: React.FC<any> = ({ x, y, payload }) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="end" fill="#666">
        {formatNumber(payload.value)}
      </text>
    </g>
  );
};

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  title,
  description,
  dataKey,
  name,
  unit,
}) => (
  <Card className="mb-5">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis unit={unit} tick={<CustomYAxisTick />} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="directVpc"
            barSize={15}
            name="Direct VPC"
            fill="hsl(var(--primary))"
          />
          <Bar
            dataKey="managedConnectionPooling"
            barSize={15}
            name="Managed Connection Pooling"
            fill="hsl(var(--accent))"
          />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default function Home() {
  const [directVpcConfig, setDirectVpcConfig] = useState<CloudSQLConfig>({
    connectionType: "directVpc",
    instanceConnectionName: "",
    dbUser: "",
    dbName: "",
  });
  const [managedConnectionPoolingConfig, setManagedConnectionPoolingConfig] =
    useState<CloudSQLConfig>({
      connectionType: "managedConnectionPooling",
      instanceConnectionName: "",
      dbUser: "",
      dbName: "",
    });
  const [query, setQuery] = useState("SELECT 1;");
	const [numQueries, setNumQueries] = useState(10000);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [executionTimeData, setExecutionTimeData] = useState<ChartDataSet>([]);
  const [qpsData, setQpsData] = useState<ChartDataSet>([]);
  const [throughputData, setThroughputData] = useState<ChartDataSet>([]);

  const handleConfigChange = (
    configType: "directVpc" | "managedConnectionPooling" | "numQueries",
    field: keyof CloudSQLConfig | "numQueries",
    value: string,
  ) => {
    if (configType === "directVpc") {
      setDirectVpcConfig((prev) => ({ ...prev, [field]: value }));
    } else if (configType === "managedConnectionPooling") {
      setManagedConnectionPoolingConfig((prev) => ({
        ...prev,
        [field]: value,
      }));
    } else if (configType === "numQueries") {
      setNumQueries(Number(value));
    }
  };

  const runTest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/db-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          directVpcConfig,
          managedConnectionPoolingConfig,
          query,
					numQueries,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch data");
      }

      const data: TestResult = await response.json();
      setTestResult(data);
      toast({
        title: "Test Completed",
        description: "Performance test finished. Results are displayed below.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Test failed: ${error.message}`,
      });
      console.error("Error running test:", error);
      setTestResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (testResult) {
      setExecutionTimeData([
        {
          name: "99th Percentile",
          directVpc: testResult.directVpc.p99,
          managedConnectionPooling: testResult.managedConnectionPooling.p99,
        },
        {
          name: "95th Percentile",
          directVpc: testResult.directVpc.p95,
          managedConnectionPooling: testResult.managedConnectionPooling.p95,
        },
        {
          name: "50th Percentile",
          directVpc: testResult.directVpc.p50,
          managedConnectionPooling: testResult.managedConnectionPooling.p50,
        },
      ]);
      setQpsData([
        {
          name: "Queries Per Second",
          directVpc: testResult.directVpc.qps,
          managedConnectionPooling: testResult.managedConnectionPooling.qps,
        },
      ]);
      setThroughputData([
        {
          name: "Throughput",
          directVpc: testResult.directVpc.throughputValue,
          managedConnectionPooling: testResult.managedConnectionPooling.throughputValue,
        },
      ]);
    }
  }, [testResult]);

  const isDataReady = testResult !== null;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-5 text-center">
        SQL Performance Tester
      </h1>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="connection">
          <AccordionTrigger>Connection Configuration</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Direct VPC Connection</CardTitle>
                  <CardDescription>
                    Configure parameters for direct VPC connection.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="direct-vpc-instance">
                        Instance Connection Name
                      </Label>
                      <Input
                        id="direct-vpc-instance"
                        value={directVpcConfig.instanceConnectionName}
                        onChange={(e) =>
                          handleConfigChange(
                            "directVpc",
                            "instanceConnectionName",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="direct-vpc-user">DB User</Label>
                      <Input
                        id="direct-vpc-user"
                        value={directVpcConfig.dbUser}
                        onChange={(e) =>
                          handleConfigChange(
                            "directVpc",
                            "dbUser",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="direct-vpc-db">DB Name</Label>
                      <Input
                        id="direct-vpc-db"
                        value={directVpcConfig.dbName}
                        onChange={(e) =>
                          handleConfigChange(
                            "directVpc",
                            "dbName",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Managed Connection Pooling</CardTitle>
                  <CardDescription>
                    Configure parameters for managed connection pooling.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="managed-pooling-instance">
                        Instance Connection Name
                      </Label>
                      <Input
                        id="managed-pooling-instance"
                        value={
                          managedConnectionPoolingConfig.instanceConnectionName
                        }
                        onChange={(e) =>
                          handleConfigChange(
                            "managedConnectionPooling",
                            "instanceConnectionName",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="managed-pooling-user">DB User</Label>
                      <Input
                        id="managed-pooling-user"
                        value={managedConnectionPoolingConfig.dbUser}
                        onChange={(e) =>
                          handleConfigChange(
                            "managedConnectionPooling",
                            "dbUser",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="managed-pooling-db">DB Name</Label>
                      <Input
                        id="managed-pooling-db"
                        value={managedConnectionPoolingConfig.dbName}
                        onChange={(e) =>
                          handleConfigChange(
                            "managedConnectionPooling",
                            "dbName",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

			<div className="mb-6">
				<Label htmlFor="num-queries">Number of Queries</Label>
				<Input
					id="num-queries"
					type="number"
					className="w-full"
					value={numQueries}
					onChange={(e) => handleConfigChange("numQueries", "numQueries", e.target.value)}
				/>
			</div>

      <div className="mb-6">
        <Label htmlFor="query">SQL Query</Label>
        <Input
          id="query"
          className="w-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Button onClick={runTest} disabled={isLoading}>
        {isLoading ? "Running Test..." : "Run Test"}
      </Button>

      {isDataReady ? (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-5 text-center">Results</h2>

          {/* Execution Time Chart */}
          <PerformanceChart
            data={executionTimeData}
            title="Execution Time Comparison"
            description="Visual comparison of execution time percentiles between Direct VPC and Managed Connection Pooling."
            dataKey="name"
            name="Latency"
            unit="ms"
          />

          {/* Queries Per Second Chart */}
          <PerformanceChart
            data={qpsData}
            title="Queries Per Second (QPS) Comparison"
            description="Visual comparison of queries per second between Direct VPC and Managed Connection Pooling."
            dataKey="name"
            name="Throughput"
            unit="QPS"
          />

          {/* Throughput Chart */}
          <PerformanceChart
            data={throughputData}
            title="Throughput Comparison"
            description="Visual comparison of throughput between Direct VPC and Managed Connection Pooling."
            dataKey="name"
            name="Throughput"
            unit={testResult.directVpc.throughputUnit}
          />

          {/* Consolidated Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Direct VPC</TableHead>
                <TableHead>Managed Connection Pooling</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">50th Percentile Latency (ms)</TableCell>
                <TableCell>{testResult.directVpc.p50.toFixed(2)}</TableCell>
                <TableCell>{testResult.managedConnectionPooling.p50.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">95th Percentile Latency (ms)</TableCell>
                <TableCell>{testResult.directVpc.p95.toFixed(2)}</TableCell>
                <TableCell>{testResult.managedConnectionPooling.p95.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">99th Percentile Latency (ms)</TableCell>
                <TableCell>{testResult.directVpc.p99.toFixed(2)}</TableCell>
                <TableCell>{testResult.managedConnectionPooling.p99.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Queries Per Second (QPS)</TableCell>
                <TableCell>{testResult.directVpc.qps.toFixed(2)}</TableCell>
                <TableCell>{testResult.managedConnectionPooling.qps.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Throughput ({testResult.directVpc.throughputUnit})</TableCell>
                <TableCell>{testResult.directVpc.throughputValue.toFixed(2)}</TableCell>
                <TableCell>{testResult.managedConnectionPooling.throughputValue.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        !isLoading && (
          <p className="mt-5 text-center text-muted-foreground">
            No results yet. Run a test to see performance metrics.
          </p>
        )
      )}
    </div>
  );
}
