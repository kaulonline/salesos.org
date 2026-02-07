# IRISRank API

**IRISRank v2.0** - AI-Powered Entity Ranking Algorithm

A PageRank-inspired algorithm that combines network importance, activity signals, query relevance, and engagement momentum to intelligently rank CRM entities.

## Base URL

```
/api/iris-rank
```

## Authentication

All endpoints (except `/health`) require JWT Bearer authentication.

```bash
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Health Check

```http
GET /api/iris-rank/health
```

**Response:**
```json
{
  "status": "healthy",
  "algorithm": "IRISRank",
  "version": "2.0.0"
}
```

---

### Score Entities

Compute IRISRank scores for a set of entities.

```http
POST /api/iris-rank/score
```

**Request Body:**
```json
{
  "entities": [
    {
      "id": "lead-001",
      "type": "Lead",
      "name": "John Smith",
      "properties": {
        "company": "Acme Inc",
        "status": "Working",
        "value": 50000
      },
      "activities": [
        {
          "type": "email_replied",
          "date": "2025-12-18T10:00:00Z",
          "outcome": "positive"
        },
        {
          "type": "meeting_attended",
          "date": "2025-12-15T14:00:00Z",
          "outcome": "positive"
        }
      ],
      "connections": [
        {
          "targetId": "account-001",
          "targetType": "Account",
          "relationshipType": "works_at",
          "strength": 0.9
        }
      ]
    }
  ],
  "query": "high value enterprise",
  "entityTypes": ["Lead", "Contact"],
  "limit": 20,
  "weights": {
    "network": 0.30,
    "activity": 0.25,
    "relevance": 0.20,
    "momentum": 0.25
  }
}
```

**Response:**
```json
{
  "success": true,
  "count": 1,
  "results": [
    {
      "id": "lead-001",
      "name": "John Smith",
      "type": "Lead",
      "rank": 0.82,
      "scores": {
        "network": 0.65,
        "activity": 0.85,
        "relevance": 0.70,
        "momentum": 0.78
      },
      "momentum": {
        "velocity": 0.25,
        "acceleration": 0.12,
        "trend": "accelerating",
        "daysSinceLastActivity": 3
      },
      "insights": [
        "📈 Accelerating: Engagement increasing rapidly (velocity: +25%)",
        "Strong recent engagement",
        "Recent positive activity: email replied"
      ]
    }
  ],
  "computedAt": "2025-12-21T06:00:00.000Z",
  "algorithm": "IRISRank v2.0 (PageRank + Velocity + Momentum)"
}
```

---

### Batch Score

Process multiple entity sets in a single request.

```http
POST /api/iris-rank/batch
```

**Request Body:**
```json
{
  "batches": [
    {
      "batchId": "west-region",
      "entities": [...],
      "query": "enterprise deals",
      "limit": 10
    },
    {
      "batchId": "east-region",
      "entities": [...],
      "limit": 10
    }
  ]
}
```

**Use Cases:**
- Compare lead quality across territories
- Score multiple campaign segments
- Regional account health comparison

---

### At-Risk Detection

Identify entities with declining engagement or churn risk.

```http
POST /api/iris-rank/at-risk
```

**Request Body:**
```json
{
  "entities": [...],
  "limit": 10,
  "inactivityThreshold": 30
}
```

**Response:**
```json
{
  "success": true,
  "atRiskCount": 3,
  "results": [
    {
      "id": "account-003",
      "name": "Stalled Corp",
      "rank": 0.45,
      "riskLevel": "Critical",
      "riskFactors": [
        "No activity for 45 days",
        "Engagement declining 35%",
        "Negative trend accelerating"
      ],
      "momentum": {
        "velocity": -0.35,
        "trend": "churning"
      }
    }
  ],
  "computedAt": "2025-12-21T06:00:00.000Z"
}
```

---

### Momentum (Hot Leads)

Find entities with positive momentum - accelerating engagement.

```http
POST /api/iris-rank/momentum
```

**Request Body:**
```json
{
  "entities": [...],
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "results": [
    {
      "id": "lead-007",
      "name": "Hot Prospect Inc",
      "heatLevel": "Hot",
      "momentum": {
        "velocity": 0.45,
        "acceleration": 0.20,
        "trend": "accelerating"
      }
    }
  ],
  "computedAt": "2025-12-21T06:00:00.000Z"
}
```

---

### Portfolio Insights

Generate analytics and recommendations for an entity set.

```http
POST /api/iris-rank/insights
```

**Request Body:**
```json
{
  "entities": [...],
  "insightTypes": ["distribution", "trends", "recommendations"]
}
```

**Response:**
```json
{
  "success": true,
  "insights": {
    "summary": {
      "totalEntities": 150,
      "avgRank": 0.52,
      "avgMomentum": 0.48
    },
    "distribution": {
      "byTrend": {
        "accelerating": 25,
        "steady": 45,
        "decelerating": 40,
        "at_risk": 30,
        "churning": 10
      },
      "byType": {
        "Lead": 80,
        "Contact": 50,
        "Account": 20
      }
    },
    "recommendations": [
      "10 entities are churning - immediate outreach needed",
      "25% of portfolio is at risk - review engagement strategy",
      "25 entities have strong momentum - prioritize for conversion"
    ]
  },
  "computedAt": "2025-12-21T06:00:00.000Z"
}
```

---

### Configuration

Get current IRISRank configuration.

```http
GET /api/iris-rank/config
```

**Response:**
```json
{
  "weights": {
    "network": 0.30,
    "activity": 0.25,
    "relevance": 0.20,
    "momentum": 0.25
  },
  "activityTypes": [
    "email_replied", "email_opened", "meeting_attended",
    "call_answered", "task_completed", "stage_advanced", ...
  ],
  "relationshipTypes": [
    "owns", "employs", "works_at", "associated_to",
    "referred_by", "reports_to", ...
  ],
  "velocityPeriodDays": 7
}
```

---

### Statistics

Get IRISRank usage statistics.

```http
GET /api/iris-rank/stats
```

**Response:**
```json
{
  "totalComputations": 1250,
  "cacheHits": 890,
  "avgComputeTimeMs": 45,
  "entitiesRanked": 125000,
  "cacheSize": 12,
  "configuredActivityTypes": 17,
  "configuredRelationshipTypes": 10
}
```

---

## Activity Types

IRISRank supports these activity types out of the box:

| Activity Type | Weight | Decay (days) | Category |
|--------------|--------|--------------|----------|
| `deal_won` | 0.50 | 90 | pipeline |
| `referral_received` | 0.50 | 90 | referral |
| `referral_given` | 0.40 | 90 | referral |
| `meeting_attended` | 0.35 | 30 | meeting |
| `stage_advanced` | 0.30 | 60 | pipeline |
| `email_replied` | 0.25 | 14 | communication |
| `call_answered` | 0.20 | 14 | communication |
| `meeting_scheduled` | 0.20 | 14 | meeting |
| `content_downloaded` | 0.20 | 14 | engagement |
| `task_completed` | 0.15 | 14 | task |
| `call_made` | 0.10 | 7 | communication |
| `email_opened` | 0.10 | 7 | communication |
| `website_visit` | 0.05 | 3 | engagement |

**Negative signals:**
| Activity Type | Weight | Decay (days) |
|--------------|--------|--------------|
| `unsubscribed` | -0.40 | 180 |
| `deal_lost` | -0.30 | 90 |
| `stage_regressed` | -0.25 | 60 |
| `meeting_no_show` | -0.20 | 30 |
| `email_bounced` | -0.15 | 30 |
| `task_overdue` | -0.10 | 7 |
| `call_missed` | -0.05 | 7 |

---

## Momentum Metrics (v2.0)

IRISRank v2.0 introduces predictive engagement metrics:

### Velocity
Rate of change in engagement week-over-week.
- **Formula:** `V = (E_current - E_previous) / E_previous`
- **Range:** -1.0 to 1.0
- **Interpretation:** +0.25 = 25% more engagement this week vs last week

### Acceleration
Change in velocity (second derivative).
- **Formula:** `A = V_current - V_previous`
- **Range:** -1.0 to 1.0
- **Interpretation:** Positive = engagement is speeding up

### Trend Classification
| Trend | Velocity | Acceleration | Meaning |
|-------|----------|--------------|---------|
| `accelerating` | > 0.1 | > 0 | Hot lead, increasing engagement |
| `steady` | > 0.1 | any | Consistent positive engagement |
| `decelerating` | > -0.15 | any | Slowing down |
| `at_risk` | > -0.5 | any | Declining engagement |
| `churning` | < -0.5 | any | Critical - needs immediate action |

---

## Use Cases

### Sales Operations
- **Daily Lead Prioritization:** Score leads every morning
- **Territory Optimization:** Compare regions with batch scoring
- **Pipeline Health:** Monitor deal momentum

### Marketing
- **Campaign Targeting:** Find high-momentum prospects
- **Re-engagement:** Identify at-risk contacts
- **Segment Analysis:** Insights on different cohorts

### Customer Success
- **Churn Prevention:** At-risk detection
- **Expansion Opportunities:** Find accounts with positive momentum
- **Health Scoring:** Portfolio insights

### Data Science
- **ML Features:** Use IRISRank scores as input features
- **A/B Testing:** Compare engagement across cohorts
- **Predictive Models:** Velocity/acceleration as leading indicators

---

## Rate Limits

- **Single Score:** 1000 entities per request
- **Batch Score:** 10 batches per request
- **Global:** See API rate limiting configuration

---

## Integration Examples

### Python
```python
import requests

headers = {"Authorization": f"Bearer {token}"}
payload = {
    "entities": entities,
    "query": "enterprise deal",
    "limit": 20
}

response = requests.post(
    "https://api.example.com/api/iris-rank/score",
    json=payload,
    headers=headers
)

results = response.json()["results"]
for r in results:
    print(f"{r['name']}: {r['rank']:.2f} ({r['momentum']['trend']})")
```

### JavaScript
```javascript
const response = await fetch('/api/iris-rank/score', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    entities,
    query: 'high value',
    limit: 20
  })
});

const { results } = await response.json();
const hotLeads = results.filter(r => r.momentum.trend === 'accelerating');
```

### cURL
```bash
curl -X POST https://api.example.com/api/iris-rank/score \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entities": [...], "limit": 20}'
```
