<?php

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth_middleware.php';

class PartyController {
    private static function getPdo() {
        global $pdo;
        if ($pdo instanceof PDO) {
            return $pdo;
        }
        $db = DB::getInstance();
        $GLOBALS['pdo'] = $db;
        return $db;
    }

    public static function handle($method, $endpoint) {
        $user = get_optional_auth();
        $userId = is_array($user) ? ($user['user_id'] ?? 1) : $user;
        
        $pathParts = explode('/', trim($endpoint, '/'));
        
        // POST /api/party or POST /api/watch-party
        if ($method === 'POST' && count($pathParts) === 1) {
            self::createParty($userId);
            return;
        }
        
        // GET /api/party/mine
        if ($method === 'GET' && count($pathParts) === 2 && $pathParts[1] === 'mine') {
            self::getMyParties($userId);
            return;
        }

        // POST /api/party/create
        if ($method === 'POST' && count($pathParts) === 2 && $pathParts[1] === 'create') {
            self::createParty($userId);
            return;
        }

        if (count($pathParts) >= 2) {
            $code = $pathParts[1];
            
            // Auto-end parties inactive for > 6 hours across the board when any party endpoint is hit
            self::cleanupInactiveParties();
            
            $action = $pathParts[2] ?? null;

            if ($method === 'GET' && !$action) {
                self::getParty($userId, $code);
            } elseif ($method === 'POST' && $action === 'join') {
                self::joinParty($userId, $code);
            } elseif ($method === 'POST' && $action === 'leave') {
                self::leaveParty($userId, $code);
            } elseif ($method === 'POST' && $action === 'end') {
                self::endParty($userId, $code);
            } elseif ($method === 'POST' && $action === 'state') {
                self::updateState($userId, $code);
            } elseif ($method === 'POST' && $action === 'settings') {
                self::updateSettings($userId, $code);
            } elseif ($method === 'POST' && $action === 'kick') {
                self::kickMember($userId, $code);
            } elseif ($method === 'GET' && $action === 'sync') {
                self::sync($userId, $code);
            } elseif ($method === 'POST' && $action === 'message') {
                self::sendMessage($userId, $code, 'chat');
            } elseif ($method === 'POST' && $action === 'reaction') {
                self::sendMessage($userId, $code, 'reaction');
            } else {
                json_response(['error' => 'Not Found', 'endpoint' => $endpoint], 404);
            }
        } else {
            json_response(['error' => 'Not Found', 'endpoint' => $endpoint], 404);
        }
    }

    private static function cleanupInactiveParties() {
        try {
            $pdo = self::getPdo();
            if (!$pdo) return;
            // Inactive if state_updated_at > 6 hours ago
            $stmt = $pdo->prepare("UPDATE watch_parties SET is_active = 0, ended_at = CURRENT_TIMESTAMP WHERE is_active = 1 AND state_updated_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 6 HOUR)");
            $stmt->execute();
        } catch (Throwable $e) {
            // Log but don't fail user request
            error_log('[WatchParty Cleanup Error] ' . $e->getMessage());
        }
    }

