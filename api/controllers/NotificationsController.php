<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth_middleware.php';

class NotificationsController {
    public static function handle($method, $endpoint) {
        $userId = require_auth();
        
        if ($method === 'GET' && $endpoint === '/notifications') {
            self::checkTmdbUpdates();
            self::getNotifications($userId);
        } elseif ($method === 'PUT' && preg_match('/^\/notifications\/(\d+)\/read$/', $endpoint, $matches)) {
            self::markRead($userId, (int)$matches[1]);
        } elseif ($method === 'PUT' && $endpoint === '/notifications/read-all') {
            self::markAllRead($userId);
        } else {
            json_response(['error' => 'Method Not Allowed'], 405);
        }
    }

    private static function checkTmdbUpdates() {
        $db = DB::getInstance();
        $stmt = $db->prepare("SELECT value FROM settings WHERE key_name = 'last_tmdb_check'");
        $stmt->execute();
        $row = $stmt->fetch();
        
        $now = time();
        $lastCheck = $row ? (int)$row['value'] : 0;
        
        // Rate limit TMDB checks to once per hour (3600 seconds)
        if ($now - $lastCheck < 3600) return;
        
        // Update check time
        $stmt = $db->prepare("INSERT INTO settings (key_name, value) VALUES ('last_tmdb_check', ?) ON DUPLICATE KEY UPDATE value = ?");
        $stmt->execute([(string)$now, (string)$now]);
        
        // Fetch new releases from TMDB
        $url = "https://api.themoviedb.org/3/movie/now_playing?api_key=" . TMDB_API_KEY . "&language=en-US&page=1";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if (!$response || $httpCode !== 200) {
            // Try fallback file_get_contents if cURL failed/blocked
            $context = stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => true]]);
            $response = @file_get_contents($url, false, $context);
            if (!$response) return;
        }
        
        $data = json_decode($response, true);
        if (empty($data['results'])) return;
        
        $movies = array_slice($data['results'], 0, 3); // top 3
        
        $stmtUser = $db->prepare("SELECT id FROM users");
        $stmtUser->execute();
        $users = $stmtUser->fetchAll();
        if (empty($users)) return;
        
        $stmtCheck = $db->prepare("SELECT id FROM notifications WHERE title = ? AND message = ?");
        $stmtInsert = $db->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)");
        
        foreach ($movies as $movie) {
            $title = "New Release: " . $movie['title'];
            $msg = $movie['overview'];
            
            $stmtCheck->execute([$title, $msg]);
            if ($stmtCheck->fetch()) continue; // already sent
            
            foreach ($users as $u) {
                $stmtInsert->execute([$u['id'], $title, $msg]);
            }
        }
    }

    private static function getNotifications($userId) {
        $db = DB::getInstance();
        $stmt = $db->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50");
        $stmt->execute([$userId]);
        $items = $stmt->fetchAll();
        
        $unread = 0;
        foreach ($items as $item) {
            if (!$item['is_read']) $unread++;
        }
        
        json_response(['items' => $items, 'unread' => $unread]);
    }

    private static function markRead($userId, $notifId) {
        $db = DB::getInstance();
        $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?");
        $stmt->execute([$userId, $notifId]);
        json_response(['success' => true]);
    }

    private static function markAllRead($userId) {
        $db = DB::getInstance();
        $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?");
        $stmt->execute([$userId]);
        json_response(['success' => true]);
    }
}
