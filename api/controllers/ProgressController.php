<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth_middleware.php';

class ProgressController {
    public static function handle($method, $endpoint) {
        $userId = require_auth();
        
        if ($method === 'GET' && $endpoint === '/progress') {
            self::getProgress($userId);
        } elseif ($method === 'POST' && $endpoint === '/progress') {
            self::saveProgress($userId);
        } else {
            json_response(['error' => 'Method Not Allowed'], 405);
        }
    }

    private static function getProgress($userId) {
        $db = DB::getInstance();
        $stmt = $db->prepare("SELECT * FROM user_progress WHERE user_id = ? ORDER BY last_watched DESC");
        $stmt->execute([$userId]);
        json_response($stmt->fetchAll());
    }

    private static function saveProgress($userId) {
        $body = get_json_body();
        if (empty($body['media_id']) || empty($body['media_type'])) {
            json_response(['error' => 'Missing fields'], 400);
        }

        $db = DB::getInstance();
        
        $mediaId = $body['media_id'];
        $mediaType = $body['media_type'];
        $season = $body['season'] ?? null;
        $episode = $body['episode'] ?? null;
        $progress = $body['progress_seconds'] ?? 0;
        $duration = $body['duration_seconds'] ?? 0;

        $stmt = $db->prepare("INSERT INTO user_progress 
            (user_id, media_id, media_type, season, episode, progress_seconds, duration_seconds) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            progress_seconds = VALUES(progress_seconds), 
            duration_seconds = VALUES(duration_seconds),
            last_watched = CURRENT_TIMESTAMP");
            
        $stmt->execute([$userId, $mediaId, $mediaType, $season, $episode, $progress, $duration]);
        
        json_response(['success' => true]);
    }
}
