<!DOCTYPE html>
<html>
<head><title>Choose Role — Speedly</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:linear-gradient(135deg,#fff5f0,#fff); min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
.card { background:#fff; border-radius:20px; box-shadow:0 8px 40px rgba(255,94,0,0.12); padding:40px 32px; max-width:420px; width:100%; text-align:center; }
h1 { font-size:20px; color:#1a1a1a; margin-bottom:8px; }
p { color:#888; font-size:13px; margin-bottom:32px; }
.roles { display:flex; gap:12px; margin-bottom:24px; }
.role-btn { flex:1; background:#fafafa; border:2px solid #eee; border-radius:14px; padding:20px 12px; cursor:pointer; transition:all 0.2s; text-align:center; }
.role-btn:hover { border-color:#ff5e00; background:#fff5f0; }
.role-btn.selected { border-color:#ff5e00; background:#fff3ed; }
.role-icon { font-size:28px; margin-bottom:8px; }
.role-label { font-size:13px; font-weight:700; color:#333; }
.role-desc { font-size:11px; color:#999; margin-top:4px; }
.submit { width:100%; padding:14px; background:linear-gradient(135deg,#ff5e00,#ff8c3a); color:#fff; border:none; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; opacity:0.5; pointer-events:none; transition:all 0.2s; }
.submit.active { opacity:1; pointer-events:auto; }
.submit.active:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(255,94,0,0.3); }
.skip { margin-top:16px; font-size:12px; color:#999; cursor:pointer; background:none; border:none; text-decoration:underline; }
</style>
</head>
<body>
<div class="card">
    <h1>Choose your role</h1>
    <p>You're signing up. Select how you'll use Speedly.</p>

    <div class="roles" id="roles">
        <div class="role-btn" data-role="client" onclick="select('client')">
            <div class="role-icon">🧑</div>
            <div class="role-label">Client</div>
            <div class="role-desc">Book rides & deliveries</div>
        </div>
        <div class="role-btn" data-role="driver" onclick="select('driver')">
            <div class="role-icon">🚗</div>
            <div class="role-label">Driver</div>
            <div class="role-desc">Earn by driving</div>
        </div>
    </div>

    <button class="submit" id="submitBtn" onclick="submit()">Continue</button>
    <button class="skip" onclick="submit('client')">Continue as Client</button>
</div>

<script>
var chosen = null;
var encodedData = new URL(window.location.href).searchParams.get('data');

function select(role) {
    chosen = role;
    document.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('selected'); });
    document.querySelector('[data-role="'+role+'"]').classList.add('selected');
    document.getElementById('submitBtn').classList.add('active');
}

function submit(role) {
    var r = role || chosen || 'client';
    document.querySelectorAll('.role-btn,.submit,.skip').forEach(function(el){ el.style.display = 'none'; });
    document.querySelector('.card').insertAdjacentHTML('beforeend', '<p style="margin-top:10px;color:#999;">Creating your account...</p>');

    fetch('/api/auth/google/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ role: r, data: encodedData || '' }),
    })
    .then(function(res){ return res.json(); })
    .then(function(json){
        if (json.success && json.token) {
            window.localStorage.setItem('auth_token', json.token);
            var target = (json.user.role === 'driver' || r === 'driver') ? '/driverdashboard' : '/clientdashboard';
            window.location.href = target;
        }
    });
}
</script>
</body>
</html>
