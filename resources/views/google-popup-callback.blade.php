<!DOCTYPE html>
<html>
<head><title>Speedly Sign In</title></head>
<body style="background:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0">
<div style="text-align:center">
    <div style="font-size:20px;margin-bottom:12px">Signing you in...</div>
    <p style="color:#666;font-size:13px">Please wait</p>
</div>
<script>
(function() {
    var url = new URL(window.location.href);
    var token = url.searchParams.get('token');
    var userRaw = url.searchParams.get('user');
    if (!token || !userRaw) return;

    var user = JSON.parse(atob(userRaw));
    var role = user.role || 'client';
    var target = role === 'driver' ? '/driverdashboard' : role === 'admin' ? '/admindashboard' : '/clientdashboard';

    if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'GOOGLE_AUTH', token: token, user: user }, '*');
        window.close();
    } else {
        window.localStorage.setItem('auth_token', token);
        window.location.href = target;
    }
})();
</script>
</body>
</html>
