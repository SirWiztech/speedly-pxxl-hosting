<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CacheControl
{
    /**
     * Apply aggressive caching when the performance consent cookie is present.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $hasConsent = $request->cookie('speedly_perf_consent') === '1';

        if ($hasConsent) {
            // Cache static assets aggressively
            if ($this->isStaticAsset($request)) {
                $response->setCache([
                    'max_age'       => 31536000,  // 1 year
                    's_maxage'      => 2592000,   // 30 days for CDN
                    'public'        => true,
                    'must_revalidate' => false,
                ]);

                $response->headers->set('X-Speedly-Cache', 'on');
            }

            // Add a hit header so the frontend knows caching is active
            $response->headers->set('X-Speedly-Perf', 'on');
        }

        return $response;
    }

    private function isStaticAsset(Request $request): bool
    {
        $path = $request->path();

        $assetExtensions = [
            '.css', '.js', '.woff2', '.woff', '.ttf',
            '.png', '.jpg', '.jpeg', '.svg', '.ico',
            '.webp', '.avif', '.mp4', '.webm',
        ];

        foreach ($assetExtensions as $ext) {
            if (str_ends_with($path, $ext)) {
                return true;
            }
        }

        return false;
    }
}
