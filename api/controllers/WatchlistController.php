<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth_middleware.php';

class WatchlistController {
    public static function handle($method, $endpoint) {
        $userId = require_auth();
        
        if ($method === 'GET' && $endpoint === '/watchlist') {
            self::getWatchlist($userId);
        } elseif ($method === 'POST' && $endpoint === '/watchlist/merge') {
            self::mergeWatchlist($userId);
        } elseif ($method === 'POST' && $endpoint === '/watchlist') {
            self::addToWatchlist($userId);
        } elseif ($method === 'DELETE' && preg_match('/^\/watchlist\/(\d+)$/', $endpoint, $matches)) {
            self::removeFromWatchlist($userId, (int)$matches[1]);
        } else {
            json_response(['error' => 'Method Not Allowed'], 405);
        }
    }

    private static function getWatchlist($userId) {
        $db = DB::getInstance();
        $stmt = $db->prepare("SELECT media_id as id, media_type, title, poster_path, added_at FROM watchlist WHERE user_id = ? ORDER BY added_at DESC");
        $stmt->execute([$userId]);
        json_response($stmt->fetchAll());
    }

    private static function addToWatchlist($userId) {
        $body = get_json_body();
        if (empty($body['media_id'])) json_response(['error' => 'Missing media_id'], 400);

        $db = DB::getInstance();
        $stmt = $db->prepare("INSERT IGNORE INTO watchlist (user_id, media_id, media_type, title, poster_path) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $userId, 
            $body['media_id'] ?? $body['id'], 
            $body['media_type'] ?? 'movie', 
            $body['title'] ?? $body['name'] ?? '', 
            $body['poster_path'] ?? ''
        ]);
        
        json_response(['success' => true]);
    }

    private static function removeFromWatchlist($userId, $mediaId) {
        $db = DB::getInstance();
        $stmt = $db->prepare("DELETE FROM watchlist WHERE user_id = ? AND media_id = ?");
        $stmt->execute([$userId, $mediaId]);
        json_response(['success' => true]);
    }

    private static function mergeWatchlist($userId) {
        $body = get_json_body();
        $items = $body['items'] ?? [];
        
        if (!empty($items)) {
            $db = DB::getInstance();
            $stmt = $db->prepare("INSERT IGNORE INTO watchlist (user_id, media_id, media_type, title, poster_path) VALUES (?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $stmt->execute([
                    $userId,
                    $item['id'] ?? $item['media_id'],
                    $item['media_type'] ?? 'movie',
                    $item['title'] ?? $item['name'] ?? '',
                    $item['poster_path'] ?? ''
                ]);
            }
        }
        json_response(['success' => true]);
    }
}
