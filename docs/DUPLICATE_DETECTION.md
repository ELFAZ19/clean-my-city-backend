# Duplicate Detection Algorithm

**Technical Deep-Dive into Intelligent Issue Duplicate Detection**

---

## Overview

The duplicate detection system prevents citizens from creating redundant issue reports by identifying similar existing issues using a multi-criteria matching algorithm. This ensures efficient resource allocation and prevents duplicate work for organizations.

---

## Algorithm Criteria

An issue is considered a **duplicate** if and only if **ALL** of the following criteria match:

### 1. Same Organization ✓
- **Purpose**: Issues must be assigned to the same responsible organization
- **Rationale**: Different organizations handle different types of issues
- **Implementation**: Direct comparison of `organization_id`

### 2. Status NOT RESOLVED ✓
- **Purpose**: Only consider active issues
- **Rationale**: Resolved issues are closed and should not prevent new reports
- **Implementation**: Filter where `status != 'RESOLVED'`

### 3. Created Within Time Window ✓
- **Purpose**: Only recent issues are considered
- **Default**: 24 hours (configurable)
- **Rationale**: Issues older than the time window are likely different occurrences
- **Implementation**: `created_at >= NOW() - INTERVAL '48 hours'`

### 4. Location Proximity ✓
- **Purpose**: Issues must be geographically close
- **Threshold**: 100 meters (configurable)
- **Rationale**: Issues far apart are different problems
- **Implementation**: Haversine formula for GPS distance calculation
- **Note**: Only applies if both issues have location data

### 5. Text Similarity ✓
- **Purpose**: Issue descriptions must be similar
- **Threshold**: 0.7 similarity score (70%, configurable)
- **Rationale**: Ensures the issues describe the same problem
- **Implementation**: Dice coefficient algorithm on combined title + description
- **Algorithm**: String-similarity library (Sørensen-Dice coefficient)

---

## Algorithm Flow

```
┌─────────────────────────────────────┐
│  New Issue Submitted                │
│  - title                            │
│  - description                      │
│  - organization_id                  │
│  - latitude, longitude (optional)   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Step 1: Database Query             │
│  Filter by:                         │
│  - Same organization_id             │
│  - Status != RESOLVED               │
│  - Created within 48 hours          │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────────────┐
        │ Any matches? │
        └──────┬───────┘
               │
        ┌──────┴──────┐
        │             │
       NO            YES
        │             │
        ▼             ▼
   ┌────────┐   ┌─────────────────────────────┐
   │ CREATE │   │ Step 2: Location Check      │
   │  NEW   │   │ If both have coordinates:   │
   │ ISSUE  │   │ - Calculate distance        │
   └────────┘   │ - Distance <= 100m?         │
                └──────────┬──────────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                   NO            YES
                    │             │
                    │             ▼
                    │   ┌─────────────────────────────┐
                    │   │ Step 3: Text Similarity     │
                    │   │ - Combine title+description │
                    │   │ - Calculate Dice coefficient│
                    │   │ - Similarity >= 0.7?        │
                    │   └──────────┬──────────────────┘
                    │              │
                    │       ┌──────┴──────┐
                    │       │             │
                    │      NO            YES
                    │       │             │
                    └───────┴─────┐       │
                                  │       │
                                  ▼       ▼
                            ┌────────┐  ┌──────────────┐
                            │ CREATE │  │   RETURN     │
                            │  NEW   │  │  EXISTING    │
                            │ ISSUE  │  │   ISSUE      │
                            └────────┘  └──────────────┘
```

---

## Implementation Details

### Distance Calculation (Haversine Formula)

The Haversine formula calculates the great-circle distance between two points on Earth given their latitude and longitude.

**Formula:**
```
a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1−a))
d = R × c
```

Where:
- φ = latitude in radians
- λ = longitude in radians
- R = Earth's radius (6,371,000 meters)
- d = distance in meters

**JavaScript Implementation:**
```javascript
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};
```

---

### Text Similarity (Dice Coefficient)

The Sørensen-Dice coefficient measures the similarity between two strings based on bigrams (pairs of consecutive characters).

**Formula:**
```
Similarity = (2 × |common bigrams|) / (|bigrams in text1| + |bigrams in text2|)
```

