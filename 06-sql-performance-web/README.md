## Environment Variables

This application requires certain environment variables to be set for proper functionality, especially when interacting with Cloud SQL. You can set these variables in a `.env.local` file in the root directory of the project.

### Required Variables

| Variable Name             | Description                                                                                                                                                                                                  | Example Value                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `INSTANCE_CONNECTION_NAME` | The Cloud SQL instance connection name. This is used to establish a connection to your Cloud SQL instance.                                                                                                    | `your-project-id:your-region:your-instance` |
| `DB_USER`                 | The database user. This is the username used to authenticate with the database.                                                                                                                               | `postgres`                                  |
| `DB_PASSWORD`             | The database password. This is the password for the database user.                                                                                                                                            | `your-db-password`                          |
| `DB_NAME`                 | The name of the database to connect to. This is the specific database within your Cloud SQL instance that you want to interact with.                                                                         | `postgres`                                  |
| `MIN_POOL_SIZE`           | (Optional) The minimum number of connections to maintain in the connection pool. If not set, it defaults to 50.                                                                                              | `50`                                        |
| `MAX_POOL_SIZE`           | (Optional) The maximum number of connections allowed in the connection pool. If not set, it defaults to 1000.                                                                                              | `1000`                                      |

### How to Set Environment Variables

1.  **Create a `.env.local` file:** In the root directory of your project, create a file named `.env.local`.
2.  **Add the variables:** Add the required environment variables to this file, using the format `VARIABLE_NAME=value`. For example:

    ```
    INSTANCE_CONNECTION_NAME=your-project-id:your-region:your-instance
    DB_USER=postgres
    DB_PASSWORD=your-db-password
    DB_NAME=postgres
    MIN_POOL_SIZE=50
    MAX_POOL_SIZE=1000
    ```

3.  **Restart the development server:** If the server is already running, restart it to load the new environment variables.

**Important:**

*   Replace the example values with your actual Cloud SQL instance credentials.
*   Do not commit the `.env.local` file to your version control system (e.g., Git). It should be added to your `.gitignore` file to prevent sensitive information from being exposed.
*   The `MIN_POOL_SIZE` and `MAX_POOL_SIZE` are optional. If not set, they will default to 50 and 1000, respectively.
*   The `INSTANCE_CONNECTION_NAME` should follow the format `project-id:region:instance-name`.
