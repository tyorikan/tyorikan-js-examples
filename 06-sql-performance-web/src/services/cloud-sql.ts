/**
 * Represents the configuration parameters for connecting to a Cloud SQL instance.
 */
export interface CloudSQLConfig {
  /**
   * The type of connection to use: 'directVpc' or 'managedConnectionPooling'.
   */
  connectionType: 'directVpc' | 'managedConnectionPooling';
  /**
   * The Cloud SQL instance connection name.
   */
  instanceConnectionName: string;
  /**
   * The database user.
   */
  dbUser: string;
  /**
   * The database password.
   */
  dbPassword: string;
  /**
   * The name of the database to connect to.
   */
  dbName: string;
}

/**
 * Represents the result of executing a SQL query, including the execution time.
 */
export interface QueryResult {
  /**
   * The time it took to execute the query, in milliseconds.
   */
  executionTimeMs: number;
  /**
   * The number of rows returned by the query.
   */
  rowsReturned: number;
}

import { Client } from 'pg';

/**
 * Executes a SQL query against a Cloud SQL instance using the provided configuration.
 *
 * @param config The Cloud SQL connection configuration.
 * @param query The SQL query to execute.
 * @returns A promise that resolves to a QueryResult object.
 */
export async function executeSqlQuery(config: CloudSQLConfig, query: string): Promise<QueryResult> {
  const client = new Client({
    host: `/cloudsql/${config.instanceConnectionName}`,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
    port: 5432,
  });

  const startTime = performance.now();
  try {
    await client.connect();
    const result = await client.query(query);
    const endTime = performance.now();
    const executionTimeMs = endTime - startTime;

    return {
      executionTimeMs: executionTimeMs,
      rowsReturned: result.rowCount || 0,
    };
  } catch (error: any) {
    console.error('Error executing query:', error);
    throw new Error(`Failed to execute query: ${error.message}`);
  } finally {
    await client.end();
  }
}

    
