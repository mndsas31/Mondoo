<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth_middleware.php';

class SearchHistoryController {
    public static function handle($method, $endpoint) {
        $userId = require_auth();
        
        if ($method === 'GET') {
            self::getHistory($userId);
        } elseif ($method === 'POST') {
            self::saveHistory($userId);
        } elseif ($method === 'DELETE' && preg_match('/\/(\d+)$/', $endpoint, $matches)) {
            self::deleteHistory($userId, (int)$matches[1]);
        } else {
            json_response(['error' => 'Method Not Allowed'], 405);
        }
    }

    private static function getHistory($userId) {
        $db = DB::getInstance();
        $stmt = $db->prepare("SELECT media_id as id, item_json FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 8");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();
        
        $results = [];
        foreach ($rows as $row) {
            $item = json_decode($row['item_json'], true);
            if ($item) $results[] = $item;
        }
        json_response($results);
    }

    private static function saveHistory($userId) {
        $body = get_json_body();
        if (empty($body['item'])) json_response(['error' => 'Missing item'], 400);

        $item = $body['item'];
        $mediaId = $item['id'];
        
        $db = DB::getInstance();
        
        // Remove old entry if exists to avoid duplicates and update order
        $stmt = $db->prepare("DELETE FROM search_history WHERE user_id = ? AND media_id = ?");
        $stmt->execute([$userId, $mediaId]);
        
        $stmt = $db->prepare("INSERT INTO search_history (user_id, media_id, item_json) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $mediaId, json_encode($item)]);
        
        // Enforce limit of 8
        $stmt = $db->prepare("DELETE FROM search_history WHERE user_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 8) x)");
        $stmt->execute([$userId, $userId]);
        
        json_response(['success' => true]);
    }

    private static function deleteHistory($userId, $mediaId) {
        $db = DB::getInstance();
        $stmt = $db->prepare("DELETE FROM search_history WHERE user_id = ? AND media_id = ?");
        $stmt->execute([$userId, $mediaId]);
        json_response(['success' => true]);
    }
}
