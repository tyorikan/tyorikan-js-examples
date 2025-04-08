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
  dbPassword?: string;
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

/**
 * Executes a SQL query against a Cloud SQL instance using the provided configuration.
 *
 * @param config The Cloud SQL connection configuration.
 * @param query The SQL query to execute.
 * @returns A promise that resolves to a QueryResult object.
 */
export async function executeSqlQuery(config: CloudSQLConfig, query: string): Promise<QueryResult> {
  // Simulate query execution with a random delay
  const executionTimeMs = Math.random() * 500 + 100; // Between 100ms and 600ms
  await new Promise(resolve => setTimeout(resolve, executionTimeMs));

  const rowsReturned = Math.floor(Math.random() * 1000); // Simulate some rows

  return {
    executionTimeMs: executionTimeMs,
    rowsReturned: rowsReturned,
  };
}
