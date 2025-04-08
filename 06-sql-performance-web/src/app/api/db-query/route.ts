import { executeSqlQuery, CloudSQLConfig } from '@/services/cloud-sql';
import { NextResponse } from 'next/server';

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

    // Execute the queries for both configurations
    const directVpcResult = await executeSqlQuery(directVpcConfig, query);
    const managedConnectionPoolingResult = await executeSqlQuery(managedConnectionPoolingConfig, query);

    // Return the results
    return NextResponse.json({
      directVpc: directVpcResult,
      managedConnectionPooling: managedConnectionPoolingResult,
    });
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
