<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth_middleware.php';

class SourcesController {
    public static function handle($method, $endpoint) {
        $pathParts = explode('/', trim($endpoint, '/'));
        
        // Public route: GET /api/sources/{type}/{id}
        if ($method === 'GET' && count($pathParts) >= 3) {
            self::getSources($pathParts[1], $pathParts[2]);
            return;
        }
        
        // Auth required: POST /api/sources/report
        if ($method === 'POST' && count($pathParts) === 2 && $pathParts[1] === 'report') {
            self::reportSource();
            return;
        }
        
        // Admin required for all other routes
        $admin = require_admin();
        
        if ($method === 'POST' && count($pathParts) === 1) {
            self::addSource($admin['user_id']);
        } elseif ($method === 'PUT' && count($pathParts) === 2) {
            self::updateSource($pathParts[1]);
        } elseif ($method === 'DELETE' && count($pathParts) === 2) {
            self::deleteSource($pathParts[1]);
        } else {
            json_response(['error' => 'Not Found'], 404);
        }
    }

    private static function getSources($mediaType, $mediaId) {
        $pdo = DB::getInstance();
        $season = isset($_GET['season']) ? (int)$_GET['season'] : null;
        $episode = isset($_GET['episode']) ? (int)$_GET['episode'] : null;
        
        $sql = "SELECT id, server_key, source, quality, language, priority FROM media_sources WHERE media_type = ? AND media_id = ? AND is_active = 1";
        $params = [$mediaType, $mediaId];
        
        if ($season !== null && $episode !== null) {
            $sql .= " AND coalesce(season,0) = ? AND coalesce(episode,0) = ?";
            $params[] = $season;
            $params[] = $episode;
        } else {
            $sql .= " AND season IS NULL AND episode IS NULL";
        }
        $sql .= " ORDER BY priority DESC, id ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        json_response(['sources' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    private static function addSource($adminId) {
        $pdo = DB::getInstance();
        $data = json_decode(file_get_contents('php://input'), true);
        
        $allowedServers = ['vidking','streamtape','doodstream','vidcloud','mixdrop','filemoon','upstream'];
        if (!in_array($data['server_key'], $allowedServers)) json_response(['error' => 'Invalid server_key'], 400);
        
        $source = $data['source'];
        if (!preg_match('/^https?:\/\//', $source) && !preg_match('/^[A-Za-z0-9_-]{4,128}$/', $source)) {
            json_response(['error' => 'Invalid source format'], 400);
        }

        // Handle logical unique constraint safely since season/episode can be NULL
        $check = $pdo->prepare("SELECT id FROM media_sources WHERE media_id=? AND media_type=? AND server_key=? AND source=? AND coalesce(season,0)=coalesce(?,0) AND coalesce(episode,0)=coalesce(?,0)");
        $check->execute([$data['media_id'], $data['media_type'], $data['server_key'], $source, $data['season'] ?? 0, $data['episode'] ?? 0]);
        $row = $check->fetch();

        if ($row) {
            $pdo->prepare("UPDATE media_sources SET quality=?, language=?, priority=?, is_active=1 WHERE id=?")
                ->execute([$data['quality'] ?? null, $data['language'] ?? null, $data['priority'] ?? 0, $row['id']]);
            $id = $row['id'];
        } else {
            $pdo->prepare("INSERT INTO media_sources (media_id, media_type, season, episode, server_key, source, quality, language, priority, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                ->execute([$data['media_id'], $data['media_type'], $data['season'] ?? null, $data['episode'] ?? null, $data['server_key'], $source, $data['quality'] ?? null, $data['language'] ?? null, $data['priority'] ?? 0, $adminId]);
            $id = $pdo->lastInsertId();
        }

        $fetch = $pdo->prepare("SELECT * FROM media_sources WHERE id=?");
        $fetch->execute([$id]);
        json_response($fetch->fetch(PDO::FETCH_ASSOC));
    }

    private static function updateSource($id) {
        $pdo = DB::getInstance();
        $data = json_decode(file_get_contents('php://input'), true);
        $updates = []; $params = [];
        foreach (['is_active', 'priority', 'quality', 'language'] as $field) {
            if (isset($data[$field])) {
                $updates[] = "$field = ?";
                $params[] = $data[$field];
            }
        }
        if (empty($updates)) json_response(['success' => true]);
        
        $params[] = $id;
        $pdo->prepare("UPDATE media_sources SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
        json_response(['success' => true]);
    }

    private static function deleteSource($id) {
        $pdo = DB::getInstance();
        $pdo->prepare("DELETE FROM media_sources WHERE id = ?")->execute([$id]);
        json_response(['success' => true]);
    }

    private static function reportSource() {
        require_auth(); // Logged in users only
        $pdo = DB::getInstance();
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['source_id'] ?? null;
        if (!$id) json_response(['error' => 'source_id required'], 400);
        
        $pdo->prepare("UPDATE media_sources SET reports = reports + 1 WHERE id = ?")->execute([$id]);
        $pdo->prepare("UPDATE media_sources SET is_active = 0 WHERE id = ? AND reports >= 5")->execute([$id]);
        
        json_response(['success' => true]);
    }
}