**Example:**
- Text 1: "broken street light"
- Text 2: "street light broken"
- Bigrams in Text 1: [br, ro, ok, ke, en, n , sp, st, tr, re, ee, et, t , li, ig, gh, ht]
- Bigrams in Text 2: [st, tr, re, ee, et, t , li, ig, gh, ht, t , br, ro, ok, ke, en]
- Common bigrams: 16
- Similarity = (2 × 16) / (17 + 16) = 32/33 = 0.97 (97%)

**JavaScript Implementation:**
```javascript
const { compareTwoStrings } = require('string-similarity');

const calculateTextSimilarity = (text1, text2) => {
    // Normalize: lowercase and remove extra whitespace
    const normalize = (text) => text.toLowerCase().trim().replace(/\s+/g, ' ');
    
    const normalizedText1 = normalize(text1);
    const normalizedText2 = normalize(text2);
    
    return compareTwoStrings(normalizedText1, normalizedText2);
};
```

---

## Pseudocode

```
FUNCTION findDuplicateIssue(newIssue):
    // Step 1: Query database for potential duplicates
    potentialDuplicates = DATABASE.query(
        SELECT * FROM issues
        WHERE organization_id = newIssue.organization_id
          AND status != 'RESOLVED'
          AND created_at >= NOW() - 48 HOURS
        ORDER BY created_at DESC
    )
    
    // If no potential duplicates, return null
    IF potentialDuplicates.isEmpty():
        RETURN null
    
    // Combine title and description for comparison
    newIssueText = newIssue.title + " " + newIssue.description
    
    // Step 2-3: Check each potential duplicate
    FOR EACH existingIssue IN potentialDuplicates:
        locationMatch = true
        textMatch = false
        
        // Check location similarity (if both have coordinates)
        IF newIssue.hasLocation() AND existingIssue.hasLocation():
            distance = calculateDistance(
                newIssue.latitude, newIssue.longitude,
                existingIssue.latitude, existingIssue.longitude
            )
            locationMatch = (distance <= 100) // 100 meters
            
            // Skip if location doesn't match
            IF NOT locationMatch:
                CONTINUE
        
        // Check text similarity
        existingIssueText = existingIssue.title + " " + existingIssue.description
        similarity = calculateTextSimilarity(newIssueText, existingIssueText)
        textMatch = (similarity >= 0.7) // 70% threshold
        
        // If all criteria match, we found a duplicate
        IF locationMatch AND textMatch:
            RETURN existingIssue
    
    // No duplicate found
    RETURN null

FUNCTION createIssue(issueData, userId):
    // Check for duplicates
    duplicate = findDuplicateIssue(issueData)
    
    IF duplicate IS NOT null:
        RETURN {
            isDuplicate: true,
            message: "A similar issue already exists",
            existingIssue: duplicate
        }
    
    // Create new issue
    newIssue = DATABASE.insert(issueData, userId)
    
    RETURN {
        isDuplicate: false,
        message: "Issue created successfully",
        issue: newIssue
    }
```

---

## Example Scenarios

### Scenario 1: Exact Duplicate Detected

**Existing Issue:**
- Title: "Broken street light on Main Street"
- Description: "The street light at the corner of Main St and 5th Ave is not working"
- Organization: Electricity Department (ID: 1)
- Location: (40.7128, -74.0060)
- Status: PENDING
- Created: 2026-01-09 10:00:00

**New Issue Attempt:**
- Title: "Street light not working on Main St"
- Description: "Street light at Main and 5th is broken"
- Organization: Electricity Department (ID: 1)
- Location: (40.7130, -74.0062)
- Time: 2026-01-09 14:00:00

**Analysis:**
1. ✅ Same organization (ID: 1)
2. ✅ Status is PENDING (not resolved)
3. ✅ Within 48 hours (4 hours difference)
4. ✅ Distance: ~25 meters (within 100m threshold)
5. ✅ Text similarity: 0.78 (above 0.7 threshold)

**Result:** DUPLICATE DETECTED - Return existing issue #1

---

### Scenario 2: Different Location - Not a Duplicate

**Existing Issue:**
- Title: "Water leak on Oak Street"
- Organization: Water Department (ID: 2)
- Location: (40.7128, -74.0060)
- Status: IN_PROGRESS

**New Issue Attempt:**
- Title: "Water leak on Oak Street"
- Organization: Water Department (ID: 2)
- Location: (40.7500, -74.0500) // 5 km away
- Time: Same day

**Analysis:**
1. ✅ Same organization
2. ✅ Not resolved
3. ✅ Within 48 hours
4. ❌ Distance: ~5000 meters (exceeds 100m threshold)