    private static function generateCode() {
        $chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I, O, 0, 1
        $code = '';
        for ($i = 0; $i < 6; $i++) {
            $code .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $code;
    }

    private static function createParty($userId) {
        $pdo = self::getPdo();
        $data = get_json_body();
        
        $mediaId = $data['media_id'] ?? $data['mediaId'] ?? null;
        $mediaType = $data['media_type'] ?? $data['mediaType'] ?? 'movie';
        $season = isset($data['season']) ? (int)$data['season'] : null;
        $episode = isset($data['episode']) ? (int)$data['episode'] : null;
        $title = trim($data['title'] ?? 'Watch Party');
        $posterPath = $data['poster_path'] ?? $data['posterPath'] ?? null;
        $displayName = trim($data['displayName'] ?? $data['display_name'] ?? '');
        $onlyHostControls = !empty($data['only_host_controls'] ?? $data['hostOnly'] ?? true);

        if (!$mediaId) {
            json_response(['error' => 'Invalid media data: media_id is required'], 400);
        }

        if (!in_array($mediaType, ['movie', 'tv'], true)) {
            $mediaType = 'movie';
        }

        // If display name provided and user is guest/anon, update user's display name
        if ($displayName !== '' && $userId) {
            try {
                $cleanName = mb_substr(strip_tags($displayName), 0, 32, 'UTF-8');
                if ($cleanName !== '') {
                    $upd = $pdo->prepare("UPDATE users SET username = ? WHERE id = ?");
                    $upd->execute([$cleanName, $userId]);
                }
            } catch (Throwable $e) {}
        }

        $code = self::generateCode();
        
        // Ensure unique code
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $stmt = $pdo->prepare("SELECT id FROM watch_parties WHERE UPPER(code) = ?");
            $stmt->execute([strtoupper($code)]);
            if (!$stmt->fetch()) break;
            $code = self::generateCode();
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO watch_parties (code, host_user_id, media_id, media_type, season, episode, title, poster_path, only_host_controls, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");
            $stmt->execute([$code, $userId, $mediaId, $mediaType, $season, $episode, $title, $posterPath, $onlyHostControls ? 1 : 0]);
        } catch (Throwable $e) {
            $stmt = $pdo->prepare("INSERT INTO watch_parties (code, host_user_id, media_id, media_type, season, episode, title, poster_path, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)");
            $stmt->execute([$code, $userId, $mediaId, $mediaType, $season, $episode, $title, $posterPath]);
        }
        
        $partyId = $pdo->lastInsertId();
        
        // Host joins
        try {
            $stmt = $pdo->prepare("INSERT INTO party_members (party_id, user_id) VALUES (?, ?)");
            $stmt->execute([$partyId, $userId]);
            
            // System message
            $stmt = $pdo->prepare("INSERT INTO party_messages (party_id, user_id, kind, body) VALUES (?, ?, 'system', '🎬 Watch Party created')");
            $stmt->execute([$partyId, $userId]);
        } catch (Throwable $e) {}

        $nowMs = floor(microtime(true) * 1000);
        json_response([
            'ok' => true,
            'code' => $code,
            'server_time' => $nowMs,
            'room' => [
                'code' => $code,
                'mediaId' => $mediaId,
                'hostId' => (string)$userId,
                'hostOnly' => (bool)$onlyHostControls,
                'displayName' => $displayName ?: 'Party Host'
            ]
        ]);
    }

    private static function getPartyId($code) {
        $pdo = self::getPdo();
        $cleanCode = strtoupper(trim($code));
        $stmt = $pdo->prepare("SELECT * FROM watch_parties WHERE UPPER(code) = ? AND is_active = 1");
        $stmt->execute([$cleanCode]);
        $party = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$party) {
            $stmtAll = $pdo->prepare("SELECT id, is_active FROM watch_parties WHERE UPPER(code) = ?");
            $stmtAll->execute([$cleanCode]);
            $ended = $stmtAll->fetch(PDO::FETCH_ASSOC);
            if ($ended) {
                json_response(['error' => 'This watch party has ended.'], 404);
            }
            json_response(['error' => 'Watch party not found. Please verify the code and try again.'], 404);
        }
        return $party;
    }

