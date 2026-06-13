<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ClientProfile;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class SocialiteController extends Controller
{
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function handleGoogleCallback()
    {
        try {
            $gUser = Socialite::driver('google')->stateless()->user();
        } catch (\Exception $e) {
            return redirect('/form?error=' . urlencode('Google sign-in failed. Please try again.'));
        }

        $user = User::where('google_id', $gUser->getId())->first()
            ?? User::where('email', $gUser->getEmail())->first();

        if (!$user) {
            $username = explode('@', $gUser->getEmail())[0];
            $username = preg_replace('/[^a-zA-Z0-9_]/', '', $username);
            if (User::where('username', $username)->exists()) {
                $username .= rand(100, 999);
            }

            $user = User::create([
                'username' => $username,
                'full_name' => $gUser->getName() ?: 'User',
                'email' => $gUser->getEmail(),
                'google_id' => $gUser->getId(),
                'phone_number' => '',
                'password' => bcrypt(Str::random(32)),
                'role' => 'client',
                'is_verified' => true,
                'is_active' => true,
                'profile_picture_url' => $gUser->getAvatar(),
                'avatar' => $gUser->getAvatar(),
            ]);
            ClientProfile::create(['user_id' => $user->id]);
        } else {
            $user->update([
                'google_id' => $user->google_id ?? $gUser->getId(),
                'profile_picture_url' => $user->profile_picture_url ?? $gUser->getAvatar(),
                'avatar' => $user->avatar ?? $gUser->getAvatar(),
                'is_verified' => true,
                'last_login' => now(),
            ]);
        }

        Auth::guard('web')->login($user);
        $user->createToken('auth_token');

        return redirect()->to($user->role === 'driver' ? '/driverdashboard' : '/clientdashboard');
    }
}
