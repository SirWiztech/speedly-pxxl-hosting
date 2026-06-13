<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Reset your password | Speedly</title>
</head>
<body style="margin:0;padding:0;background-color:#ff4500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#ff4500 0%,#e63e00 50%,#cc3700 100%);padding:60px 16px;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 20px 60px rgba(204,55,0,0.4);">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#fff5f0 0%,#ffebe6 100%);padding:44px 40px 0;" align="center">
                            <img src="https://cdn-icons-png.flaticon.com/512/2038/2038684.png" alt="Speedly" width="56" height="56" style="margin-bottom:8px;">
                            <h1 style="margin:0;font-size:24px;font-weight:800;color:#ff4500;letter-spacing:-0.5px;">Speedly</h1>
                        </td>
                    </tr>

                    <!-- Accent Bar -->
                    <tr>
                        <td style="padding:0;">
                            <div style="height:4px;background:linear-gradient(90deg,#ff4500,#ff6a33,#ff4500);"></div>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:36px 40px 0;">
                            <p style="margin:0 0 6px;font-size:16px;color:#1a1a2e;font-weight:600;">Hi {{ $userName }},</p>
                            <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">We received a request to reset your <strong style="color:#ff4500;">Speedly</strong> account password. Click the button below to set a new password.</p>
                        </td>
                    </tr>

                    <!-- Reset Button -->
                    <tr>
                        <td align="center" style="padding:0 40px;">
                            <table cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="border-radius:14px;">
                                        <a href="{{ $resetUrl }}" target="_blank" style="display:inline-block;padding:18px 48px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;background:linear-gradient(135deg,#ff4500,#e63e00);border-radius:14px;box-shadow:0 6px 20px rgba(255,69,0,0.4);">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Fallback Link -->
                    <tr>
                        <td style="padding:20px 40px 0;">
                            <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.6;">
                                If the button doesn't work, copy and paste this link into your browser:
                            </p>
                            <p style="margin:8px 0 0;font-size:12px;color:#ff4500;text-align:center;word-break:break-all;">
                                <a href="{{ $resetUrl }}" style="color:#ff4500;">{{ $resetUrl }}</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Expiry -->
                    <tr>
                        <td style="padding:24px 40px 0;">
                            <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
                                <span style="display:inline-block;width:8px;height:8px;background:#ff4500;border-radius:50%;margin-right:6px;vertical-align:middle;animation:blink 1s infinite;"></span>
                                This link expires in <strong style="color:#ff4500;">1 hour</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                        <td style="padding:28px 40px 0;">
                            <div style="height:1px;background:linear-gradient(90deg,transparent,#ffd6cc,transparent);"></div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding:24px 40px 32px;">
                            <p style="margin:0 0 14px;font-size:13px;color:#94a3b8;line-height:1.6;text-align:center;">
                                If you didn't request a password reset, no action needed — you can safely ignore this email.
                            </p>
                            <p style="margin:0;font-size:13px;color:#ff4500;text-align:center;font-weight:600;">
                                &#9733; Speedly &mdash; Fast rides, trusted service &#9733;
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Powered by -->
                <p style="margin:28px 0 0;font-size:13px;color:#ffccb3;">Powered by <strong style="color:#ffffff;">Speedly</strong></p>
            </td>
        </tr>
    </table>
</body>
</html>
