/**
 * Duplicate Detection Service
 * Implements intelligent duplicate issue detection using multiple criteria
 */

const { pool } = require('../config/database');
const { compareTwoStrings } = require('string-similarity');
const { DUPLICATE_DETECTION } = require('../config/constants');

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
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

/**
 * Calculate text similarity between two strings using Dice coefficient
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Similarity score between 0 and 1
 */
const calculateTextSimilarity = (text1, text2) => {
    // Normalize text: lowercase and remove extra whitespace
    const normalize = (text) => text.toLowerCase().trim().replace(/\s+/g, ' ');
    
    const normalizedText1 = normalize(text1);
    const normalizedText2 = normalize(text2);
    
    return compareTwoStrings(normalizedText1, normalizedText2);
};

/**
 * Find duplicate issue based on multiple criteria
 * 
 * Duplicate Detection Criteria (ALL must match):
 * 1. Same organization
 * 2. Status is NOT RESOLVED
 * 3. Created within last 48 hours (configurable)
 * 4. Location distance ≤ 100 meters (if location exists)
 * 5. Text similarity (title + description) ≥ 0.7 (configurable)
 * 
 * @param {Object} issueData - New issue data
 * @returns {Object|null} Existing duplicate issue or null
 */
const findDuplicateIssue = async (issueData) => {
    const { title, description, organization_id, latitude, longitude } = issueData;

    try {
        // Step 1-3: Query database for potential duplicates
        // Same organization, not resolved, within time window
        const timeWindowHours = DUPLICATE_DETECTION.TIME_WINDOW_HOURS;
        
        const [potentialDuplicates] = await pool.query(
            `SELECT id, title, description, latitude, longitude, status, created_at
             FROM issues
             WHERE organization_id = ?
               AND status != 'RESOLVED'
               AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
             ORDER BY created_at DESC`,
            [organization_id, timeWindowHours]
        );

        // If no potential duplicates found, return null
        if (potentialDuplicates.length === 0) {
            return null;
        }

        // Combine title and description for text comparison
        const newIssueText = `${title} ${description}`;

        // Step 4-5: Check each potential duplicate
        for (const existingIssue of potentialDuplicates) {
            let isLocationMatch = true;
            let isTextMatch = false;

            // Check location similarity (if both issues have location)
            if (latitude && longitude && existingIssue.latitude && existingIssue.longitude) {
                const distance = calculateDistance(
                    latitude,
                    longitude,
                    existingIssue.latitude,
                    existingIssue.longitude
                );

                isLocationMatch = distance <= DUPLICATE_DETECTION.DISTANCE_METERS;

                // If location doesn't match, skip this issue
                if (!isLocationMatch) {
                    continue;
                }
            }

            // Check text similarity
            const existingIssueText = `${existingIssue.title} ${existingIssue.description}`;
            const similarity = calculateTextSimilarity(newIssueText, existingIssueText);

            isTextMatch = similarity >= DUPLICATE_DETECTION.SIMILARITY_THRESHOLD;

            // If all criteria match, we found a duplicate
            if (isLocationMatch && isTextMatch) {
                return {
                    id: existingIssue.id,
                    title: existingIssue.title,
                    status: existingIssue.status,
                    created_at: existingIssue.created_at,
                    similarity_score: similarity.toFixed(2)
                };
            }
        }

        // No duplicate found
        return null;

    } catch (error) {
        console.error('Error in duplicate detection:', error);
        throw error;
    }
};

module.exports = {
    findDuplicateIssue,
    calculateDistance,
    calculateTextSimilarity
};
