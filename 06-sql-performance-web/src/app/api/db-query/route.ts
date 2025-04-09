import { executeSqlQuery, CloudSQLConfig, initializePools } from '@/services/cloud-sql';
import { NextResponse } from 'next/server';

// Function to calculate percentile
function percentile(arr: number[], p: number) {
  if (arr.length === 0) return 0;
  const sortedArr = arr.sort((a, b) => a - b);
  const index = (p / 100) * (sortedArr.length - 1);

  if (Math.floor(index) === index) {
    return sortedArr[index];
  }

  const i = Math.floor(index);
  const fraction = index - i;
  return sortedArr[i] + (sortedArr[i + 1] - sortedArr[i]) * fraction;
}

// Function to calculate throughput in Mbps or Gbps
function calculateThroughput(totalData: number, totalTimeSeconds: number): { value: number, unit: string } {
  const bitsPerSecond = totalData * 8 / totalTimeSeconds; // bits per second
  const mbps = bitsPerSecond / 1000000;

  if (mbps >= 1000) {
    const gbps = mbps / 1000;
    return { value: gbps, unit: 'Gbps' };
  } else {
    return { value: mbps, unit: 'Mbps' };
  }
}

let poolsInitialized = false; // Add a flag to track initialization

export async function POST(request: Request) {
  // Initialize pools if not already initialized
  if (!poolsInitialized) {
    await initializePools();
    poolsInitialized = true;
  }
  try {
    // Parse the request body as JSON
    const body = await request.json();

    const { query, targetQps, durationSeconds } = body;

    // Check if the query is present
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Validate targetQps and durationSeconds
    if (!targetQps || !durationSeconds) {
      return NextResponse.json({ error: 'targetQps and durationSeconds are required' }, { status: 400 });
    }

    // Helper function to execute queries with rate limiting and measure latency and throughput
    async function executeAndMeasureWithRateLimit(key: string, query: string, targetQps: number, durationSeconds: number): Promise<{ latencies: number[], throughputValue: number, throughputUnit: string, qps: number, completedQueries: number, failedQueries: number }> {
      const latencies: number[] = [];
      let totalRowsReturned = 0;
      let completedQueries = 0;
      let failedQueries = 0;
      const startTime = performance.now();
      const intervalMs = 1000 / targetQps; // Interval between queries in milliseconds
      const promises: Promise<void>[] = [];

      const executeQueryWithLatency = async () => {
        const queryStartTime = performance.now();
        try {
          const result = await executeSqlQuery(key, query);
          const queryEndTime = performance.now();
          const executionTimeMs = queryEndTime - queryStartTime;
          latencies.push(executionTimeMs);
          totalRowsReturned += result.rowsReturned;
          completedQueries++;
        } catch (error) {
          console.error('Error executing query:', error);
          failedQueries++;
        }
      };

      for (let i = 0; i < durationSeconds * targetQps; i++) {
        promises.push(executeQueryWithLatency());
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      await Promise.all(promises);

      const endTime = performance.now();
      const totalTimeSeconds = (endTime - startTime) / 1000;

      // Estimate data size: assume each row is 1KB
      const totalDataTransferred = totalRowsReturned * 1024; // in bytes
      const { value: throughputValue, unit: throughputUnit } = calculateThroughput(totalDataTransferred, totalTimeSeconds);

      // Calculate queries per second (QPS)
      const qps = completedQueries / totalTimeSeconds;

      return { latencies, throughputValue, throughputUnit, qps, completedQueries, failedQueries };
    }

    // Execute the queries for both configurations with rate limiting
    const directVpcResult = await executeAndMeasureWithRateLimit("directVpc", query, targetQps, durationSeconds);
    const managedConnectionPoolingResult = await executeAndMeasureWithRateLimit("managedConnectionPooling", query, targetQps, durationSeconds);

    const directVpcLatencies = directVpcResult.latencies;
    const managedConnectionPoolingLatencies = managedConnectionPoolingResult.latencies;

    // Calculate percentiles
    const directVpc99th = percentile(directVpcLatencies, 99);
    const directVpc95th = percentile(directVpcLatencies, 95);
    const directVpc50th = percentile(directVpcLatencies, 50);

    const managedConnectionPooling99th = percentile(managedConnectionPoolingLatencies, 99);
    const managedConnectionPooling95th = percentile(managedConnectionPoolingLatencies, 95);
    const managedConnectionPooling50th = percentile(managedConnectionPoolingLatencies, 50);

    // Return the results
    return NextResponse.json({
      directVpc: {
        p99: directVpc99th,
        p95: directVpc95th,
        p50: directVpc50th,
        throughputValue: directVpcResult.throughputValue,
        throughputUnit: directVpcResult.throughputUnit,
        qps: directVpcResult.qps,
        successfulQueries: directVpcResult.completedQueries,
        failedQueries: directVpcResult.failedQueries,
      },
      managedConnectionPooling: {
        p99: managedConnectionPooling99th,
        p95: managedConnectionPooling95th,
        p50: managedConnectionPooling50th,
        throughputValue: managedConnectionPoolingResult.throughputValue,
        throughputUnit: managedConnectionPoolingResult.throughputUnit,
        qps: managedConnectionPoolingResult.qps,
        successfulQueries: managedConnectionPoolingResult.completedQueries,
        failedQueries: managedConnectionPoolingResult.failedQueries,
      },
    });
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
