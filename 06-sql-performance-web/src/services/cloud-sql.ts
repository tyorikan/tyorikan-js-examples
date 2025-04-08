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

import { generateInstanceId, CloudSQLConnector } from '@google-cloud/cloud-sql-connector';
import { Client } from 'pg';

// Initialize the Cloud SQL Connector
const connector = new CloudSQLConnector();

async function createPool(config: CloudSQLConfig) {
  const instanceId = config.instanceConnectionName;
  const dbUser = config.dbUser;
  const dbPassword = config.dbPassword;
  const dbName = config.dbName;
  const connectionType = config.connectionType;
  const port = connectionType === 'managedConnectionPooling' ? 6432 : 5432;

  const options = {
    instanceId: instanceId,
    user: dbUser,
    password: dbPassword,
    database: dbName,
  };

  // Use the connector to create a connection pool
  const pool = connector.getPool(options);
  await pool.connect(); // Establish the connection.
  return pool;
}

let connectionPools: { [key: string]: any } = {};

/**
 * Executes a SQL query against a Cloud SQL instance using the provided configuration.
 *
 * @param config The Cloud SQL connection configuration.
 * @param query The SQL query to execute.
 * @returns A promise that resolves to a QueryResult object.
 */
export async function executeSqlQuery(config: CloudSQLConfig, query: string): Promise<QueryResult> {
  const startTime = performance.now();
  let pool;
  const key = JSON.stringify(config);

  try {
    if (!connectionPools[key]) {
      connectionPools[key] = await createPool(config);
    }
    pool = connectionPools[key];
    const client = await pool.connect();
    const result = await client.query(query);
    client.release(); // Release the connection back to the pool.

    const endTime = performance.now();
    const executionTimeMs = endTime - startTime;

    return {
      executionTimeMs: executionTimeMs,
      rowsReturned: result.rowCount || 0,
    };
  } catch (error: any) {
    console.error('Error executing query:', error);
    throw new Error(`Failed to execute query: ${error.message}`);
  }
}
