#!/bin/bash
# Database Connection Health Monitor for SalesOS
# Usage: ./monitor-db-connections.sh

echo "===== Database Connection Monitor ====="
echo "Timestamp: $(date)"
echo ""

# Check total connection count
CONN_COUNT=$(PGPASSWORD=iris psql -h localhost -p 5432 -U iris -d salesos -t -c "SELECT count(*) FROM pg_stat_activity WHERE usename = 'iris';")
echo "Total connections for user 'iris': $CONN_COUNT"

# Check PostgreSQL max connections limit
MAX_CONN=$(PGPASSWORD=iris psql -h localhost -p 5432 -U iris -d salesos -t -c "SHOW max_connections;")
echo "PostgreSQL max_connections: $MAX_CONN"

# Calculate percentage
PERCENTAGE=$(echo "scale=2; ($CONN_COUNT * 100) / $MAX_CONN" | bc)
echo "Usage: ${PERCENTAGE}%"
echo ""

# Show breakdown by database and state
echo "Connection breakdown:"
PGPASSWORD=iris psql -h localhost -p 5432 -U iris -d salesos -c "
SELECT 
  COALESCE(datname, '(no database)') as database,
  state,
  count(*) as connections,
  max(now() - state_change) as max_idle_time
FROM pg_stat_activity 
WHERE usename = 'iris' 
GROUP BY datname, state 
ORDER BY count(*) DESC;
"

# Warning if connection count is high
if [ "$CONN_COUNT" -gt 150 ]; then
  echo ""
  echo "⚠️  WARNING: Connection count is HIGH ($CONN_COUNT / $MAX_CONN)"
  echo "Consider investigating connection leaks or reducing connection pool sizes."
elif [ "$CONN_COUNT" -gt 200 ]; then
  echo ""
  echo "🚨 CRITICAL: Connection count is VERY HIGH ($CONN_COUNT / $MAX_CONN)"
  echo "Immediate action required to prevent service disruption!"
fi

echo ""
echo "===== End of Report ====="