    private static function getParty($userId, $code) {
        $pdo = self::getPdo();
        $party = self::getPartyId($code);
        
        $stmt = $pdo->prepare("
            SELECT pm.user_id, u.username, pm.last_seen_at
            FROM party_members pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.party_id = ? AND pm.left_at IS NULL
        ");
        $stmt->execute([$party['id']]);
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $hasHost = false;
        $formattedMembers = array_map(function($m) use ($party, $userId, &$hasHost) {
            $lastSeenTime = strtotime($m['last_seen_at'] ?? 'now');
            $isOnline = ($m['user_id'] == $userId) || ((time() - $lastSeenTime) <= 60);
            $isHostUser = ($m['user_id'] == $party['host_user_id']);
            if ($isHostUser) $hasHost = true;
            return [
                'id' => (string)$m['user_id'],
                'user_id' => $m['user_id'],
                'name' => $m['username'] ?: 'Viewer',
                'is_host' => $isHostUser,
                'online' => $isOnline
            ];
        }, $members);

        if (!$hasHost && !empty($party['host_user_id'])) {
            $stmtHost = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $stmtHost->execute([$party['host_user_id']]);
            $hostName = $stmtHost->fetchColumn() ?: 'Host';
            array_unshift($formattedMembers, [
                'id' => (string)$party['host_user_id'],
                'user_id' => $party['host_user_id'],
                'name' => $hostName,
                'is_host' => true,
                'online' => true
            ]);
        }

        json_response([
            'ok' => true,
            'party' => [
                'id' => (int)$party['id'],
                'code' => $party['code'],
                'host_user_id' => $party['host_user_id'],
                'media_id' => (int)$party['media_id'],
                'media_type' => $party['media_type'],
                'season' => $party['season'] !== null ? (int)$party['season'] : null,
                'episode' => $party['episode'] !== null ? (int)$party['episode'] : null,
                'title' => $party['title'],
                'poster_path' => $party['poster_path'],
                'is_playing' => (bool)$party['is_playing'],
                'position_seconds' => (float)$party['position_seconds'],
                'state_updated_at' => $party['state_updated_at'],
                'server_key' => $party['server_key'] ?? null,
                'version' => (int)$party['version'],
                'is_active' => (bool)$party['is_active'],
                'only_host_controls' => isset($party['only_host_controls']) ? (bool)$party['only_host_controls'] : true,
                'created_at' => $party['created_at'],
                'ended_at' => $party['ended_at']
            ],
            'members' => $formattedMembers,
            'is_host' => ((string)$party['host_user_id'] === (string)$userId),
            'server_time' => floor(microtime(true) * 1000)
        ]);
    }

    private static function joinParty($userId, $code) {
        $pdo = self::getPdo();
        $party = self::getPartyId($code);
        $partyId = $party['id'];

        $body = get_json_body();
        $displayName = trim($body['name'] ?? $body['displayName'] ?? '');
        if ($displayName !== '' && $userId) {
            try {
                $cleanName = mb_substr(strip_tags($displayName), 0, 32, 'UTF-8');
                if ($cleanName !== '') {
                    $upd = $pdo->prepare("UPDATE users SET username = ? WHERE id = ?");
                    $upd->execute([$cleanName, $userId]);
                }
            } catch (Throwable $e) {}
        }

        $stmt = $pdo->prepare("SELECT id FROM party_members WHERE party_id = ? AND user_id = ?");
        $stmt->execute([$partyId, $userId]);
        $existing = $stmt->fetch();

        $stmtUser = $pdo->prepare("SELECT username FROM users WHERE id = ?");
        $stmtUser->execute([$userId]);
        $username = $stmtUser->fetchColumn() ?: ($displayName ?: 'Guest');

        if ($existing) {
            $stmt = $pdo->prepare("UPDATE party_members SET left_at = NULL, last_seen_at = CURRENT_TIMESTAMP WHERE party_id = ? AND user_id = ?");
            $stmt->execute([$partyId, $userId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO party_members (party_id, user_id) VALUES (?, ?)");
            $stmt->execute([$partyId, $userId]);
        }

        // Add system message if not host joining for first time
        if ($party['host_user_id'] != $userId) {
            $stmt = $pdo->prepare("INSERT INTO party_messages (party_id, user_id, kind, body) VALUES (?, ?, 'system', ?)");
            $stmt->execute([$partyId, $userId, "$username joined the party"]);
        }

        json_response(['success' => true, 'ok' => true, 'server_time' => floor(microtime(true) * 1000)]);
    }

    private static function leaveParty($userId, $code) {
        $pdo = self::getPdo();
        $party = self::getPartyId($code);
        $partyId = $party['id'];

        $stmt = $pdo->prepare("UPDATE party_members SET left_at = CURRENT_TIMESTAMP WHERE party_id = ? AND user_id = ?");
        $stmt->execute([$partyId, $userId]);

        $stmtUser = $pdo->prepare("SELECT username FROM users WHERE id = ?");
        $stmtUser->execute([$userId]);
        $username = $stmtUser->fetchColumn() ?: 'Viewer';

        if ($party['host_user_id'] == $userId) {
            $stmt = $pdo->prepare("UPDATE watch_parties SET is_active = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$partyId]);
            $stmt = $pdo->prepare("INSERT INTO party_messages (party_id, user_id, kind, body) VALUES (?, ?, 'system', 'Host ended the party')");
            $stmt->execute([$partyId, $userId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO party_messages (party_id, user_id, kind, body) VALUES (?, ?, 'system', ?)");
            $stmt->execute([$partyId, $userId, "$username left the party"]);
        }

        json_response(['success' => true, 'server_time' => floor(microtime(true) * 1000)]);
    }

    private static function endParty($userId, $code) {
        $pdo = self::getPdo();
        $party = self::getPartyId($code);
        $partyId = $party['id'];

        if ((string)$party['host_user_id'] !== (string)$userId) {
            json_response(['error' => 'Only host can end the watch party'], 403);
        }

        $stmt = $pdo->prepare("UPDATE watch_parties SET is_active = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$partyId]);
        
        $stmt = $pdo->prepare("INSERT INTO party_messages (party_id, user_id, kind, body) VALUES (?, ?, 'system', 'Host ended the watch party')");
        $stmt->execute([$partyId, $userId]);

        json_response(['success' => true, 'server_time' => floor(microtime(true) * 1000)]);
    }

    private static function updateState($userId, $code) {
        $pdo = self::getPdo();
        $party = self::getPartyId($code);
        $partyId = $party['id'];

        // If only host controls is enabled, enforce host check
        $onlyHost = isset($party['only_host_controls']) ? (bool)$party['only_host_controls'] : true;
        if ($onlyHost && (string)$party['host_user_id'] !== (string)$userId) {
            json_response(['error' => 'Only host can update playback state'], 403);
        }

        $data = get_json_body();
        $isPlaying = isset($data['is_playing']) ? ($data['is_playing'] ? 1 : 0) : $party['is_playing'];
        $pos = isset($data['position_seconds']) ? (float)$data['position_seconds'] : (float)$party['position_seconds'];
        $season = isset($data['season']) ? (int)$data['season'] : $party['season'];
        $episode = isset($data['episode']) ? (int)$data['episode'] : $party['episode'];
        $serverKey = $data['server_key'] ?? $party['server_key'] ?? null;
        $mediaId = $data['media_id'] ?? $party['media_id'];
        $mediaType = $data['media_type'] ?? $party['media_type'];
        $title = $data['title'] ?? $party['title'];

        $stmt = $pdo->prepare("UPDATE watch_parties SET is_playing = ?, position_seconds = ?, season = ?, episode = ?, server_key = ?, media_id = ?, media_type = ?, title = ?, state_updated_at = CURRENT_TIMESTAMP(3), version = version + 1 WHERE id = ?");
        $stmt->execute([$isPlaying, $pos, $season, $episode, $serverKey, $mediaId, $mediaType, $title, $partyId]);

        json_response(['success' => true, 'server_time' => floor(microtime(true) * 1000)]);
    }

    private static function updateSettings($userId, $code) {
        $pdo = self::getPdo();
        $party = self::getPartyId($code);
        $partyId = $party['id'];

        if ((string)$party['host_user_id'] !== (string)$userId) {
            json_response(['error' => 'Only host can update room settings'], 403);
        }

        $data = get_json_body();
        if (isset($data['only_host_controls'])) {
            $onlyHost = $data['only_host_controls'] ? 1 : 0;
            try {
                $stmt = $pdo->prepare("UPDATE watch_parties SET only_host_controls = ? WHERE id = ?");
                $stmt->execute([$onlyHost, $partyId]);
            } catch (Throwable $e) {}
        }

        json_response(['success' => true, 'server_time' => floor(microtime(true) * 1000)]);
    }

    private static function kickMember($userId, $code) {
        $pdo = self::getPdo();
        $party = self::getPartyId($code);
        $partyId = $party['id'];

        if ((string)$party['host_user_id'] !== (string)$userId) {
            json_response(['error' => 'Only host can kick members'], 403);
        }

        $data = get_json_body();
        $targetUserId = $data['target_user_id'] ?? null;
        if (!$targetUserId) {
            json_response(['error' => 'target_user_id is required'], 400);
        }

        $stmt = $pdo->prepare("UPDATE party_members SET left_at = CURRENT_TIMESTAMP WHERE party_id = ? AND user_id = ?");
        $stmt->execute([$partyId, $targetUserId]);

        json_response(['success' => true, 'server_time' => floor(microtime(true) * 1000)]);
    }

    private static function sync($userId, $code) {
        $pdo = self::getPdo();
        $party = self::getPartyId($code);
        $partyId = $party['id'];

        $sinceVersion = isset($_GET['since_version']) ? (int)$_GET['since_version'] : 0;
        $sinceMessageId = isset($_GET['since_message_id']) ? (int)$_GET['since_message_id'] : 0;

        // Update last seen
        $stmt = $pdo->prepare("UPDATE party_members SET last_seen_at = CURRENT_TIMESTAMP WHERE party_id = ? AND user_id = ?");
        $stmt->execute([$partyId, $userId]);

        // Fetch messages
        $stmt = $pdo->prepare("
            SELECT pm.id, pm.kind, pm.body, pm.created_at, pm.user_id, u.username as user_name
            FROM party_messages pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.party_id = ? AND pm.id > ?
            ORDER BY pm.id ASC
        ");
        $stmt->execute([$partyId, $sinceMessageId]);
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch members
        $stmt = $pdo->prepare("
            SELECT pm.user_id, u.username, pm.last_seen_at
            FROM party_members pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.party_id = ? AND pm.left_at IS NULL
        ");
        $stmt->execute([$partyId]);
        $membersData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $hasHost = false;
        $members = array_map(function($m) use ($party, $userId, &$hasHost) {
            $lastSeenTime = strtotime($m['last_seen_at'] ?? 'now');
            $isOnline = ($m['user_id'] == $userId) || ((time() - $lastSeenTime) <= 60);
            $isHostUser = ($m['user_id'] == $party['host_user_id']);
            if ($isHostUser) $hasHost = true;
            return [
                'id' => (string)$m['user_id'],
                'user_id' => $m['user_id'],
                'name' => $m['username'] ?: 'Viewer',
                'is_host' => $isHostUser,
                'online' => $isOnline
            ];
        }, $membersData);

        if (!$hasHost && !empty($party['host_user_id'])) {
            $stmtHost = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $stmtHost->execute([$party['host_user_id']]);
            $hostName = $stmtHost->fetchColumn() ?: 'Host';
            array_unshift($members, [
                'id' => (string)$party['host_user_id'],
                'user_id' => $party['host_user_id'],
                'name' => $hostName,
                'is_host' => true,
                'online' => true
            ]);
        }

        $serverTime = floor(microtime(true) * 1000);

        if ((int)$party['version'] == $sinceVersion && empty($messages)) {
            json_response([
                'unchanged' => true,
                'server_time' => $serverTime,
                'members' => $members
            ]);
        }

        json_response([
            'version' => (int)$party['version'],
            'state' => [
                'is_playing' => (bool)$party['is_playing'],
                'position_seconds' => (float)$party['position_seconds'],
                'state_updated_at' => $party['state_updated_at'],
                'season' => $party['season'] !== null ? (int)$party['season'] : null,
                'episode' => $party['episode'] !== null ? (int)$party['episode'] : null,
                'server_key' => $party['server_key'],
                'only_host_controls' => isset($party['only_host_controls']) ? (bool)$party['only_host_controls'] : true,
                'server_time' => $serverTime
            ],
            'members' => $members,
            'messages' => $messages,
            'server_time' => $serverTime
        ]);
    }

    private static function sendMessage($userId, $code, $kind) {
        $pdo = self::getPdo();
        $party = self::getPartyId($code);
        $partyId = $party['id'];
        
        $data = get_json_body();
        
        if ($kind === 'chat') {
            $body = trim($data['body'] ?? '');
            if (empty($body)) json_response(['error' => 'Message is required'], 400);
            if (mb_strlen($body) > 500) $body = mb_substr($body, 0, 500);
        } else if ($kind === 'reaction') {
            $emoji = $data['emoji'] ?? '';
            $whitelist = ['🍿','🔥','😂','😱','❤️','👏','🎉','🚀','😢'];
            if (!in_array($emoji, $whitelist)) {
                json_response(['error' => 'Invalid emoji'], 400);
            }
            $body = $emoji;
        }

        // Rate limiting (1 msg / sec)
        $stmt = $pdo->prepare("SELECT created_at FROM party_messages WHERE party_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$partyId, $userId]);
        $lastMsg = $stmt->fetchColumn();
        
        if ($lastMsg) {
            $lastTime = strtotime($lastMsg);
            if (time() - $lastTime < 1) {
                json_response(['error' => 'Rate limit exceeded. Please wait a moment.'], 429);
            }
        }

        $stmt = $pdo->prepare("INSERT INTO party_messages (party_id, user_id, kind, body) VALUES (?, ?, ?, ?)");
        $stmt->execute([$partyId, $userId, $kind, $body]);
        
        json_response(['success' => true, 'server_time' => floor(microtime(true) * 1000)]);
    }

    private static function getMyParties($userId) {
        $pdo = self::getPdo();
        $stmt = $pdo->prepare("
            SELECT wp.*
            FROM watch_parties wp
            JOIN party_members pm ON wp.id = pm.party_id
            WHERE pm.user_id = ? AND pm.left_at IS NULL AND wp.is_active = 1
            ORDER BY wp.created_at DESC
        ");
        $stmt->execute([$userId]);
        $parties = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        json_response(['parties' => $parties, 'server_time' => floor(microtime(true) * 1000)]);
    }
}
