<?php
define('APP_ENV', 'development'); // set to 'production' on InfinityFree

define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'mondoflix');
define('DB_USER', 'root');
define('DB_PASS', '');

define('JWT_SECRET', 'mondoflix_super_secret_key_12345');
define('TMDB_API_KEY', 'b2c58971f114e9f731cfa068e4c7d0cc');

define('ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://mondoflix.bond',
    'https://www.mondoflix.bond'
]);
