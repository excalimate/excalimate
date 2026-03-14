# Component Library

Pre-built JSON templates for common data pipeline components. All components include consistent sizing and `boundElements` for labels.

## Data Sources (Green)

### PostgreSQL Database
```json
{
  "id": "postgres-src",
  "type": "rectangle",
  "width": 160, "height": 70,
  "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb",
  "boundElements": [{"id": "postgres-label", "type": "text"}]
}
```

### MySQL Database  
```json
{
  "id": "mysql-src", 
  "type": "rectangle",
  "width": 160, "height": 70,
  "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb",
  "boundElements": [{"id": "mysql-label", "type": "text"}]
}
```

### Amazon S3
```json
{
  "id": "s3-src",
  "type": "rectangle", 
  "width": 160, "height": 70,
  "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb",
  "boundElements": [{"id": "s3-label", "type": "text"}]
}
```

### REST API Endpoint
```json
{
  "id": "api-src",
  "type": "rectangle",
  "width": 160, "height": 70, 
  "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb",
  "boundElements": [{"id": "api-label", "type": "text"}]
}
```

### CSV File
```json
{
  "id": "csv-src",
  "type": "rectangle",
  "width": 160, "height": 70,
  "strokeColor": "#2f9e44", "backgroundColor": "#b2f2bb", 
  "boundElements": [{"id": "csv-label", "type": "text"}]
}
```

## Queues/Streams (Orange)

### Kafka Topic
```json
{
  "id": "kafka-queue",
  "type": "rectangle",
  "width": 200, "height": 50,
  "strokeColor": "#f08c00", "backgroundColor": "#ffec99",
  "boundElements": [{"id": "kafka-label", "type": "text"}]
}
```

### RabbitMQ Queue
```json
{
  "id": "rabbitmq-queue", 
  "type": "rectangle",
  "width": 200, "height": 50,
  "strokeColor": "#f08c00", "backgroundColor": "#ffec99",
  "boundElements": [{"id": "rabbitmq-label", "type": "text"}]
}
```

### Amazon SQS
```json
{
  "id": "sqs-queue",
  "type": "rectangle",
  "width": 200, "height": 50,
  "strokeColor": "#f08c00", "backgroundColor": "#ffec99", 
  "boundElements": [{"id": "sqs-label", "type": "text"}]
}
```

## Transforms (Blue)

### ETL Process
```json
{
  "id": "etl-transform",
  "type": "rectangle",
  "width": 180, "height": 80,
  "strokeColor": "#1971c2", "backgroundColor": "#a5d8ff",
  "boundElements": [{"id": "etl-label", "type": "text"}]
}
```

### ML Model
```json
{
  "id": "ml-transform", 
  "type": "rectangle",
  "width": 180, "height": 80,
  "strokeColor": "#1971c2", "backgroundColor": "#a5d8ff",
  "boundElements": [{"id": "ml-label", "type": "text"}]
}
```

### Data Aggregator
```json
{
  "id": "aggregator-transform",
  "type": "rectangle",
  "width": 180, "height": 80,
  "strokeColor": "#1971c2", "backgroundColor": "#a5d8ff",
  "boundElements": [{"id": "aggregator-label", "type": "text"}]
}
```

### Data Filter
```json
{
  "id": "filter-transform",
  "type": "rectangle", 
  "width": 180, "height": 80,
  "strokeColor": "#1971c2", "backgroundColor": "#a5d8ff",
  "boundElements": [{"id": "filter-label", "type": "text"}]
}
```

## Routers (Teal Diamond)

### Message Router
```json
{
  "id": "router",
  "type": "diamond",
  "width": 140, "height": 120,
  "strokeColor": "#0c8599", "backgroundColor": "#99e9f2",
  "boundElements": [{"id": "router-label", "type": "text"}]
}
```

## Sinks (Purple)

### Data Warehouse
```json
{
  "id": "warehouse-sink",
  "type": "rectangle",
  "width": 160, "height": 70,
  "strokeColor": "#6741d9", "backgroundColor": "#d0bfff",
  "boundElements": [{"id": "warehouse-label", "type": "text"}]
}
```

### Dashboard
```json
{
  "id": "dashboard-sink", 
  "type": "rectangle",
  "width": 160, "height": 70,
  "strokeColor": "#6741d9", "backgroundColor": "#d0bfff",
  "boundElements": [{"id": "dashboard-label", "type": "text"}]
}
```

### Data Lake
```json
{
  "id": "lake-sink",
  "type": "rectangle",
  "width": 160, "height": 70, 
  "strokeColor": "#6741d9", "backgroundColor": "#d0bfff",
  "boundElements": [{"id": "lake-label", "type": "text"}]
}
```

### Elasticsearch Index
```json
{
  "id": "elastic-sink",
  "type": "rectangle",
  "width": 160, "height": 70,
  "strokeColor": "#6741d9", "backgroundColor": "#d0bfff",
  "boundElements": [{"id": "elastic-label", "type": "text"}]
}
```

## Error Handling (Red)

### Dead Letter Queue
```json
{
  "id": "dlq-sink",
  "type": "rectangle", 
  "width": 160, "height": 70,
  "strokeColor": "#e03131", "backgroundColor": "#ffc9c9",
  "boundElements": [{"id": "dlq-label", "type": "text"}]
}
```

### Error Log
```json
{
  "id": "error-sink",
  "type": "rectangle",
  "width": 160, "height": 70,
  "strokeColor": "#e03131", "backgroundColor": "#ffc9c9",
  "boundElements": [{"id": "error-label", "type": "text"}]
}
```

## Usage Notes

- All components start with `opacity: 0` for animations
- Labels are centered on their parent components  
- Use consistent naming: `{type}-{role}` (e.g., `postgres-src`, `etl-transform`)
- Label IDs follow pattern: `{component-id}-label`
- Arrows connect component edges, not centers