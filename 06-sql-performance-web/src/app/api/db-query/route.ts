import { executeSqlQuery, CloudSQLConfig, QueryResult } from '@/services/cloud-sql';
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

export async function POST(request: Request) {
  try {
    // Parse the request body as JSON
    const body = await request.json();

    // Extract the query, directVpcConfig, and managedConnectionPoolingConfig from the parsed body
    const { query, directVpcConfig, managedConnectionPoolingConfig } = body;

    // Check if the query is present
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Check if directVpcConfig and managedConnectionPoolingConfig are present
    if (!directVpcConfig || !managedConnectionPoolingConfig) {
      return NextResponse.json({ error: 'directVpcConfig and managedConnectionPoolingConfig are required' }, { status: 400 });
    }

    const numQueries = 10000;

    // Helper function to execute queries and measure latency and throughput
    async function executeAndMeasure(config: CloudSQLConfig, query: string): Promise<{ latencies: number[], throughputValue: number, throughputUnit: string }> {
      const latencies: number[] = [];
      let totalExecutionTime = 0;
      let totalRowsReturned = 0;
      const promises: Promise<QueryResult>[] = [];

      const startTime = performance.now();
      for (let i = 0; i < numQueries; i++) {
        promises.push(executeSqlQuery(config, query).then(result => {
          latencies.push(result.executionTimeMs);
          totalExecutionTime += result.executionTimeMs;
          totalRowsReturned += result.rowsReturned;
          return result;
        }));
      }

      await Promise.all(promises);
      const endTime = performance.now();
      const totalTimeSeconds = (endTime - startTime) / 1000;

      // Estimate data size: assume each row is 1KB
      const totalDataTransferred = totalRowsReturned * 1024; // in bytes
      const { value: throughputValue, unit: throughputUnit } = calculateThroughput(totalDataTransferred, totalTimeSeconds);

      return { latencies, throughputValue, throughputUnit };
    }

    // Execute the queries for both configurations
    const directVpcResult = await executeAndMeasure(directVpcConfig, query);
    const managedConnectionPoolingResult = await executeAndMeasure(managedConnectionPoolingConfig, query);

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
      },
      managedConnectionPooling: {
        p99: managedConnectionPooling99th,
        p95: managedConnectionPooling95th,
        p50: managedConnectionPooling50th,
        throughputValue: managedConnectionPoolingResult.throughputValue,
        throughputUnit: managedConnectionPoolingResult.throughputUnit,
      },
    });
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
