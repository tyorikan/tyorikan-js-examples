"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { executeSqlQuery, CloudSQLConfig, QueryResult } from "@/services/cloud-sql";
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
  TableCaption
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Chart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ResponsiveContainer
} from 'recharts';

interface TestResult {
  directVpc?: QueryResult;
  managedConnectionPooling?: QueryResult;
}

interface ChartData {
  name: string;
  directVpc: number;
  managedConnectionPooling: number;
}

interface PerformanceChartProps {
  data: ChartData[];
  title: string;
  description: string;
  dataKey: string;
  name: string;
  unit: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, title, description, dataKey, name, unit }) => (
  <Card className="mb-5">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>
        {description}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis unit={unit} />
          <Tooltip />
          <Legend />
          <Bar dataKey="directVpc" barSize={30} name="Direct VPC" fill="hsl(var(--primary))" />
          <Bar dataKey="managedConnectionPooling" barSize={30} name="Managed Connection Pooling" fill="hsl(var(--accent))" />
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
  const [managedConnectionPoolingConfig, setManagedConnectionPoolingConfig] = useState<CloudSQLConfig>({
    connectionType: "managedConnectionPooling",
    instanceConnectionName: "",
    dbUser: "",
    dbName: "",
  });
  const [query, setQuery] = useState("SELECT 1;");
  const [testResult, setTestResult] = useState<TestResult>({});
  const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

  const handleConfigChange = (
    configType: "directVpc" | "managedConnectionPooling",
    field: keyof CloudSQLConfig,
    value: string
  ) => {
    if (configType === "directVpc") {
      setDirectVpcConfig((prev) => ({ ...prev, [field]: value }));
    } else {
      setManagedConnectionPoolingConfig((prev) => ({ ...prev, [field]: value }));
    }
  };

  const runTest = async () => {
    setIsLoading(true);
    try {
      const directVpcResult = await executeSqlQuery(directVpcConfig, query);
      const managedConnectionPoolingResult = await executeSqlQuery(
        managedConnectionPoolingConfig,
        query
      );

      setTestResult({
        directVpc: directVpcResult,
        managedConnectionPooling: managedConnectionPoolingResult,
      });
        toast({
            title: "Test Completed",
            description: "Performance test finished. Results are displayed below.",
        })
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: `Test failed: ${error.message}`,
        });
      console.error("Error running test:", error);
      setTestResult({});
    } finally {
      setIsLoading(false);
    }
  };

  const executionTimeData: ChartData[] = [];
  const queriesPerSecondData: ChartData[] = [];
  const throughputData: ChartData[] = [];


  if (testResult.directVpc && testResult.managedConnectionPooling) {
    executionTimeData.push({
      name: "Execution Time",
      directVpc: testResult.directVpc.executionTimeMs,
      managedConnectionPooling: testResult.managedConnectionPooling.executionTimeMs,
    });

    queriesPerSecondData.push({
      name: "Queries Per Second",
      directVpc: 1000 / testResult.directVpc.executionTimeMs,
      managedConnectionPooling: 1000 / testResult.managedConnectionPooling.executionTimeMs,
    });

     throughputData.push({
            name: "Throughput",
            directVpc: testResult.directVpc.rowsReturned / (testResult.directVpc.executionTimeMs / 1000),
            managedConnectionPooling: testResult.managedConnectionPooling.rowsReturned / (testResult.managedConnectionPooling.executionTimeMs / 1000),
        });
  }

  const directVpcThroughput = testResult.directVpc ? (testResult.directVpc.rowsReturned / (testResult.directVpc.executionTimeMs / 1000)).toFixed(2) : "N/A";
  const managedConnectionPoolingThroughput = testResult.managedConnectionPooling ? (testResult.managedConnectionPooling.rowsReturned / (testResult.managedConnectionPooling.executionTimeMs / 1000)).toFixed(2) : "N/A";


  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-5 text-center">SQL Performance Tester</h1>

      <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="connection">
              <AccordionTrigger>Connection Configuration</AccordionTrigger>
              <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <Card>
                          <CardHeader>
                              <CardTitle>Direct VPC Connection</CardTitle>
                              <CardDescription>Configure parameters for direct VPC connection.</CardDescription>
                          </CardHeader>
                          <CardContent>
                              <div className="grid gap-4">
                                  <div>
                                      <Label htmlFor="direct-vpc-instance">Instance Connection Name</Label>
                                      <Input
                                          id="direct-vpc-instance"
                                          value={directVpcConfig.instanceConnectionName}
                                          onChange={(e) => handleConfigChange("directVpc", "instanceConnectionName", e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <Label htmlFor="direct-vpc-user">DB User</Label>
                                      <Input
                                          id="direct-vpc-user"
                                          value={directVpcConfig.dbUser}
                                          onChange={(e) => handleConfigChange("directVpc", "dbUser", e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <Label htmlFor="direct-vpc-db">DB Name</Label>
                                      <Input
                                          id="direct-vpc-db"
                                          value={directVpcConfig.dbName}
                                          onChange={(e) => handleConfigChange("directVpc", "dbName", e.target.value)}
                                      />
                                  </div>
                              </div>
                          </CardContent>
                      </Card>

                      <Card>
                          <CardHeader>
                              <CardTitle>Managed Connection Pooling</CardTitle>
                              <CardDescription>Configure parameters for managed connection pooling.</CardDescription>
                          </CardHeader>
                          <CardContent>
                              <div className="grid gap-4">
                                  <div>
                                      <Label htmlFor="managed-pooling-instance">Instance Connection Name</Label>
                                      <Input
                                          id="managed-pooling-instance"
                                          value={managedConnectionPoolingConfig.instanceConnectionName}
                                          onChange={(e) => handleConfigChange("managedConnectionPooling", "instanceConnectionName", e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <Label htmlFor="managed-pooling-user">DB User</Label>
                                      <Input
                                          id="managed-pooling-user"
                                          value={managedConnectionPoolingConfig.dbUser}
                                          onChange={(e) => handleConfigChange("managedConnectionPooling", "dbUser", e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <Label htmlFor="managed-pooling-db">DB Name</Label>
                                      <Input
                                          id="managed-pooling-db"
                                          value={managedConnectionPoolingConfig.dbName}
                                          onChange={(e) => handleConfigChange("managedConnectionPooling", "dbName", e.target.value)}
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

      {testResult.directVpc || testResult.managedConnectionPooling ? (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-5 text-center">Results</h2>

          {/* Execution Time Chart */}
          <PerformanceChart
            data={executionTimeData}
            title="Execution Time Comparison"
            description="Visual comparison of execution time between Direct VPC and Managed Connection Pooling."
            dataKey="directVpc"
            name="Execution Time"
            unit="ms"
          />

          {/* Queries Per Second Chart */}
          <PerformanceChart
            data={queriesPerSecondData}
            title="Queries Per Second (QPS) Comparison"
            description="Visual comparison of queries per second between Direct VPC and Managed Connection Pooling."
            dataKey="directVpc"
            name="Queries Per Second"
            unit="QPS"
          />

           {/* Throughput Chart */}
           <PerformanceChart
                data={throughputData}
                title="Throughput Comparison"
                description="Visual comparison of throughput between Direct VPC and Managed Connection Pooling."
                dataKey="directVpc"
                name="Throughput"
                unit="rows/sec"
            />

          {/* Table */}
          <Table>
            <TableCaption>
              Comparison of throughput and latency between Direct VPC and Managed Connection Pooling.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Method</TableHead>
                <TableHead>Execution Time (ms)</TableHead>
                <TableHead>Rows Returned</TableHead>
                <TableHead>Queries Per Second (QPS)</TableHead>
                <TableHead>Throughput (rows/sec)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Direct VPC</TableCell>
                <TableCell>{testResult.directVpc?.executionTimeMs}</TableCell>
                <TableCell>{testResult.directVpc?.rowsReturned}</TableCell>
                <TableCell>
                  {testResult.directVpc
                    ? (1000 / testResult.directVpc.executionTimeMs).toFixed(2)
                    : "N/A"}
                </TableCell>
                  <TableCell>{directVpcThroughput}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Managed Connection Pooling</TableCell>
                <TableCell>{testResult.managedConnectionPooling?.executionTimeMs}</TableCell>
                <TableCell>{testResult.managedConnectionPooling?.rowsReturned}</TableCell>
                <TableCell>
                  {testResult.managedConnectionPooling
                    ? (1000 / testResult.managedConnectionPooling.executionTimeMs).toFixed(2)
                    : "N/A"}
                </TableCell>
                  <TableCell>{managedConnectionPoolingThroughput}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        !isLoading && <p className="mt-5 text-center text-muted-foreground">No results yet. Run a test to see performance metrics.</p>
      )}
    </div>
  );
}
