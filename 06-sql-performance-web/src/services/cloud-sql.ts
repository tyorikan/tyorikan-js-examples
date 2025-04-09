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

  /**
   * The value of min pool size
   */
  minPoolSize?: number;

  /**
   * The value of max pool size
   */
  maxPoolSize?: number;
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

import { IpAddressTypes, Connector } from '@google-cloud/cloud-sql-connector';
import pg from 'pg';
const { Pool } = pg;

// Initialize the Cloud SQL Connector
const connector = new Connector();

async function createPool(config: CloudSQLConfig) {
  const instanceId = config.instanceConnectionName;
  const dbUser = config.dbUser;
  const dbPassword = config.dbPassword;
  const dbName = config.dbName;
  const connectionType = config.connectionType;
  const port = connectionType === 'managedConnectionPooling' ? 6432 : 5432;
  const minPoolSize = process.env.MIN_POOL_SIZE ? parseInt(process.env.MIN_POOL_SIZE) : config.minPoolSize;
  const maxPoolSize = process.env.MAX_POOL_SIZE ? parseInt(process.env.MAX_POOL_SIZE) : config.maxPoolSize;

  // Use the connector to create a connection pool
  const clientOpts = await connector.getOptions({
    instanceConnectionName: instanceId,
    ipType: IpAddressTypes.PUBLIC,
    // ipType: IpAddressTypes.PRIVATE,
  });
  const pool = new Pool({
    ...clientOpts,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    port: port,
    min: minPoolSize,
    max: maxPoolSize,
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  });

  await pool.connect(); // Establish the connection.
  return pool;
}

let connectionPools: { [key: string]: any } = {};
let poolsInitialized = false; // Add a flag to track initialization

/**
 * Executes a SQL query against a Cloud SQL instance using the provided configuration.
 *
 * @param config The Cloud SQL connection configuration.
 * @param query The SQL query to execute.
 * @returns A promise that resolves to a QueryResult object.
 */
export async function executeSqlQuery(key: string, query: string): Promise<QueryResult> {
  const startTime = performance.now();
  let pool;

  try {
    if (!poolsInitialized) {
      throw new Error("Connection pools have not been initialized.");
    }
    if (!connectionPools[key]) {
      throw new Error(`Connection pool for ${key} not initialized.`);
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

// Function to gracefully close all connection pools
async function closeAllPools() {
  console.log('Closing all connection pools...');
  const poolKeys = Object.keys(connectionPools);
  await Promise.all(
    poolKeys.map(async (key) => {
      const pool = connectionPools[key];
      try {
        await pool.end();
        console.log(`Closed pool for key: ${key}`);
      } catch (error) {
        console.error(`Error closing pool for key ${key}:`, error);
      }
    })
  );
  connectionPools = {}; // Clear the connection pools object
  poolsInitialized = false; // Reset the flag
  console.log('All connection pools closed.');
}

// Handle SIGTERM signal
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM signal.');
  await closeAllPools();
  process.exit(0); // Exit gracefully
});

// Handle SIGINT signal (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('Received SIGINT signal.');
  await closeAllPools();
  process.exit(0); // Exit gracefully
});

// Pre-create connection pools on startup
export async function initializePools() {
  console.log("Initializing connection pools...")
  const minPoolSize = process.env.MIN_POOL_SIZE ? parseInt(process.env.MIN_POOL_SIZE) : 50;
  const maxPoolSize = process.env.MAX_POOL_SIZE ? parseInt(process.env.MAX_POOL_SIZE) : 1000;
  const directVpcConfig: CloudSQLConfig = {
    connectionType: "directVpc",
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME || "",
    dbUser: process.env.DB_USER || "postgres",
    dbPassword: process.env.DB_PASSWORD || "",
    dbName: process.env.DB_NAME || "postgres",
    minPoolSize: minPoolSize,
    maxPoolSize: maxPoolSize,
  };
  const managedConnectionPoolingConfig: CloudSQLConfig = {
    connectionType: "managedConnectionPooling",
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME || "",
    dbUser: process.env.DB_USER || "postgres",
    dbPassword: process.env.DB_PASSWORD || "",
    dbName: process.env.DB_NAME || "postgres",
    minPoolSize: minPoolSize,
    maxPoolSize: maxPoolSize,
  };
  try {
    connectionPools["directVpc"] = await createPool(directVpcConfig);
    connectionPools["managedConnectionPooling"] = await createPool(managedConnectionPoolingConfig);
    poolsInitialized = true; // Set the flag to true after successful initialization
    console.log("Connection pools initialized successfully.");
  } catch (error) {
    console.error("Error initializing connection pools:", error);
    process.exit(1); // Exit with an error code if pool initialization fails
  }
}
