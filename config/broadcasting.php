<?php

return [
    'default' => env('BROADCAST_DRIVER', 'reverb'),
    'connections' => [
        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY', 'speedlykey'),
            'secret' => env('REVERB_APP_SECRET', 'speedlysecret'),
            'app_id' => env('REVERB_APP_ID', 'speedly'),
            'options' => [
                'host' => env('REVERB_HOST', '127.0.0.1'),
                'port' => env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'http'),
            ],
        ],
        'log' => [
            'driver' => 'log',
        ],
        'null' => [
            'driver' => 'null',
        ],
    ],
];