**Result:** NOT A DUPLICATE - Create new issue

---

### Scenario 3: Different Problem - Not a Duplicate

**Existing Issue:**
- Title: "Pothole on Elm Street"
- Description: "Large pothole causing damage to cars"
- Organization: Roads Department (ID: 3)
- Location: (40.7128, -74.0060)

**New Issue Attempt:**
- Title: "Broken traffic light on Elm Street"
- Description: "Traffic light not changing colors"
- Organization: Roads Department (ID: 3)
- Location: (40.7129, -74.0061) // Same location
- Time: Same day

**Analysis:**
1. ✅ Same organization
2. ✅ Not resolved
3. ✅ Within 48 hours
4. ✅ Distance: ~15 meters
5. ❌ Text similarity: 0.25 (below 0.7 threshold)

**Result:** NOT A DUPLICATE - Create new issue

---

### Scenario 4: Old Issue - Not a Duplicate

**Existing Issue:**
- Title: "Broken street light on Main Street"
- Organization: Electricity Department (ID: 1)
- Location: (40.7128, -74.0060)
- Status: RESOLVED
- Created: 2026-01-01 (9 days ago)
- Resolved: 2026-01-02

**New Issue Attempt:**
- Title: "Broken street light on Main Street"
- Organization: Electricity Department (ID: 1)
- Location: (40.7128, -74.0060)
- Time: 2026-01-09

**Analysis:**
1. ✅ Same organization
2. ❌ Status is RESOLVED (excluded from search)

**Result:** NOT A DUPLICATE - Create new issue (could be a new occurrence)

---

## Performance Considerations

### Database Optimization

1. **Composite Index**
   ```sql
   INDEX idx_duplicate_detection (organization_id, status, created_at)
   ```
   - Optimizes the initial query filtering
   - Reduces query time from O(n) to O(log n)

2. **Spatial Index**
   ```sql
   INDEX idx_location (latitude, longitude)
   ```
   - Improves geospatial queries
   - Future enhancement: Use PostgreSQL PostGIS for native spatial queries

3. **Query Limit**
   - Only fetch issues from the last 48 hours
   - Reduces the number of records to process

### Algorithm Complexity

- **Time Complexity**: O(n × m)
  - n = number of potential duplicates (limited by time window)
  - m = average text length (for similarity calculation)
  
- **Space Complexity**: O(n)
  - Stores potential duplicates in memory

### Optimization Strategies

1. **Early Exit**
   - Stop checking once a duplicate is found
   - Skip issues that fail location check

2. **Caching** (Future Enhancement)
   - Cache recent duplicate checks
   - TTL: 5 minutes
   - Reduces database queries

3. **Parallel Processing** (Future Enhancement)
   - Process similarity calculations in parallel
   - Use worker threads for large datasets

---

## Configuration

All thresholds are configurable via environment variables:

```env
# Time window in hours (default: 48)
DUPLICATE_TIME_WINDOW_HOURS=48

# Distance threshold in meters (default: 100)
DUPLICATE_DISTANCE_METERS=100

# Text similarity threshold 0.0-1.0 (default: 0.7)
DUPLICATE_SIMILARITY_THRESHOLD=0.7
```

---

## Testing Recommendations

### Unit Tests

1. **Distance Calculation**
   - Test known GPS coordinates
   - Verify accuracy within 1 meter

2. **Text Similarity**
   - Test identical strings (should return 1.0)
   - Test completely different strings (should return ~0.0)
   - Test similar strings with typos

3. **Duplicate Detection**
   - Test all 5 criteria independently
   - Test edge cases (exactly 48 hours, exactly 100 meters, exactly 0.7 similarity)

### Integration Tests

1. **End-to-End Flow**
   - Create issue → Attempt duplicate → Verify response
   - Test with real database

2. **Performance Tests**
   - Test with 1000+ existing issues
   - Measure response time (should be < 500ms)

---

## Future Enhancements

1. **Machine Learning**
   - Train ML model on historical duplicates
   - Improve similarity detection accuracy

2. **Image Comparison**
   - Compare uploaded images using computer vision
   - Detect similar scenes/objects

3. **Fuzzy Location Matching**
   - Use address geocoding
   - Match by street name/area

4. **User Feedback**
   - Allow users to confirm/reject duplicate suggestions
   - Learn from user decisions

---

**For implementation details, see [src/services/duplicateDetection.js](../src/services/duplicateDetection.js)**
