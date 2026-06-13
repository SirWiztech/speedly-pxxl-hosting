<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\DriverProfile;
use App\Models\Ride;
use App\Models\ClientProfile;
use App\Models\Place;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class LocationController extends Controller
{
    public function getClientLocations(Request $request)
    {
        $user = $request->user();
        $clientProfile = ClientProfile::where('user_id', $user->id)->first();

        if (!$clientProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Client profile not found',
                'data' => null
            ]);
        }

        $rides = Ride::where('client_id', $clientProfile->id)
            ->orderBy('created_at', 'DESC')
            ->get(['pickup_address', 'pickup_latitude', 'pickup_longitude', 'destination_address', 'destination_latitude', 'destination_longitude', 'created_at']);

        $locations = [];
        $seen = [];

        foreach ($rides as $ride) {
            if (!in_array($ride->pickup_address, $seen)) {
                $locations[] = [
                    'address' => $ride->pickup_address,
                    'lat' => $ride->pickup_latitude,
                    'lng' => $ride->pickup_longitude,
                    'type' => 'pickup',
                    'last_used' => $ride->created_at
                ];
                $seen[] = $ride->pickup_address;
            }

            if (!in_array($ride->destination_address, $seen)) {
                $locations[] = [
                    'address' => $ride->destination_address,
                    'lat' => $ride->destination_latitude,
                    'lng' => $ride->destination_longitude,
                    'type' => 'dropoff',
                    'last_used' => $ride->created_at
                ];
                $seen[] = $ride->destination_address;
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Saved locations retrieved successfully',
            'data' => ['saved_locations' => $locations]
        ]);
    }

    public function getDriverLocations(Request $request)
    {
        $driverProfile = DriverProfile::where('user_id', $request->user()->id)->first();

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found',
                'data' => null
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Driver location retrieved successfully',
            'data' => [
                'latitude' => $driverProfile->current_latitude,
                'longitude' => $driverProfile->current_longitude,
                'last_location_update' => $driverProfile->last_location_update,
                'status' => $driverProfile->driver_status
            ]
        ]);
    }

    public function getSuggestions(Request $request)
    {
        $request->validate(['query' => 'required|string|min:2']);

        $query = $request->input('query');
        $state = $request->input('state');
        $limit = min((int) ($request->input('limit', 8)), 20);

        $likeTerm = $query . '%';
        $ftTerm = '+' . preg_replace('/\s+/', '* +', trim($query)) . '*';

        $q1 = Place::where('name', 'LIKE', $likeTerm)
            ->selectRaw("id, name, state, lat, lng, full_address, feature_code, population, 1 AS priority");
        $q2 = Place::whereRaw("MATCH(name, ascii_name, alternate_names, full_address) AGAINST (? IN BOOLEAN MODE)", [$ftTerm])
            ->where('name', 'NOT LIKE', $likeTerm)
            ->selectRaw("id, name, state, lat, lng, full_address, feature_code, population, 2 AS priority");

        if ($state) {
            $q1->where('state', $state);
            $q2->where('state', $state);
        }

        $results = $q1->union($q2)
            ->orderBy('priority')
            ->orderBy('population', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($p) {
                return [
                    'id'           => (int) $p->id,
                    'name'         => $p->name,
                    'label'        => $p->name . ($p->state ? ', ' . $p->state : '') . ', Nigeria',
                    'state'        => $p->state,
                    'lat'          => $p->lat ? (float) $p->lat : null,
                    'lng'          => $p->lng ? (float) $p->lng : null,
                    'full_address' => $p->full_address,
                    'feature_code' => $p->feature_code,
                    'population'   => (int) $p->population,
                ];
            });

        if ($results->isNotEmpty()) {
            return response()->json([
                'success' => true,
                'message' => 'Suggestions retrieved successfully',
                'data' => ['suggestions' => $results->toArray()],
            ]);
        }

        $response = Http::get('https://nominatim.openstreetmap.org/search', [
            'q' => $query,
            'format' => 'json',
            'limit' => $limit,
            'countrycodes' => 'ng',
        ]);

        $suggestions = collect($response->json())->map(function ($place) {
            return [
                'id'           => null,
                'name'         => $place['name'] ?? $place['display_name'],
                'label'        => $place['display_name'],
                'state'        => null,
                'lat'          => $place['lat'] ? (float) $place['lat'] : null,
                'lng'          => $place['lon'] ? (float) $place['lon'] : null,
                'full_address' => $place['display_name'],
                'feature_code' => 'OSM',
                'population'   => 0,
            ];
        })->toArray();

        return response()->json([
            'success' => true,
            'message' => 'Suggestions retrieved from OSM',
            'data' => ['suggestions' => $suggestions],
        ]);
    }

    public function getPlaceDetails(Request $request)
    {
        // Local DB lookup by ID
        if ($request->has('id')) {
            $place = Place::find($request->input('id'));

            if ($place && $place->lat && $place->lng) {
                return response()->json([
                    'success' => true,
                    'message' => 'Place details retrieved successfully',
                    'data' => [
                        'name'    => $place->name,
                        'address' => $place->full_address,
                        'lat'     => (float) $place->lat,
                        'lng'     => (float) $place->lng,
                    ],
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Place not found in local database',
                'data' => null,
            ]);
        }

        // Fallback: search by query via Nominatim
        if ($request->has('query')) {
            $response = Http::get('https://nominatim.openstreetmap.org/search', [
                'q'     => $request->input('query'),
                'format' => 'json',
                'limit'  => 1,
                'countrycodes' => 'ng',
            ]);

            $places = $response->json();
            if (!empty($places)) {
                return response()->json([
                    'success' => true,
                    'message' => 'Place details retrieved from OSM',
                    'data' => [
                        'name'    => $places[0]['name'] ?? $places[0]['display_name'],
                        'address' => $places[0]['display_name'],
                        'lat'     => (float) $places[0]['lat'],
                        'lng'     => (float) $places[0]['lon'],
                    ],
                ]);
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Place not found',
            'data' => null,
        ]);
    }
}
