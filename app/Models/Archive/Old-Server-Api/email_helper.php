<?php
// Email helper functions - include this in files that need to send emails

require __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/env_loader.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

function sendOTPEmail($to, $name, $otp) {
    $mail = new PHPMailer(true);
    
    try {
        // Server settings
        $mail->SMTPDebug = SMTP::DEBUG_OFF;
        $mail->isSMTP();
        $mail->Host       = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = getenv('SMTP_USERNAME');
        $mail->Password   = getenv('SMTP_PASSWORD');
        $mail->SMTPSecure = getenv('SMTP_ENCRYPTION') ?: 'smtps';
        $mail->Port       = getenv('SMTP_PORT') ?: 465;
        
        // Recipients
        $mail->setFrom(getenv('FROM_EMAIL') ?: 'noreply@speedly.com', getenv('FROM_NAME') ?: 'Speedly');
        $mail->addAddress($to, $name);
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = 'Your Speedly Verification Code';
        $mail->Body    = "<h1>Your OTP is: $otp</h1><p>This code expires in 10 minutes.</p>";
        $mail->AltBody = "Your OTP is: $otp. Expires in 10 minutes.";
        
        $mail->send();
        return ['success' => true, 'message' => 'Email sent'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => $mail->ErrorInfo];
    }
}
?>  