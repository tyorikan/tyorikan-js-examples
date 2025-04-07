# **App Name**: SQL Performance Tester

## Core Features:

- Connection Configuration: Define and configure connection parameters for both direct VPC connection and Managed Connection Pooling.
- Concurrent Query Execution: Implement concurrent execution of queries to simulate load.
- Throughput Measurement: Measure and record throughput (queries per second) for both connection methods.
- Latency Measurement: Measure and record latency (response time) for each query under both connection methods.
- Results Display: Display the results of the throughput and latency tests in a simple, tabular format.

## Style Guidelines:

- Primary color: Use a calm blue (#4285F4) to represent the cloud environment.
- Secondary color: A light gray (#E0E0E0) for background elements to provide contrast.
- Accent: A vibrant green (#34A853) to highlight key metrics and results.
- Clean and readable sans-serif font for displaying performance metrics.
- Use a clear and structured layout to present the comparison results effectively.
- Subtle animations to indicate loading or processing states.

## Original User Request:
Cloud Run から直接 VPC 接続で Cloud SQL (PostgreSQL) にクエリをぶん回す処理と、新しくリリースされた Managed Connection Pooling を利用して接続し、クエリをぶん回す処理のスループットとレイテンシを比較するためのプログラムを実装したい。Go 言語で実装してください。
https://cloud.google.com/sql/docs/postgres/managed-connection-pooling
  